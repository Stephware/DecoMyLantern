using System.Reflection;
using DecoMyLantern.Api.Controllers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Xunit;

namespace DecoMyLantern.Api.Tests;

public sealed class StoryCompositionContractTests
{
    [Theory]
    [InlineData("OwnerComposition", "my/lantern/story/composition", true)]
    [InlineData("GuestComposition", "invitations/story/composition", false)]
    public void Composition_reads_preserve_auth_routes_and_rate_limits(string name, string route, bool owner)
    {
        var action = typeof(StoryExportController).GetMethod(name);
        Assert.NotNull(action);
        Assert.Equal(route, action.GetCustomAttribute<HttpPostAttribute>()?.Template);
        Assert.NotNull(action.GetCustomAttribute<EnableRateLimitingAttribute>());
        if (owner) Assert.NotNull(action.GetCustomAttribute<AuthorizeAttribute>());
        else Assert.NotNull(action.GetCustomAttribute<AllowAnonymousAttribute>());
    }

    [Fact]
    public void Composition_contains_only_saved_public_visual_fields()
    {
        Assert.Equal(new[] {"DesignKey", "Format", "FriendCount", "HighlightSlot", "Kind", "PatternKey", "Slots"},
            typeof(StoryRenderPayload).GetProperties().Select(p => p.Name).Order().ToArray());
    }
}
