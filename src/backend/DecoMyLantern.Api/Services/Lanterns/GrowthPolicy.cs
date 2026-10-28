using DecoMyLantern.Api.Models.Database;

namespace DecoMyLantern.Api.Services.Lanterns;

/// <summary>
/// Visual growth milestones, independent of design selection.
/// All enabled designs are selectable from the start; growth continues past 50.
/// </summary>
public static class GrowthPolicy
{
    public const int GrowthPerFriend = 3;

    // Visual growth is derived from accepted friends, not another database record.
    public static int GrowthFor(int acceptedFriends)
    {
        if (acceptedFriends < 0) throw new ArgumentOutOfRangeException(nameof(acceptedFriends));
        return checked(acceptedFriends * GrowthPerFriend);
    }

    public static string StageFor(int acceptedFriends) => acceptedFriends switch
    {
        < 0 => throw new ArgumentOutOfRangeException(nameof(acceptedFriends)),
        < 3 => "base",
        < 10 => "floral",
        < 23 => "festival",
        < 40 => "celestial",
        < 50 => "fiesta",
        _ => "sampaguita"
    };

    // Legacy helper retained for callers; a design is now available whenever
    // it is enabled. Friend thresholds still describe decorative milestones.
    public static bool DesignUnlocked(ParolDesign design, int acceptedFriends, int highestAcceptedSlot)
    {
        if (acceptedFriends < 0 || highestAcceptedSlot < 0)
            throw new ArgumentOutOfRangeException(nameof(acceptedFriends));
        return design.IsEnabled;
    }
}
