namespace DecoMyLantern.Api.Services.Lanterns;

public static class LanternPolicy
{
    private static readonly string[] Patterns = ["default", "rings", "rays"];

    // Philippine Standard Time is fixed at UTC+08:00.
    public static int SeasonFor(DateTime utcNow) => utcNow.ToUniversalTime().AddHours(8).Year;

    public static bool IsAllowedPattern(string key) =>
        Patterns.Contains(key, StringComparer.Ordinal);
}
