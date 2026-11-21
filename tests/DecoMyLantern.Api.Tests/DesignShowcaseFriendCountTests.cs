using DecoMyLantern.Api.Controllers;
using Xunit;

namespace DecoMyLantern.Api.Tests;

public sealed class DesignShowcaseFriendCountTests
{
    [Theory]
    [InlineData(null, true)]  // Unchanged design-gallery default: 50 friends
    [InlineData(20, true)]    // Public welcome image
    [InlineData(50, true)]    // Explicit full-bloom gallery
    [InlineData(0, false)]
    [InlineData(1, false)]
    [InlineData(19, false)]
    [InlineData(21, false)]
    [InlineData(35, false)]
    [InlineData(60, false)]
    [InlineData(-1, false)]
    public void Public_showcase_accepts_only_approved_friend_counts(
        int? friends, bool expected)
    {
        Assert.Equal(expected, DesignShowcaseController.SupportsFriendCount(friends));
    }
}
