using System.ComponentModel.DataAnnotations;

namespace DecoMyLantern.Api.Models.DTOs;

public sealed record LanternDto(
    Guid Id,
    int SeasonYear,
    string DesignKey,
    string PaletteKey,
    string PatternKey,
    int AcceptedFriends,
    string GrowthStage,
    int? NextMilestone,
    DateTime UnlockAtUtc,
    DateTime CreatedAtUtc);

public sealed class UpdateLanternRequest
{
    [Required, MaxLength(64)]
    public string DesignKey { get; init; } = "";

    [Required, MaxLength(60)]
    public string PatternKey { get; init; } = "";
}
