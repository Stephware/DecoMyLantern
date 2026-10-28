using System.ComponentModel.DataAnnotations;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Json;
using DecoMyLantern.Api.Models.DTOs;
using DecoMyLantern.Api.Services.Invitations;
using DecoMyLantern.Api.Services.Lanterns;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace DecoMyLantern.Api.Controllers;

public sealed class ParolImageRequest
{
    [Required, RegularExpression("^(webp|png)$")]
    public string Format { get; set; } = "webp";
}

public sealed class GuestParolImageRequest : ParolImageRequest
{
    [Required, StringLength(16, MinimumLength = 16)]
    public string Token { get; set; } = "";
}

public sealed record ParolImageRenderPayload(
    string DesignKey, string PatternKey, int FriendCount, int[] Slots, string Format);

/// <summary>
/// Serves one flattened parol image for an authenticated owner or a valid
/// invitation. Never accepts design, friend count, or slot data from callers.
/// Image rendering and cache storage happen in the private renderer service.
/// </summary>
[ApiController]
[Route("api")]
public sealed class ParolImageController(
    ILanternService lanterns,
    IInvitationService invitations,
    IHttpClientFactory clients,
    IConfiguration configuration,
    IAntiforgery antiforgery,
    ILogger<ParolImageController> logger,
    IHostEnvironment environment) : ControllerBase
{
    [Authorize]
    [HttpPost("my/lantern/image")]
    [EnableRateLimiting("parol-image-owner")]
    public async Task<IActionResult> OwnerImage(
        [FromBody] ParolImageRequest request, CancellationToken cancellationToken)
    {
        if (!await ValidCsrfAsync()) return BadRequest(new { message = "Invalid request token." });
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var ownerId))
            return Unauthorized();

        var lantern = await lanterns.GetCurrentAsync(ownerId, cancellationToken);
        if (lantern is null) return NotFound(new { message = "Create a parol first." });

        return await RenderImageAsync(new ParolImageRenderPayload(
            lantern.DesignKey, lantern.PatternKey, lantern.AcceptedFriends,
            lantern.Lights.OrderBy(x => x.SlotIndex).Take(500)
                .Select(x => x.SlotIndex).ToArray(), request.Format), cancellationToken);
    }

    [AllowAnonymous]
    [HttpPost("invitations/image")]
    [EnableRateLimiting("parol-image-guest")]
    public async Task<IActionResult> InvitationImage(
        [FromBody] GuestParolImageRequest request, CancellationToken cancellationToken)
    {
        if (!await ValidCsrfAsync()) return BadRequest(new { message = "Invalid request token." });

        // The validated invitation is the only public read capability; a guest
        // does not need to contribute to view the existing parol.
        var visitorSecret = Request.Cookies.TryGetValue("BeMyParol.Guest", out var cookie)
            ? cookie : null;
        InvitationPreviewDto preview;
        try { preview = await invitations.PreviewAsync(request.Token, visitorSecret, cancellationToken); }
        catch (InvitationException exception)
        {
            return StatusCode(exception.StatusCode, new { message = exception.Message });
        }

        return await RenderImageAsync(new ParolImageRenderPayload(
            preview.DesignKey, preview.PatternKey, preview.AcceptedFriends,
            preview.Lights.OrderBy(x => x.SlotIndex).Take(500)
                .Select(x => x.SlotIndex).ToArray(), request.Format), cancellationToken);
    }

    private async Task<IActionResult> RenderImageAsync(
        ParolImageRenderPayload snapshot, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(configuration["StoryRenderer:SharedSecret"]))
            return StatusCode(503, new { message = "Parol image service is not configured." });

        try
        {
            var client = clients.CreateClient("StoryRenderer");
            using var message = new HttpRequestMessage(HttpMethod.Post, "/render-parol")
            {
                Content = JsonContent.Create(snapshot,
                    options: new JsonSerializerOptions(JsonSerializerDefaults.Web))
            };
            message.Headers.Add("X-Story-Renderer-Key", configuration["StoryRenderer:SharedSecret"]);
            using var response = await client.SendAsync(
                message, HttpCompletionOption.ResponseHeadersRead, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("Parol image renderer responded HTTP {StatusCode}",
                    (int)response.StatusCode);
                if (response.StatusCode == System.Net.HttpStatusCode.ServiceUnavailable)
                {
                    Response.Headers.RetryAfter = "2";
                    return StatusCode(503, new { message = "Parol image renderer is busy. Try again shortly." });
                }
                return StatusCode(503, new { message = "Unable to generate the parol image." });
            }

            // A bounded image is safe to return as one binary response, avoiding
            // leaking a half-written image when the renderer disconnects.
            const long maximumImageBytes = 12 * 1024 * 1024;
            if (response.Content.Headers.ContentLength is > maximumImageBytes)
                return StatusCode(503, new { message = "Parol image exceeds the supported size." });

            var bytes = await response.Content.ReadAsByteArrayAsync(cancellationToken);
            if (bytes.LongLength > maximumImageBytes)
                return StatusCode(503, new { message = "Parol image exceeds the supported size." });
            Response.Headers.CacheControl = "private, no-store";
            if (response.Headers.TryGetValues("X-Parol-Cache", out var cache))
                Response.Headers["X-Parol-Cache"] = cache.FirstOrDefault() ?? "UNKNOWN";
            return File(bytes, snapshot.Format == "webp" ? "image/webp" : "image/png");
        }
        catch (HttpRequestException exception)
        {
            logger.LogWarning(exception, "Private parol renderer is unreachable");
            return StatusCode(503, new { message = environment.IsDevelopment()
                ? "Parol renderer is offline. Run bash scripts/dev-with-stories.sh."
                : "Parol image service is unavailable." });
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            logger.LogWarning("Parol image renderer timed out");
            return StatusCode(504, new { message = "Parol image generation timed out." });
        }
    }

    private async Task<bool> ValidCsrfAsync()
    {
        try { await antiforgery.ValidateRequestAsync(HttpContext); return true; }
        catch (AntiforgeryValidationException) { return false; }
    }
}
