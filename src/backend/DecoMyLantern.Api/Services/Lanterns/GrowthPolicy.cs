namespace DecoMyLantern.Api.Services.Lanterns;

public static class GrowthPolicy
{
    public static string StageFor(int acceptedFriends) => acceptedFriends switch
    {
        < 0 => throw new ArgumentOutOfRangeException(nameof(acceptedFriends)),
        < 5 => "base",
        < 15 => "enhanced",
        < 30 => "radiant",
        _ => "grand"
    };
}
