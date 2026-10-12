namespace DecoMyLantern.Api.Features.Messages;

public static class ChristmasUnlockPolicy
{
    // Philippine Standard Time is UTC+08:00 throughout the year.
    public static DateTime UnlockUtcForSeason(int year) =>
        new DateTime(year, 12, 24, 16, 0, 0, DateTimeKind.Utc);

    public static bool CanRead(DateTime nowUtc, DateTime unlockAtUtc) =>
        nowUtc.ToUniversalTime() >= unlockAtUtc.ToUniversalTime();
}
