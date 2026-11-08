namespace DecoMyLantern.Api.Services.Lanterns;

using DecoMyLantern.Api.Services.Shared;

public static class LanternPolicy
{
    private static readonly string[] Patterns =
        new[]
        {
            DesignConstants.PatternKeys.Default,
            DesignConstants.PatternKeys.Rings,
            DesignConstants.PatternKeys.Rays,
        };

    // Philippine Standard Time is fixed at UTC+08:00, but use TimeZoneInfo for robustness.
    private static readonly TimeZoneInfo PhilippineTimeZone =
        TimeZoneInfo.FindSystemTimeZoneById("Singapore Standard Time")
        ?? TimeZoneInfo.FindSystemTimeZoneById("Asia/Manila")
        ?? TimeZoneInfo.CreateCustomTimeZone("PST", TimeSpan.FromHours(8), "Philippine Standard Time", "PST");

    // Philippine Standard Time is fixed at UTC+08:00, but use TimeZoneInfo for robustness.
    public static int SeasonFor(DateTime utcNow) =>
        TimeZoneInfo.ConvertTimeFromUtc(utcNow.ToUniversalTime(), PhilippineTimeZone).Year;

    public static bool IsAllowedPattern(string key) =>
        Patterns.Contains(key, StringComparer.Ordinal);
}
