namespace DecoMyLantern.Api.Models.DTOs;

public sealed record ChristmasLetterDto(
    Guid Id,
    string DisplayName,
    DateTime CreatedAtUtc,
    bool IsLocked,
    string? Body);

public sealed record ChristmasInboxDto(
    bool Unlocked,
    DateTime UnlockAtUtc,
    IReadOnlyList<ChristmasLetterDto> Messages);
