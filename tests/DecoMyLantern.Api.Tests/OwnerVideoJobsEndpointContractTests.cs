using System.Reflection;
using DecoMyLantern.Api.Controllers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Xunit;

namespace DecoMyLantern.Api.Tests;

public sealed class OwnerVideoJobsEndpointContractTests
{
    [Fact]
    public void Background_video_job_endpoints_are_owner_authenticated()
    {
        var type = typeof(OwnerVideoJobsController);
        Assert.NotNull(type.GetCustomAttribute<AuthorizeAttribute>());
        Assert.Equal("api/my/lantern/story/video",
            type.GetCustomAttribute<RouteAttribute>()?.Template);
        foreach (var name in new[] { nameof(OwnerVideoJobsController.Start),
                                    nameof(OwnerVideoJobsController.Status),
                                    nameof(OwnerVideoJobsController.Download) })
        {
            var action = type.GetMethod(name)!;
            Assert.Equal(new[] {typeof(CancellationToken)},
                action.GetParameters().Select(p => p.ParameterType).ToArray());
            Assert.NotNull(action.GetCustomAttribute<EnableRateLimitingAttribute>());
        }
        Assert.Equal("job", type.GetMethod(nameof(OwnerVideoJobsController.Start))!
            .GetCustomAttribute<HttpPostAttribute>()?.Template);
        Assert.Equal("job", type.GetMethod(nameof(OwnerVideoJobsController.Status))!
            .GetCustomAttribute<HttpGetAttribute>()?.Template);
        Assert.Equal("job/file", type.GetMethod(nameof(OwnerVideoJobsController.Download))!
            .GetCustomAttribute<HttpGetAttribute>()?.Template);
    }

    [Fact]
    public void Job_is_derived_from_saved_owner_state_without_an_arbitrary_job_identifier()
    {
        var source = System.IO.File.ReadAllText(Path.Combine(
            FindRepositoryRoot(), "src/backend/DecoMyLantern.Api/Controllers/OwnerVideoJobsController.cs"));
        Assert.Contains("lanterns.GetCurrentAsync(ownerId", source);
        Assert.Contains("lantern.AcceptedFriends", source);
        Assert.Contains("lantern.Lights.OrderBy", source);
        Assert.Contains("null, \"mp4\"", source);
        Assert.Contains("antiforgery.ValidateRequestAsync(HttpContext)", source);
        Assert.DoesNotContain("[FromQuery]", source);
        Assert.DoesNotContain("recoveryCode", source, StringComparison.OrdinalIgnoreCase);
    }

    private static string FindRepositoryRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir != null && !File.Exists(Path.Combine(dir.FullName, "DecoMyLantern.slnx")))
            dir = dir.Parent;
        return dir?.FullName ?? throw new InvalidOperationException("Missing solution root");
    }
}
