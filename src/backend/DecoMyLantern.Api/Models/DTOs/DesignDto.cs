namespace DecoMyLantern.Api.Models.DTOs;

// All enabled designs are selectable immediately. No friend-based unlock field.
public sealed record DesignDto(string DesignKey, string Name, string AssetKey);

// These are visual ranges rather than requirements for access or customization.
public sealed record GrowthStageDto(string StageKey, string Name, int RequiredFriends);
