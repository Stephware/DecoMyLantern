using System.ComponentModel.DataAnnotations;
using DecoMyLantern.Api.Controllers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Xunit;

namespace DecoMyLantern.Api.Tests;

public sealed class AdminParolPreviewTests
{
    private static bool IsValid(AdminPreviewParolImageRequest request) =>
        Validator.TryValidateObject(request, new ValidationContext(request),
            new List<ValidationResult>(), validateAllProperties:true);

    [Theory]
    [InlineData("classic", 0, 1, true)]
    [InlineData("sampaguita", 50, 2, true)]
    [InlineData("floral", 60, 3, true)]
    [InlineData("classic", 61, 1, false)]
    [InlineData("classic", -1, 1, false)]
    [InlineData("not-a-design", 10, 1, false)]
    [InlineData("classic", 10, 4, false)]
    public void Only_approved_synthetic_counts_designs_and_scales_are_valid(
        string design, int friends, int scale, bool valid)
    {
        var request = new AdminPreviewParolImageRequest
        {
            DesignKey = design, FriendCount = friends, Scale = scale, Format = "webp"
        };
        Assert.Equal(valid, IsValid(request));
    }

    [Fact]
    public void Admin_preview_route_requires_owner_login_and_rate_limit()
    {
        var method = typeof(ParolImageController).GetMethod(
            nameof(ParolImageController.AdminPreviewImage));
        Assert.NotNull(method);
        var attributes = method.GetCustomAttributes(true);
        Assert.Contains(attributes, item => item is AuthorizeAttribute);
        Assert.Contains(attributes, item => item is EnableRateLimitingAttribute);
        Assert.Contains(attributes, item => item is HttpPostAttribute post &&
            post.Template == "my/lantern/admin-preview/image");
    }
}
