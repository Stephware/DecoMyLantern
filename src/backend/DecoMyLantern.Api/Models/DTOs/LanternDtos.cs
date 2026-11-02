using System.ComponentModel.DataAnnotations;

namespace DecoMyLantern.Api.Models.DTOs;

// The slot index comes from the persisted Contribution and never changes when the parol grows.
public sealed record ContributionLightDto(Guid Id, int SlotIndex, string DisplayName);

public sealed record LanternDto(
    Guid Id,
    int SeasonYear,
    string DesignKey,
    string PaletteKey,
    string PatternKey,
    int AcceptedFriends,
    int GrowthPoints,
    int MaxReachedFriends,
    string GrowthStage,
    DateTime UnlockAtUtc,
    DateTime CreatedAtUtc,
    bool IsAdmin,
    IReadOnlyList<ContributionLightDto> Lights);

public sealed class UpdateLanternRequest
{
    [Required, MaxLength(64)]
    public string DesignKey { get; init; } = "";

    [Required, MaxLength(60)]
    public string PatternKey { get; init; } = "";
}
