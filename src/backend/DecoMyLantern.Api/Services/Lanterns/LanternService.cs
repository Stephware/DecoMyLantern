using DecoMyLantern.Api.Models.Database;
using DecoMyLantern.Api.Models.DTOs;
using DecoMyLantern.Api.Repository.Lanterns;
using DecoMyLantern.Api.Services.Messages;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace DecoMyLantern.Api.Services.Lanterns;

public sealed class LanternOperationException(int statusCode, string message) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
}

public interface ILanternService
{
    Task<LanternDto?> GetCurrentAsync(Guid ownerId, CancellationToken cancellationToken);
    Task<LanternDto> CreateAsync(Guid ownerId, CancellationToken cancellationToken);
    Task<LanternDto> UpdateAsync(Guid ownerId, UpdateLanternRequest request, CancellationToken cancellationToken);
}

public sealed class LanternService(ILanternRepository repository, TimeProvider timeProvider) : ILanternService
{
    public async Task<LanternDto?> GetCurrentAsync(Guid ownerId, CancellationToken cancellationToken)
    {
        var seasonYear = LanternPolicy.SeasonFor(timeProvider.GetUtcNow().UtcDateTime);
        var lantern = await repository.FindByOwnerAndSeasonAsync(ownerId, seasonYear, cancellationToken);
        return lantern is null ? null : await ToDtoAsync(lantern, cancellationToken);
    }

    public async Task<LanternDto> CreateAsync(Guid ownerId, CancellationToken cancellationToken)
    {
        var seasonYear = LanternPolicy.SeasonFor(timeProvider.GetUtcNow().UtcDateTime);
        if (await repository.FindByOwnerAndSeasonAsync(ownerId, seasonYear, cancellationToken) is not null)
            throw new LanternOperationException(409, "You already have a lantern for this Christmas season.");

        var design = await repository.FindEnabledDesignAsync("classic", cancellationToken)
            ?? throw new InvalidOperationException("The default parol design is not configured.");

        var lantern = new Lantern
        {
            OwnerUserId = ownerId,
            SeasonYear = seasonYear,
            SelectedDesignId = design.Id,
            SelectedDesign = design,
            PaletteKey = design.DesignKey,
            PatternKey = "default",
            UnlockAtUtc = ChristmasUnlockPolicy.UnlockUtcForSeason(seasonYear),
            CreatedAtUtc = timeProvider.GetUtcNow().UtcDateTime
        };

        repository.Add(lantern);
        try
        {
            await repository.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (exception.InnerException is SqlException sql &&
            (sql.Number == 2601 || sql.Number == 2627))
        {
            throw new LanternOperationException(409, "You already have a lantern for this Christmas season.");
        }

        return await ToDtoAsync(lantern, cancellationToken);
    }

    public async Task<LanternDto> UpdateAsync(Guid ownerId, UpdateLanternRequest request, CancellationToken cancellationToken)
    {
        var seasonYear = LanternPolicy.SeasonFor(timeProvider.GetUtcNow().UtcDateTime);
        var lantern = await repository.FindByOwnerAndSeasonAsync(ownerId, seasonYear, cancellationToken)
            ?? throw new LanternOperationException(404, "Create a lantern before customizing it.");

        var designKey = request.DesignKey.Trim().ToLowerInvariant();
        var patternKey = request.PatternKey.Trim().ToLowerInvariant();
        if (!LanternPolicy.IsAllowedPattern(patternKey))
            throw new LanternOperationException(400, "Invalid parol pattern.");

        var design = await repository.FindEnabledDesignAsync(designKey, cancellationToken)
            ?? throw new LanternOperationException(400, "Invalid or unavailable parol design.");

        var lights = await repository.GetAcceptedLightsAsync(lantern.Id, cancellationToken);
        // All six enabled visual designs are selectable from the beginning.
        // Friend-count milestones still drive growth, not design access.

        lantern.SelectedDesignId = design.Id;
        lantern.SelectedDesign = design;
        lantern.PaletteKey = design.DesignKey;
        lantern.PatternKey = patternKey;

        try
        {
            await repository.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new LanternOperationException(409, "Your lantern changed while saving. Refresh and try again.");
        }

        return ToDto(lantern, lights);
    }

    private async Task<LanternDto> ToDtoAsync(Lantern lantern, CancellationToken cancellationToken)
    {
        var lights = await repository.GetAcceptedLightsAsync(lantern.Id, cancellationToken);
        return ToDto(lantern, lights);
    }

    private static LanternDto ToDto(Lantern lantern, IReadOnlyList<ContributionLightDto> lights) => new(
        lantern.Id,
        lantern.SeasonYear,
        lantern.SelectedDesign.DesignKey,
        lantern.PaletteKey,
        lantern.PatternKey,
        lights.Count,
        GrowthPolicy.GrowthFor(lights.Count),
        lantern.NextSlotIndex,
        GrowthPolicy.StageFor(lights.Count),
        lantern.UnlockAtUtc,
        lantern.CreatedAtUtc,
        lights);
}
