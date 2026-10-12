using Xunit;
using DecoMyLantern.Api.Features.Lanterns;
using DecoMyLantern.Api.Features.Messages;

namespace DecoMyLantern.Api.Tests;

public sealed class PolicyTests
{
    [Theory]
    [InlineData(0, "base")]
    [InlineData(4, "base")]
    [InlineData(5, "enhanced")]
    [InlineData(14, "enhanced")]
    [InlineData(15, "radiant")]
    [InlineData(29, "radiant")]
    [InlineData(30, "grand")]
    public void Growth_stage_uses_milestones(int count, string expected) =>
        Assert.Equal(expected, GrowthPolicy.StageFor(count));

    [Fact]
    public void Christmas_unlock_uses_Philippine_midnight()
    {
        var unlock = ChristmasUnlockPolicy.UnlockUtcForSeason(2026);
        Assert.Equal(new DateTime(2026, 12, 24, 16, 0, 0, DateTimeKind.Utc), unlock);
        Assert.False(ChristmasUnlockPolicy.CanRead(unlock.AddTicks(-1), unlock));
        Assert.True(ChristmasUnlockPolicy.CanRead(unlock, unlock));
    }
}
