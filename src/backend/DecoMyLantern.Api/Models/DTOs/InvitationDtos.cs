using System.ComponentModel.DataAnnotations;

namespace DecoMyLantern.Api.Models.DTOs;

public sealed record CreatedInvitationDto(Guid Id, string Token, DateTime ExpiresAtUtc);
public sealed record InvitationInfoDto(Guid Id, DateTime? ExpiresAtUtc, DateTime? RevokedAtUtc);

public sealed class InvitationTokenRequest
{
    [Required, StringLength(128, MinimumLength = 43)]
    public string Token { get; init; } = "";
}

public sealed class GuestContributionRequest
{
    [Required, StringLength(128, MinimumLength = 43)]
    public string Token { get; init; } = "";

    [Required, StringLength(80, MinimumLength = 1)]
    public string DisplayName { get; init; } = "";

    [MaxLength(500)]
    public string? Message { get; init; }
}

// Do not expose private message text, the owner ID, recovery codes,
// the share-link hash, or guest visitor identities in the public preview.
public sealed record PublicLightDto(Guid Id, int SlotIndex);
public sealed record InvitationPreviewDto(
    string DesignKey,
    string PatternKey,
    int AcceptedFriends,
    int GrowthPoints,
    string GrowthStage,
    bool AlreadyContributed,
    IReadOnlyList<PublicLightDto> Lights);

public sealed record GuestContributionResultDto(
    Guid ContributionId,
    int SlotIndex,
    bool MessageSaved,
    InvitationPreviewDto Parol);
