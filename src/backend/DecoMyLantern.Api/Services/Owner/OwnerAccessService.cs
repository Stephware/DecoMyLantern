using DecoMyLantern.Api.Models.Database;
using DecoMyLantern.Api.Services.Lanterns;
using DecoMyLantern.Api.Services.Invitations;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace DecoMyLantern.Api.Services.Owner;

public sealed record IssuedOwnerAccess(Guid OwnerId, string Token, string RecoveryCode, DateTime ExpiresAtUtc);
public sealed record OwnerRecoveryKeyView(bool Available, string? RecoveryCode, DateTime ExpiresAtUtc);
public sealed class OwnerAccessException(int statusCode, string message) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
}

public interface IOwnerAccessService
{
    Task<IssuedOwnerAccess> CreateAsync(CancellationToken cancellationToken);
    Task<IssuedOwnerAccess> UpgradeLegacyAsync(Guid ownerId, CancellationToken cancellationToken);
    Task<IssuedOwnerAccess> RecoverAsync(string recoveryCode, CancellationToken cancellationToken);
    Task<OwnerRecoveryKeyView> GetRecoveryKeyAsync(Guid ownerId, CancellationToken cancellationToken);
    Task<OwnerRecoveryKeyView> ReplaceRecoveryKeyAsync(Guid ownerId, CancellationToken cancellationToken);
    Task SignOutAsync(Guid ownerId, CancellationToken cancellationToken);
    Task FinishSetupAsync(Guid ownerId, CancellationToken cancellationToken);
    Task CancelCreationAsync(Guid ownerId, CancellationToken cancellationToken);
}

public sealed class OwnerAccessService(
    ApplicationDbContext database,
    UserManager<ApplicationUser> userManager,
    ILanternService lanternService,
    IInvitationService invitationService,
    OwnerRecoveryCipher recoveryCipher,
    TimeProvider clock) : IOwnerAccessService
{
    public async Task<IssuedOwnerAccess> CreateAsync(CancellationToken cancellationToken)
    {
        await using var transaction = await database.Database.BeginTransactionAsync(cancellationToken);
        var username = "parol-" + Guid.NewGuid().ToString("N");
        var user = new ApplicationUser { Id = Guid.NewGuid(), UserName = username, Email = null };
        var result = await userManager.CreateAsync(user);
        if (!result.Succeeded)
            throw new OwnerAccessException(500, "Unable to create your parol. Please try again.");

        await lanternService.CreateAsync(user.Id, cancellationToken);
        await invitationService.GetOrCreateLinkAsync(user.Id, cancellationToken);
        var issued = await IssueForOwnerAsync(user.Id, cancellationToken, setupPending: true);
        await transaction.CommitAsync(cancellationToken);
        return issued;
    }

    public async Task<IssuedOwnerAccess> UpgradeLegacyAsync(Guid ownerId, CancellationToken cancellationToken)
    {
        if (!await database.Lanterns.AsNoTracking().AnyAsync(x => x.OwnerUserId == ownerId, cancellationToken))
            throw new OwnerAccessException(404, "No existing parol was found for this session.");
        if (await database.OwnerCredentials.AsNoTracking().AnyAsync(x => x.OwnerUserId == ownerId, cancellationToken))
            throw new OwnerAccessException(409, "This parol already uses secure owner access.");

        // Existing Identity users and lantern IDs stay intact.
        return await IssueForOwnerAsync(ownerId, cancellationToken);
    }

    public async Task<IssuedOwnerAccess> RecoverAsync(string recoveryCode, CancellationToken cancellationToken)
    {
        if (!OwnerSecrets.TryHashRecovery(recoveryCode, out var hash))
            throw new OwnerAccessException(401, "Invalid or expired recovery key.");

        var credential = await database.OwnerCredentials
            .SingleOrDefaultAsync(x => x.RecoveryHash == hash, cancellationToken);
        var now = clock.GetUtcNow().UtcDateTime;
        if (credential is null || !OwnerRecoveryPolicy.CanRecover(credential, now))
            throw new OwnerAccessException(401, "Invalid or expired recovery key.");

        // Each recovery issues a new owner session but keeps the same recovery
        // hash and the original one-year deadline. Repeated use never rotates it.
        var newToken = OwnerSecrets.Generate();
        OwnerRecoveryPolicy.RefreshSession(credential, Hash(newToken), now);
        credential.SetupPending = false;
        try { await database.SaveChangesAsync(cancellationToken); }
        catch (DbUpdateConcurrencyException)
        { throw new OwnerAccessException(409, "Your session changed during recovery. Retry with the same recovery key."); }
        return new IssuedOwnerAccess(credential.OwnerUserId, newToken, recoveryCode, credential.SessionExpiresAtUtc);
    }

    /// <summary>
    /// Reveal only an authenticated owner's current, unexpired recovery key.
    /// Legacy rows contain only a one-way hash and must not be silently rotated.
    /// </summary>
    public async Task<OwnerRecoveryKeyView> GetRecoveryKeyAsync(Guid ownerId, CancellationToken cancellationToken)
    {
        var credential = await GetCredentialAsync(ownerId, cancellationToken);
        var now = clock.GetUtcNow().UtcDateTime;
        if (!OwnerRecoveryPolicy.CanRecover(credential, now) ||
            string.IsNullOrEmpty(credential.EncryptedRecoveryCode))
            return new OwnerRecoveryKeyView(false, null, credential.RecoveryExpiresAtUtc);

        var code = recoveryCipher.Unprotect(credential.EncryptedRecoveryCode, ownerId);
        if (!OwnerSecrets.TryHashRecovery(code, out var hash) ||
            !string.Equals(hash, credential.RecoveryHash, StringComparison.Ordinal))
            throw new InvalidOperationException("The stored recovery key could not be verified.");

        return new OwnerRecoveryKeyView(true, code, credential.RecoveryExpiresAtUtc);
    }

    /// <summary>
    /// Explicit owner-initiated replacement only. Previous saved recovery keys
    /// become invalid; owner session, parol, invitations and lights are untouched.
    /// </summary>
    public async Task<OwnerRecoveryKeyView> ReplaceRecoveryKeyAsync(Guid ownerId, CancellationToken cancellationToken)
    {
        var credential = await GetCredentialAsync(ownerId, cancellationToken);
        var now = clock.GetUtcNow().UtcDateTime;
        var code = OwnerSecrets.GenerateRecoveryKey();
        var encrypted = recoveryCipher.Protect(code, ownerId);
        credential.RecoveryHash = Hash(code);
        credential.EncryptedRecoveryCode = encrypted;
        credential.RecoveryIssuedAtUtc = now;
        credential.RecoveryExpiresAtUtc = now.Add(OwnerSession.RecoveryLifetime);
        try { await database.SaveChangesAsync(cancellationToken); }
        catch (DbUpdateConcurrencyException)
        { throw new OwnerAccessException(409, "Recovery key changed in another session. Refresh and try again."); }

        return new OwnerRecoveryKeyView(true, code, credential.RecoveryExpiresAtUtc);
    }

    public async Task SignOutAsync(Guid ownerId, CancellationToken cancellationToken)
    {
        var credential = await GetCredentialAsync(ownerId, cancellationToken);
        // A new unknown hash revokes the old bearer token without destroying recovery.
        credential.TokenHash = Hash(OwnerSecrets.Generate());
        credential.SessionExpiresAtUtc = clock.GetUtcNow().UtcDateTime;
        try { await database.SaveChangesAsync(cancellationToken); }
        catch (DbUpdateConcurrencyException)
        { throw new OwnerAccessException(409, "Your session changed. Please refresh."); }
    }

    public async Task FinishSetupAsync(Guid ownerId, CancellationToken cancellationToken)
    {
        var credential = await GetCredentialAsync(ownerId, cancellationToken);
        if (!credential.SetupPending) return;
        credential.SetupPending = false;
        await database.SaveChangesAsync(cancellationToken);
    }

    public async Task CancelCreationAsync(Guid ownerId, CancellationToken cancellationToken)
    {
        await using var transaction = await database.Database.BeginTransactionAsync(
            System.Data.IsolationLevel.Serializable, cancellationToken);
        var credential = await GetCredentialAsync(ownerId, cancellationToken);
        if (!credential.SetupPending)
            throw new OwnerAccessException(409, "Only a newly created parol can be cancelled.");

        var lanterns = await database.Lanterns.Where(x => x.OwnerUserId == ownerId)
            .ToListAsync(cancellationToken);
        if (lanterns.Count != 1 ||
            await database.Contributions.AnyAsync(x => x.Lantern.OwnerUserId == ownerId, cancellationToken) ||
            await database.MessageReports.AnyAsync(x => x.ReporterUserId == ownerId, cancellationToken))
            throw new OwnerAccessException(409, "This parol has already been used and cannot be cancelled.");

        // A new parol has one official link already. Remove it before the
        // lantern because ShareLinks has a restrictive foreign key.
        var shareLinks = await database.ShareLinks.Where(x => x.LanternId == lanterns[0].Id)
            .ToListAsync(cancellationToken);
        database.ShareLinks.RemoveRange(shareLinks);
        var user = await database.Users.SingleAsync(x => x.Id == ownerId, cancellationToken);
        database.OwnerCredentials.Remove(credential);
        database.Lanterns.Remove(lanterns[0]);
        database.Users.Remove(user);
        await database.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }

    private async Task<IssuedOwnerAccess> IssueForOwnerAsync(Guid ownerId, CancellationToken cancellationToken, bool setupPending = false)
    {
        var now = clock.GetUtcNow().UtcDateTime;
        var token = OwnerSecrets.Generate();
        var recoveryCode = OwnerSecrets.GenerateRecoveryKey();
        var credential = new OwnerCredential
        {
            OwnerUserId = ownerId,
            TokenHash = Hash(token),
            RecoveryHash = Hash(recoveryCode),
            EncryptedRecoveryCode = recoveryCipher.Protect(recoveryCode, ownerId),
            RecoveryIssuedAtUtc = now,
            CreatedAtUtc = now,
            SessionExpiresAtUtc = now.Add(OwnerSession.Lifetime),
            RecoveryExpiresAtUtc = now.Add(OwnerSession.RecoveryLifetime),
            SetupPending = setupPending
        };
        database.OwnerCredentials.Add(credential);
        try { await database.SaveChangesAsync(cancellationToken); }
        catch (DbUpdateException exception) when (exception.InnerException is SqlException sql &&
            (sql.Number == 2601 || sql.Number == 2627))
        { throw new OwnerAccessException(409, "Owner access has already been issued. Please refresh."); }
        return new IssuedOwnerAccess(ownerId, token, recoveryCode, credential.SessionExpiresAtUtc);
    }

    private async Task<OwnerCredential> GetCredentialAsync(Guid ownerId, CancellationToken cancellationToken) =>
        await database.OwnerCredentials.SingleOrDefaultAsync(x => x.OwnerUserId == ownerId, cancellationToken)
            ?? throw new OwnerAccessException(404, "Owner access was not found.");

    private static string Hash(string secret) =>
        OwnerSecrets.TryHashRecovery(secret, out var hash) ? hash :
        throw new InvalidOperationException("Unable to hash a generated owner secret.");
}
