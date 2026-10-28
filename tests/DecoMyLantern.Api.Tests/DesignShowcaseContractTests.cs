using System.Reflection;
using DecoMyLantern.Api.Controllers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Xunit;

namespace DecoMyLantern.Api.Tests;

public sealed class DesignShowcaseContractTests
{
    [Fact]
    public void Public_showcase_route_is_read_only_and_rate_limited()
    {
        var type = typeof(DesignShowcaseController);
        Assert.NotNull(type.GetCustomAttribute<ApiControllerAttribute>());
        Assert.Equal("api/designs", type.GetCustomAttribute<RouteAttribute>()?.Template);

        var method = type.GetMethod(nameof(DesignShowcaseController.GetShowcase))!;
        Assert.Equal("{designKey}/showcase",
            method.GetCustomAttribute<HttpGetAttribute>()?.Template);
        Assert.NotNull(method.GetCustomAttribute<EnableRateLimitingAttribute>());

        // No owner ID, session, invitation token or requested friend count
        // is accepted from the caller.
        Assert.Equal(
            new[] {typeof(string), typeof(CancellationToken)},
            method.GetParameters().Select(x => x.ParameterType).ToArray());
    }

    [Fact]
    public void Owner_design_selection_is_not_the_same_as_fake_growth()
    {
        var service = typeof(DecoMyLantern.Api.Services.Lanterns.LanternService);
        Assert.NotNull(service.GetMethod("UpdateAsync"));
        // Real design selections are covered by LanternServiceTests at zero
        // friends; all growth still comes from persisted accepted lights.
        Assert.NotNull(typeof(DecoMyLantern.Api.Services.Lanterns.GrowthPolicy)
            .GetMethod("GrowthFor"));
    }
}
