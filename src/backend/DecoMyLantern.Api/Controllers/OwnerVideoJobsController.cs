using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Json;
using DecoMyLantern.Api.Services.Lanterns;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace DecoMyLantern.Api.Controllers;

/// <summary>
/// Owner-only asynchronous MP4 rendering. The API reconstructs the canonical
/// saved parol on every operation, so nobody can request a different owner's
/// video by guessing a job ID. No recovery keys or private messages are sent.
/// </summary>
[ApiController]
[Authorize]
[Route("api/my/lantern/story/video")]
public sealed class OwnerVideoJobsController(
    ILanternService lanterns,
    IHttpClientFactory clients,
    IConfiguration configuration,
    IAntiforgery antiforgery,
    ILogger<OwnerVideoJobsController> logger) : ControllerBase
{
    [HttpPost("job")]
    [EnableRateLimiting("story-owner")]
    public async Task<IActionResult> Start(CancellationToken cancellationToken)
    {
        try { await antiforgery.ValidateRequestAsync(HttpContext); }
        catch (AntiforgeryValidationException)
        { return BadRequest(new { message = "Invalid security token. Refresh and try again." }); }

        var (payload, failure) = await SavedStoryAsync(cancellationToken);
        if (failure is not null) return failure;
        return await RequestRendererAsync("/story-video/start", payload!, false, cancellationToken);
    }

    [HttpGet("job")]
    [EnableRateLimiting("story-video-status")]
    public async Task<IActionResult> Status(CancellationToken cancellationToken)
    {
        var (payload, failure) = await SavedStoryAsync(cancellationToken);
        if (failure is not null) return failure;
        return await RequestRendererAsync("/story-video/status", payload!, false, cancellationToken);
    }

    [HttpGet("job/file")]
    [EnableRateLimiting("story-video-download")]
    public async Task<IActionResult> Download(CancellationToken cancellationToken)
    {
        var (payload, failure) = await SavedStoryAsync(cancellationToken);
        if (failure is not null) return failure;
        return await RequestRendererAsync("/story-video/file", payload!, true, cancellationToken);
    }

    private async Task<(StoryRenderPayload?, IActionResult?)> SavedStoryAsync(
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var ownerId))
            return (null, Unauthorized());
        var lantern = await lanterns.GetCurrentAsync(ownerId, cancellationToken);
        if (lantern is null)
            return (null, NotFound(new {message = "Create your parol first."}));
        var snapshot = new StoryRenderPayload(
            "owner", lantern.DesignKey, lantern.PatternKey, lantern.AcceptedFriends,
            lantern.Lights.OrderBy(x => x.SlotIndex).Take(500).Select(x => x.SlotIndex).ToArray(),
            null, "mp4");
        return (snapshot, null);
    }

    private async Task<IActionResult> RequestRendererAsync(
        string path, StoryRenderPayload payload, bool media, CancellationToken cancellationToken)
    {
        var key = configuration["StoryRenderer:SharedSecret"];
        if (string.IsNullOrWhiteSpace(key))
            return StatusCode(503, new {message = "Video rendering is not configured."});

        try
        {
            var client = clients.CreateClient("StoryRenderer");
            using var request = new HttpRequestMessage(HttpMethod.Post, path)
            {
                Content = JsonContent.Create(payload, options: new JsonSerializerOptions(JsonSerializerDefaults.Web))
            };
            request.Headers.Add("X-Story-Renderer-Key", key);
            using var response = await client.SendAsync(request,
                HttpCompletionOption.ResponseHeadersRead, cancellationToken);
            Response.Headers.CacheControl = "private, no-store";
            if (!response.IsSuccessStatusCode)
            {
                if (response.StatusCode == HttpStatusCode.NotFound)
                    return NotFound(new {message = "This video is not ready. Reopen sharing to check again."});
                logger.LogWarning("Private video job request {Path} failed with HTTP {Status}",
                    path, (int)response.StatusCode);
                if (response.StatusCode == HttpStatusCode.ServiceUnavailable)
                {
                    Response.Headers["Retry-After"] = "3";
                    return StatusCode(503, new {message = "Video renderer is busy. Try again shortly."});
                }
                return StatusCode(503, new {message = "Unable to check video rendering. Try again."});
            }

            if (!media)
            {
                var status = await response.Content.ReadFromJsonAsync<VideoJobStatus>(cancellationToken);
                return Ok(new { status = status?.Status ?? "not_found" });
            }

            Response.ContentType = "video/mp4";
            Response.Headers["Content-Disposition"] = "attachment; filename=\"BeMyParol-Story.mp4\"";
            if (response.Content.Headers.ContentLength is long length)
                Response.ContentLength = length;
            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            await stream.CopyToAsync(Response.Body, cancellationToken);
            return new EmptyResult();
        }
        catch (HttpRequestException ex)
        {
            logger.LogWarning(ex, "Private Story video renderer unreachable");
            return StatusCode(503, new {message = "Video rendering service is unavailable."});
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return StatusCode(504, new {message = "Video renderer timed out. Check again."});
        }
    }

    private sealed record VideoJobStatus(string Status);
}
