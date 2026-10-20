using Xunit;
using DecoMyLantern.Api.Models.Database;
using DecoMyLantern.Api.Services.Lanterns;
using DecoMyLantern.Api.Services.Messages;

namespace DecoMyLantern.Api.Tests;

public sealed class PolicyTests
{
    [Theory]
    [InlineData(0, "base")]
    [InlineData(1, "base")]
    [InlineData(2, "base")]
    [InlineData(3, "floral")]
    [InlineData(9, "floral")]
    [InlineData(10, "festival")]
    [InlineData(22, "festival")]
    [InlineData(23, "celestial")]
    [InlineData(39, "celestial")]
    [InlineData(40, "fiesta")]
    [InlineData(49, "fiesta")]
    [InlineData(50, "sampaguita")]
    [InlineData(51, "sampaguita")]
    public void Growth_stage_matches_design_milestones(int count, string expected) =>
        Assert.Equal(expected, GrowthPolicy.StageFor(count));

    [Fact]
    public void Every_accepted_friend_count_through_50_maps_to_a_valid_design_tier()
    {
        for (var count = 0; count <= 50; count++)
        {
            var expected = count switch
            {
                < 3 => "base",
                < 10 => "floral",
                < 23 => "festival",
                < 40 => "celestial",
                < 50 => "fiesta",
                _ => "sampaguita"
            };
            Assert.Equal(expected, GrowthPolicy.StageFor(count));
        }
    }

    [Fact]
    public void Designs_stay_unlocked_after_a_contribution_is_removed()
    {
        var design = new ParolDesign { DesignKey = "fiesta", RequiredFriends = 40, IsEnabled = true };
        Assert.False(GrowthPolicy.DesignUnlocked(design, 39, 39));
        Assert.True(GrowthPolicy.DesignUnlocked(design, 40, 40));
        Assert.True(GrowthPolicy.DesignUnlocked(design, 1, 40));
    }

    [Theory]
    [InlineData(0, 0)]
    [InlineData(1, 3)]
    [InlineData(3, 9)]
    [InlineData(10, 30)]
    [InlineData(23, 69)]
    [InlineData(40, 120)]
    [InlineData(50, 150)]
    [InlineData(51, 153)]
    public void Each_friend_adds_three_growth_points(int friends, int expected) =>
        Assert.Equal(expected, GrowthPolicy.PointsFor(friends));

    [Fact]
    public void Invalid_growth_counts_are_rejected()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => GrowthPolicy.PointsFor(-1));
        Assert.Throws<OverflowException>(() => GrowthPolicy.PointsFor(int.MaxValue));
    }

    [Fact]
    public void Final_milestone_is_not_a_contribution_cap()
    {
        Assert.Equal("sampaguita", GrowthPolicy.StageFor(51));
        Assert.Equal("sampaguita", GrowthPolicy.StageFor(120));
    }

    [Fact]
    public void Invalid_friend_count_is_rejected() =>
        Assert.Throws<ArgumentOutOfRangeException>(() => GrowthPolicy.StageFor(-1));

    [Fact]
    public void Christmas_unlock_uses_Philippine_midnight()
    {
        var unlock = ChristmasUnlockPolicy.UnlockUtcForSeason(2026);
        Assert.Equal(new DateTime(2026, 12, 24, 16, 0, 0, DateTimeKind.Utc), unlock);
        Assert.False(ChristmasUnlockPolicy.CanRead(unlock.AddTicks(-1), unlock));
        Assert.True(ChristmasUnlockPolicy.CanRead(unlock, unlock));
    }
}
