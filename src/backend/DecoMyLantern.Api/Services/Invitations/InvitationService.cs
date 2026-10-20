using System.Data;
using DecoMyLantern.Api.Models.Database;
using DecoMyLantern.Api.Models.DTOs;
using DecoMyLantern.Api.Services.Lanterns;
using DecoMyLantern.Api.Services.Owner;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace DecoMyLantern.Api.Services.Invitations;

public sealed class InvitationException(int statusCode, string message) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
}

public static class InvitationPolicy
{
    public static bool IsValidName(string? name) =>
        !string.IsNullOrWhiteSpace(name) && name.Trim().Length <= 80;

    public static bool IsValidMessage(string? message) =>
        message is null || message.Trim().Length <= 500;

    // Invitations remain useful throughout Christmas and expire at the end of
    // the calendar year in Philippine time (UTC+08:00).
    public static DateTime EndOfSeasonUtc(int seasonYear) =>
        new(seasonYear, 12, 31, 15, 59, 59, DateTimeKind.Utc);

    public static string Hash(string secret) =>
        OwnerSecrets.TryHash(secret, out var hash) ? hash :
        throw new ArgumentException("Malformed invitation or visitor token.", nameof(secret));
}

public interface IInvitationService
{
    Task<CreatedInvitationDto> CreateLinkAsync(Guid ownerId, CancellationToken cancellationToken);
    Task<IReadOnlyList<InvitationInfoDto>> GetLinksAsync(Guid ownerId, CancellationToken cancellationToken);
    Task RevokeLinkAsync(Guid ownerId, Guid linkId, CancellationToken cancellationToken);
    Task<InvitationPreviewDto> PreviewAsync(string inviteToken, string? guestToken, CancellationToken cancellationToken);
    Task<GuestContributionResultDto> ContributeAsync(
        GuestContributionRequest request, string guestToken, Guid? authenticatedOwnerId, CancellationToken cancellationToken);
}

public sealed class InvitationService(
    ApplicationDbContext database,
    TimeProvider clock) : IInvitationService
{
    public async Task<CreatedInvitationDto> CreateLinkAsync(Guid ownerId, CancellationToken cancellationToken)
    {
        var season = LanternPolicy.SeasonFor(clock.GetUtcNow().UtcDateTime);
        var lantern = await database.Lanterns.AsNoTracking()
            .FirstOrDefaultAsync(x => x.OwnerUserId == ownerId && x.SeasonYear == season, cancellationToken)
            ?? throw new InvitationException(404, "Create your parol before inviting friends.");

        var expiresAt = InvitationPolicy.EndOfSeasonUtc(lantern.SeasonYear);
        if (clock.GetUtcNow().UtcDateTime >= expiresAt)
            throw new InvitationException(409, "This Christmas season is closed.");

        var token = OwnerSecrets.Generate();
        var link = new ShareLink
        {
            LanternId = lantern.Id,
            TokenHash = InvitationPolicy.Hash(token),
            ExpiresAtUtc = expiresAt
        };
        database.ShareLinks.Add(link);
        await database.SaveChangesAsync(cancellationToken);
        return new CreatedInvitationDto(link.Id, token, expiresAt);
    }

    public async Task<IReadOnlyList<InvitationInfoDto>> GetLinksAsync(
        Guid ownerId, CancellationToken cancellationToken)
    {
        var season = LanternPolicy.SeasonFor(clock.GetUtcNow().UtcDateTime);
        return await database.ShareLinks.AsNoTracking()
            .Where(x => x.Lantern.OwnerUserId == ownerId && x.Lantern.SeasonYear == season)
            .OrderByDescending(x => x.ExpiresAtUtc)
            .Select(x => new InvitationInfoDto(x.Id, x.ExpiresAtUtc, x.RevokedAtUtc))
            .ToListAsync(cancellationToken);
    }

    public async Task RevokeLinkAsync(Guid ownerId, Guid linkId, CancellationToken cancellationToken)
    {
        var link = await database.ShareLinks
            .FirstOrDefaultAsync(x => x.Id == linkId && x.Lantern.OwnerUserId == ownerId, cancellationToken)
            ?? throw new InvitationException(404, "Invitation not found.");
        if (link.RevokedAtUtc is null)
        {
            link.RevokedAtUtc = clock.GetUtcNow().UtcDateTime;
            await database.SaveChangesAsync(cancellationToken);
        }
    }

    public async Task<InvitationPreviewDto> PreviewAsync(
        string inviteToken, string? guestToken, CancellationToken cancellationToken)
    {
        var link = await FindActiveLinkAsync(inviteToken, cancellationToken);
        return await PublicPreviewAsync(link, guestToken, cancellationToken);
    }

    public async Task<GuestContributionResultDto> ContributeAsync(
        GuestContributionRequest request, string guestToken, Guid? authenticatedOwnerId, CancellationToken cancellationToken)
    {
        if (!InvitationPolicy.IsValidName(request.DisplayName))
            throw new InvitationException(400, "Enter a name with 1 to 80 characters.");
        if (!InvitationPolicy.IsValidMessage(request.Message))
            throw new InvitationException(400, "Your Christmas message must be 500 characters or fewer.");
        if (!OwnerSecrets.TryHash(guestToken, out var visitorHash))
            throw new InvitationException(400, "Refresh the invitation page and try again.");
        if (!OwnerSecrets.TryHash(request.Token, out var inviteHash))
            throw new InvitationException(404, "This invitation is invalid.");

        // An exclusive lock on this single lantern's row serializes NextSlotIndex
        // allocation across all processes/instances, including simultaneous
        // submissions. Both unique DB indexes remain the final safeguards.
        await using var transaction = await database.Database
            .BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);

        try
        {
            var now = clock.GetUtcNow().UtcDateTime;
            var link = await database.ShareLinks.AsNoTracking()
                .SingleOrDefaultAsync(x => x.TokenHash == inviteHash &&
                    x.RevokedAtUtc == null &&
                    (x.ExpiresAtUtc == null || x.ExpiresAtUtc > now), cancellationToken)
                ?? throw new InvitationException(404, "This invitation has expired or was revoked.");

            var lantern = await database.Lanterns
                .FromSqlInterpolated($"SELECT * FROM [Lanterns] WITH (UPDLOCK, HOLDLOCK) WHERE [Id] = {link.LanternId}")
                .SingleOrDefaultAsync(cancellationToken)
                ?? throw new InvitationException(404, "This parol no longer exists.");

            // An owner may illuminate someone else's parol, but not their own.
            if (authenticatedOwnerId.HasValue && authenticatedOwnerId.Value == lantern.OwnerUserId)
                throw new InvitationException(409, "You cannot add a guest light to your own parol.");

            var visitor = await database.GuestVisitors
                .SingleOrDefaultAsync(x => x.TokenHash == visitorHash, cancellationToken);
            if (visitor is null)
            {
                visitor = new GuestVisitor { TokenHash = visitorHash, CreatedAtUtc = now };
                database.GuestVisitors.Add(visitor);
            }
            else if (await database.Contributions.AnyAsync(x =>
                x.LanternId == lantern.Id && x.GuestVisitorId == visitor.Id, cancellationToken))
            {
                throw new InvitationException(409, "You've already added your light to this parol.");
            }

            if (lantern.NextSlotIndex == int.MaxValue)
                throw new InvitationException(409, "This parol has no more available light slots.");

            var slot = lantern.NextSlotIndex++;
            var contribution = new Contribution
            {
                LanternId = lantern.Id,
                GuestVisitorId = visitor.Id,
                ShareLinkId = link.Id,
                DisplayName = request.DisplayName.Trim(),
                SlotIndex = slot,
                AcceptedAtUtc = now
            };
            database.Contributions.Add(contribution);
            var body = request.Message?.Trim();
            if (!string.IsNullOrEmpty(body))
            {
                database.Messages.Add(new Message
                {
                    ContributionId = contribution.Id,
                    Body = body,
                    CreatedAtUtc = now
                });
            }

            await database.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            // Re-read public data after commit, using the link validated inside
            // the transaction. If the owner revokes the link immediately after
            // acceptance, the guest still receives success for their saved light.
            // This response never contains private message text.
            var preview = await PublicPreviewAsync(link, guestToken, cancellationToken);
            return new GuestContributionResultDto(contribution.Id, slot,
                !string.IsNullOrEmpty(body), preview);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new InvitationException(409, "Another light was just added. Please try again.");
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException sql &&
            (sql.Number == 2601 || sql.Number == 2627 || sql.Number == 1205))
        {
            throw new InvitationException(409, "Your contribution may already exist or another light was added. Refresh and try again.");
        }
        catch (SqlException ex) when (ex.Number == 1205)
        {
            throw new InvitationException(409, "Several friends are contributing right now. Please retry.");
        }
    }

    private async Task<ShareLink> FindActiveLinkAsync(
        string inviteToken, CancellationToken cancellationToken)
    {
        if (!OwnerSecrets.TryHash(inviteToken, out var hash))
            throw new InvitationException(404, "This invitation is invalid.");

        var now = clock.GetUtcNow().UtcDateTime;
        return await database.ShareLinks.AsNoTracking()
            .SingleOrDefaultAsync(x => x.TokenHash == hash &&
                x.RevokedAtUtc == null &&
                (x.ExpiresAtUtc == null || x.ExpiresAtUtc > now),
                cancellationToken)
            ?? throw new InvitationException(404, "This invitation has expired or was revoked.");
    }

    private async Task<InvitationPreviewDto> PublicPreviewAsync(
        ShareLink link, string? guestToken, CancellationToken cancellationToken)
    {
        var lantern = await database.Lanterns.AsNoTracking()
            .Include(x => x.SelectedDesign)
            .SingleOrDefaultAsync(x => x.Id == link.LanternId, cancellationToken)
            ?? throw new InvitationException(404, "This parol no longer exists.");

        var lights = await database.Contributions.AsNoTracking()
            .Where(x => x.LanternId == lantern.Id && x.RemovedAtUtc == null)
            .OrderBy(x => x.SlotIndex)
            .Select(x => new PublicLightDto(x.Id, x.SlotIndex))
            .ToListAsync(cancellationToken);

        var alreadyContributed = false;
        if (OwnerSecrets.TryHash(guestToken, out var guestHash))
        {
            alreadyContributed = await database.Contributions.AsNoTracking()
                .AnyAsync(x => x.LanternId == lantern.Id &&
                    x.GuestVisitor.TokenHash == guestHash, cancellationToken);
        }

        return new InvitationPreviewDto(
            lantern.SelectedDesign.DesignKey,
            lantern.PatternKey,
            lights.Count,
            GrowthPolicy.GrowthFor(lights.Count),
            GrowthPolicy.StageFor(lights.Count),
            alreadyContributed,
            lights);
    }
}
