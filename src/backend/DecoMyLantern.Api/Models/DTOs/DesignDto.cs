namespace DecoMyLantern.Api.Models.DTOs;

// All designs are returned publicly; owner eligibility is validated server-side.
public sealed record DesignDto(
    string DesignKey,
    string Name,
    string AssetKey,
    int RequiredFriends);

// Count required to unlock each selectable design.
public sealed record GrowthStageDto(string StageKey, string Name, int StartAtFriends);
