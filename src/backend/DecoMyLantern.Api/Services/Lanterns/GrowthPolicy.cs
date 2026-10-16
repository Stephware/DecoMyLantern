namespace DecoMyLantern.Api.Services.Lanterns;

// These are descriptive visual ranges, NOT requirements to unlock a parol design.
// Every accepted friend adds their own light; the renderer also adds one accent
// per friend once the outer decorative bands begin.
public static class GrowthPolicy
{
    public static string StageFor(int acceptedFriends) => acceptedFriends switch
    {
        < 0 => throw new ArgumentOutOfRangeException(nameof(acceptedFriends)),
        0 => "base",
        <= 5 => "lights",
        <= 15 => "details",
        <= 30 => "fuller",
        _ => "grand"
    };
}
