using Xunit;
using DecoMyLantern.Api.Services.Lanterns;
using DecoMyLantern.Api.Services.Messages;
namespace DecoMyLantern.Api.Tests;
public sealed class PolicyTests
{
    [Theory]
    [InlineData(0, "base")]
    [InlineData(1, "lights")]
    [InlineData(5, "lights")]
    [InlineData(6, "details")]
    [InlineData(15, "details")]
    [InlineData(16, "fuller")]
    [InlineData(30, "fuller")]
    [InlineData(31, "grand")]
    [InlineData(50, "grand")]
    [InlineData(51, "grand")]
    public void Growth_stage_reflects_visual_range_not_an_unlock(int count, string expected) =>
        Assert.Equal(expected, GrowthPolicy.StageFor(count));

    [Fact]
    public void Every_friend_count_through_50_uses_the_agreed_visual_range()
    {
        for (var count = 0; count <= 50; count++)
        {
            var expected = count switch
            {
                0 => "base",
                <= 5 => "lights",
                <= 15 => "details",
                <= 30 => "fuller",
                _ => "grand"
            };
            Assert.Equal(expected, GrowthPolicy.StageFor(count));
        }
    }

    [Fact]
    public void Fifty_is_a_visual_target_not_a_hard_backend_growth_limit()
    {
        Assert.Equal("grand", GrowthPolicy.StageFor(50));
        Assert.Equal("grand", GrowthPolicy.StageFor(51));
        Assert.Equal("grand", GrowthPolicy.StageFor(120));
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
