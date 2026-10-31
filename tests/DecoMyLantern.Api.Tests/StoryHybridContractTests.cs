using System.ComponentModel.DataAnnotations;
using System.Reflection;
using DecoMyLantern.Api.Controllers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Xunit;

namespace DecoMyLantern.Api.Tests;

public sealed class StoryHybridContractTests
{
    [Fact]
    public void Browser_composition_and_jobs_keep_owner_and_guest_routes_separate()
    {
        var type = typeof(StoryExportController);
        foreach (var (ownerName, guestName, ownerRoute, guestRoute) in new[]
        {
            (nameof(StoryExportController.OwnerComposition), nameof(StoryExportController.GuestComposition),
                "my/lantern/story/composition", "invitations/story/composition"),
            (nameof(StoryExportController.OwnerJob), nameof(StoryExportController.GuestJob),
                "my/lantern/story/jobs/{action}", "invitations/story/jobs/{action}")
        })
        {
            var owner = type.GetMethod(ownerName)!;
            var guest = type.GetMethod(guestName)!;
            Assert.NotNull(owner.GetCustomAttribute<AuthorizeAttribute>());
            Assert.NotNull(guest.GetCustomAttribute<AllowAnonymousAttribute>());
            Assert.Equal(ownerRoute, owner.GetCustomAttribute<HttpPostAttribute>()!.Template);
            Assert.Equal(guestRoute, guest.GetCustomAttribute<HttpPostAttribute>()!.Template);
            Assert.NotNull(owner.GetCustomAttribute<EnableRateLimitingAttribute>());
            Assert.NotNull(guest.GetCustomAttribute<EnableRateLimitingAttribute>());
        }
    }

    [Fact]
    public void Guest_job_requires_invitation_and_visual_payload_excludes_private_data()
    {
        static bool Valid(object request) => Validator.TryValidateObject(request,
            new ValidationContext(request), new List<ValidationResult>(), true);
        Assert.False(Valid(new GuestStoryJobRequest()));
        Assert.False(Valid(new GuestStoryJobRequest { Token = "short" }));
        Assert.True(Valid(new GuestStoryJobRequest { Token = "abcdefghijklmnop" }));

        var fields = typeof(StoryRenderPayload).GetProperties()
            .Select(property => property.Name).OrderBy(name => name).ToArray();
        Assert.Equal(new[] { "DesignKey", "Format", "FriendCount", "HighlightSlot",
            "Kind", "PatternKey", "Slots" }, fields);
    }
}
