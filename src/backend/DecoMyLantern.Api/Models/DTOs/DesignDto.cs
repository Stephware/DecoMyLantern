namespace DecoMyLantern.Api.Models.DTOs;

public sealed record DesignDto(string DesignKey, string Name, string AssetKey, int RequiredFriends);
public sealed record GrowthStageDto(string StageKey, string Name, int RequiredFriends);
