using DecoMyLantern.Api.Models.Database;

namespace DecoMyLantern.Api.Services.Lanterns;

/// <summary>
/// Design milestones, independent of the deterministic outer-shell geometry.
/// Friend contributions do not stop at the final 50-friend design unlock.
/// </summary>
public static class GrowthPolicy
{
    public const int PointsPerFriend = 3;

    // Growth is derived from accepted contributions; it is never stored as a
    // second source of truth or counted as separate contributions.
    public static int PointsFor(int acceptedFriends)
    {
        if (acceptedFriends < 0)
            throw new ArgumentOutOfRangeException(nameof(acceptedFriends));
        return checked(acceptedFriends * PointsPerFriend);
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
