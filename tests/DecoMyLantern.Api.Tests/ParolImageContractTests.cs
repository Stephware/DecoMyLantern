using System.ComponentModel.DataAnnotations;
using System.Reflection;
using DecoMyLantern.Api.Controllers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Xunit;

namespace DecoMyLantern.Api.Tests;

public sealed class ParolImageContractTests
{
    private static bool Valid(object request) =>
        Validator.TryValidateObject(request, new ValidationContext(request),
            new List<ValidationResult>(), true);

    [Fact]
    public void Image_formats_are_restricted_to_webp_and_png()
    {
        Assert.True(Valid(new ParolImageRequest()));
        Assert.True(Valid(new ParolImageRequest { Format = "png" }));
        Assert.False(Valid(new ParolImageRequest { Format = "svg" }));
        Assert.False(Valid(new ParolImageRequest { Format = "mp4" }));
        Assert.False(Valid(new ParolImageRequest { Format = "" }));
    }

    [Fact]
    public void Guest_image_requires_an_exactly_sixteen_character_invitation()
    {
        Assert.False(Valid(new GuestParolImageRequest { Token = "" }));
        Assert.False(Valid(new GuestParolImageRequest { Token = "short" }));
        Assert.True(Valid(new GuestParolImageRequest
        {
            Token = "0123456789abcdef",
            Format = "webp"
        }));
    }

    [Fact]
    public void Owner_and_guest_have_separate_protected_routes()
    {
        var type = typeof(ParolImageController);
        var owner = type.GetMethod(nameof(ParolImageController.OwnerImage))!;
        var guest = type.GetMethod(nameof(ParolImageController.InvitationImage))!;
        Assert.NotNull(owner.GetCustomAttribute<AuthorizeAttribute>());
        Assert.NotNull(guest.GetCustomAttribute<AllowAnonymousAttribute>());
        Assert.Equal("my/lantern/image",
            owner.GetCustomAttribute<HttpPostAttribute>()!.Template);
        Assert.Equal("invitations/image",
            guest.GetCustomAttribute<HttpPostAttribute>()!.Template);
        Assert.NotNull(owner.GetCustomAttribute<EnableRateLimitingAttribute>());
        Assert.NotNull(guest.GetCustomAttribute<EnableRateLimitingAttribute>());
    }

    [Fact]
    public void Renderer_payload_only_contains_safe_persisted_parol_fields()
    {
        var fields = typeof(ParolImageRenderPayload).GetProperties()
            .Select(property => property.Name).OrderBy(name => name).ToArray();
        Assert.Equal(new[] { "DesignKey", "Format", "FriendCount", "PatternKey", "Slots" }, fields);
    }
}
