using System.Security.Claims;
using DecoMyLantern.Api.Controllers;
using DecoMyLantern.Api.Models.DTOs;
using DecoMyLantern.Api.Services.Lanterns;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace DecoMyLantern.Api.Tests;

public sealed class StoryCompositionAuthorizationTests
{
    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Composition_rejects_invalid_csrf_before_resolving_saved_data(bool owner)
    {
        var controller = Controller(false);
        var result = owner ? await controller.OwnerComposition(default)
            : await controller.GuestComposition(new GuestStoryExportRequest {Token="abcdefghijklmnop"}, default);
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Composition_requires_owner_session_or_guest_contribution_cookie()
    {
        Assert.IsType<UnauthorizedResult>(await Controller(true).OwnerComposition(default));
        var result = await Controller(true).GuestComposition(
            new GuestStoryExportRequest {Token="abcdefghijklmnop"}, default);
        Assert.Equal(403, Assert.IsType<ObjectResult>(result).StatusCode);
    }

    [Fact]
    public async Task Owner_composition_uses_saved_state_without_private_light_names()
    {
        var ownerId=Guid.NewGuid();
        var lanterns=new SavedLantern(ownerId);
        var controller=Controller(true,lanterns);
        controller.HttpContext.User=new ClaimsPrincipal(new ClaimsIdentity(
            new[] {new Claim(ClaimTypes.NameIdentifier,ownerId.ToString())},"test"));
        var result=Assert.IsType<OkObjectResult>(await controller.OwnerComposition(default));
        var payload=Assert.IsType<StoryRenderPayload>(result.Value);
        Assert.Equal("classic",payload.DesignKey);
        Assert.Equal(2,payload.FriendCount);
        Assert.Equal(new[] {1,9},payload.Slots);
        Assert.Null(payload.HighlightSlot);
        Assert.Equal("private, no-store",controller.Response.Headers.CacheControl);
        Assert.DoesNotContain("secret name",System.Text.Json.JsonSerializer.Serialize(payload));
    }

    private static StoryExportController Controller(bool csrf, ILanternService? lanterns=null)
    {
        return new StoryExportController(lanterns!,null!,null!,null!,
            new ConfigurationBuilder().Build(),new Csrf(csrf),
            NullLogger<StoryExportController>.Instance,null!)
        {ControllerContext=new ControllerContext {HttpContext=new DefaultHttpContext()}};
    }

    private sealed class Csrf(bool valid) : IAntiforgery
    {
        public Task ValidateRequestAsync(HttpContext context) => valid ? Task.CompletedTask :
            Task.FromException(new AntiforgeryValidationException("invalid"));
        public Task<bool> IsRequestValidAsync(HttpContext context) => Task.FromResult(valid);
        public AntiforgeryTokenSet GetAndStoreTokens(HttpContext context) => throw new NotSupportedException();
        public AntiforgeryTokenSet GetTokens(HttpContext context) => throw new NotSupportedException();
        public void SetCookieTokenAndHeader(HttpContext context) => throw new NotSupportedException();
    }

    private sealed class SavedLantern(Guid expectedOwner) : ILanternService
    {
        public Task<LanternDto?> GetCurrentAsync(Guid ownerId,CancellationToken token)
        {
            Assert.Equal(expectedOwner,ownerId);
            return Task.FromResult<LanternDto?>(new LanternDto(Guid.NewGuid(),2026,"classic","gold",
                "default",2,6,2,"growing",DateTime.UtcNow,DateTime.UtcNow,false,
                new[] {new ContributionLightDto(Guid.NewGuid(),9,"secret name"),
                    new ContributionLightDto(Guid.NewGuid(),1,"another name")}));
        }
        public Task<LanternDto> CreateAsync(Guid owner,CancellationToken token) => throw new NotSupportedException();
        public Task<LanternDto> UpdateAsync(Guid owner,UpdateLanternRequest request,CancellationToken token) => throw new NotSupportedException();
    }
}
