using DecoMyLantern.Api.Models.Database;
using DecoMyLantern.Api.Services.Shared;

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
        < 3 => DesignConstants.GrowthStageKeys.Base,
        < 10 => DesignConstants.GrowthStageKeys.Floral,
        < 23 => DesignConstants.GrowthStageKeys.Festival,
        < 40 => DesignConstants.GrowthStageKeys.Celestial,
        < 50 => DesignConstants.GrowthStageKeys.Fiesta,
        _ => DesignConstants.GrowthStageKeys.Sampaguita
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
