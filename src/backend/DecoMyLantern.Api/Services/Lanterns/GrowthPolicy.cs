using DecoMyLantern.Api.Models.Database;

namespace DecoMyLantern.Api.Services.Lanterns;

/// <summary>
/// Design milestones, independent of the deterministic outer-shell geometry.
/// Friend contributions do not stop at the final 50-friend design unlock.
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

    public static bool DesignUnlocked(ParolDesign design, int acceptedFriends, int highestAcceptedSlot)
    {
        if (acceptedFriends < 0 || highestAcceptedSlot < 0)
            throw new ArgumentOutOfRangeException(nameof(acceptedFriends));
        // NextSlotIndex is monotonic. Once a friend unlocked a design it cannot
        // relock because their light was later removed.
        return design.IsEnabled && Math.Max(acceptedFriends, highestAcceptedSlot) >= design.RequiredFriends;
    }
}
