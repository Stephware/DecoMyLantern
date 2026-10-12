namespace DecoMyLantern.Api.Services.Lanterns;

public static class LanternPolicy
{
    private static readonly int[] Milestones = [5, 15, 30];
    private static readonly string[] Patterns = ["default", "rings", "rays"];

    // Philippine Standard Time is fixed at UTC+08:00.
    public static int SeasonFor(DateTime utcNow) => utcNow.ToUniversalTime().AddHours(8).Year;

    public static int? NextMilestone(int acceptedFriends) =>
        Milestones.FirstOrDefault(milestone => milestone > acceptedFriends) is var next && next > 0 ? next : null;

    public static bool IsAllowedPattern(string key) =>
        Patterns.Contains(key, StringComparer.Ordinal);
}
