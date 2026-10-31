using System.ComponentModel.DataAnnotations;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Json;
using DecoMyLantern.Api.Models.Database;
using DecoMyLantern.Api.Models.DTOs;
using DecoMyLantern.Api.Services.Invitations;
using DecoMyLantern.Api.Services.Lanterns;
using DecoMyLantern.Api.Services.Owner;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace DecoMyLantern.Api.Controllers;

public class StoryExportRequest
{
    [Required, RegularExpression("^(mp4|png)$")]
    public string Format { get; set; } = "mp4";
}

public sealed class GuestStoryExportRequest : StoryExportRequest
{
    [Required, StringLength(16, MinimumLength = 16)]
    public string Token { get; set; } = "";
}

public sealed record StoryRenderPayload(
    string Kind, string DesignKey, string PatternKey,
    int FriendCount, int[] Slots, int? HighlightSlot, string Format);

public class StoryJobRequest
{
    public string? Id { get; set; }
}

public sealed class GuestStoryJobRequest : StoryJobRequest
{
    [Required, StringLength(16, MinimumLength = 16)]
    public string Token { get; set; } = "";
}

/// <summary>Proxy sanitized data to the private Node renderer. Never expose
/// the renderer to the public network or send messages/recovery codes to it.</summary>
[ApiController]
[Route("api")]
public sealed class StoryExportController(
    ILanternService lanternService,
    IInvitationService invitations,
    ApplicationDbContext database,
    IHttpClientFactory httpClientFactory,
    IConfiguration config,
    IAntiforgery antiforgery,
    ILogger<StoryExportController> logger,
    IHostEnvironment environment) : ControllerBase
{
    [Authorize]
    [HttpPost("my/lantern/story")]
    [EnableRateLimiting("story-owner")]
    public async Task<IActionResult> OwnerStory([FromBody] StoryExportRequest request,
        CancellationToken cancellationToken)
    {
        if (!await ValidCsrfAsync()) return BadRequest(new { message = "Invalid security token." });
        var (snapshot, error) = await OwnerSnapshotAsync(request.Format, cancellationToken);
        return error ?? await RenderAsync(snapshot!, cancellationToken);
    }

    [AllowAnonymous]
    [HttpPost("invitations/story")]
    [EnableRateLimiting("story-guest")]
    public async Task<IActionResult> GuestStory([FromBody] GuestStoryExportRequest request,
        CancellationToken cancellationToken)
    {
        if (!await ValidCsrfAsync()) return BadRequest(new { message = "Invalid security token." });
        var (snapshot, error) = await GuestSnapshotAsync(request.Token, request.Format, cancellationToken);
        return error ?? await RenderAsync(snapshot!, cancellationToken);
    }

    [Authorize]
    [HttpPost("my/lantern/story/composition")]
    [EnableRateLimiting("story-job-owner")]
    public async Task<IActionResult> OwnerComposition(CancellationToken cancellationToken)
    {
        if (!await ValidCsrfAsync()) return BadRequest(new { message = "Invalid security token." });
        var (snapshot, error) = await OwnerSnapshotAsync("mp4", cancellationToken);
        return error ?? Ok(snapshot);
    }

    [AllowAnonymous]
    [HttpPost("invitations/story/composition")]
    [EnableRateLimiting("story-job-guest")]
    public async Task<IActionResult> GuestComposition([FromBody] GuestStoryExportRequest request,
        CancellationToken cancellationToken)
    {
        if (!await ValidCsrfAsync()) return BadRequest(new { message = "Invalid security token." });
        var (snapshot, error) = await GuestSnapshotAsync(request.Token, "mp4", cancellationToken);
        return error ?? Ok(snapshot);
    }

    [Authorize]
    [HttpPost("my/lantern/story/jobs/{action}")]
    [EnableRateLimiting("story-job-owner")]
    public async Task<IActionResult> OwnerJob(string action, [FromBody] StoryJobRequest request,
        CancellationToken cancellationToken)
    {
        if (!await ValidCsrfAsync()) return BadRequest(new { message = "Invalid security token." });
        var (snapshot, error) = await OwnerSnapshotAsync("mp4", cancellationToken);
        return error ?? await JobAsync(snapshot!, action, request.Id, cancellationToken);
    }

    [AllowAnonymous]
    [HttpPost("invitations/story/jobs/{action}")]
    [EnableRateLimiting("story-job-guest")]
    public async Task<IActionResult> GuestJob(string action, [FromBody] GuestStoryJobRequest request,
        CancellationToken cancellationToken)
    {
        if (!await ValidCsrfAsync()) return BadRequest(new { message = "Invalid security token." });
        var (snapshot, error) = await GuestSnapshotAsync(request.Token, "mp4", cancellationToken);
        return error ?? await JobAsync(snapshot!, action, request.Id, cancellationToken);
    }

    private async Task<(StoryRenderPayload?, IActionResult?)> OwnerSnapshotAsync(string format,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var ownerId))
            return (null, Unauthorized());
        var lantern = await lanternService.GetCurrentAsync(ownerId, cancellationToken);
        if (lantern is null) return (null, NotFound(new { message = "Create your parol first." }));
        return (new StoryRenderPayload("owner", lantern.DesignKey, lantern.PatternKey,
            lantern.AcceptedFriends,
            lantern.Lights.OrderBy(x => x.SlotIndex).Take(500).Select(x => x.SlotIndex).ToArray(),
            null, format), null);
    }

    private async Task<(StoryRenderPayload?, IActionResult?)> GuestSnapshotAsync(string token, string format,
        CancellationToken cancellationToken)
    {
        if (!Request.Cookies.TryGetValue("BeMyParol.Guest", out var visitorSecret) ||
            !OwnerSecrets.TryHash(visitorSecret, out var visitorHash))
            return (null, StatusCode(403, new { message = "Contribute your light before sharing your Story." }));

        InvitationPreviewDto preview;
        try { preview = await invitations.PreviewAsync(token, visitorSecret, cancellationToken); }
        catch (InvitationException ex) { return (null, StatusCode(ex.StatusCode, new { message = ex.Message })); }
        if (!preview.AlreadyContributed)
            return (null, StatusCode(403, new { message = "Contribute your light before sharing your Story." }));

        if (!InvitationPolicy.TryHash(token, out var inviteHash))
            return (null, NotFound(new { message = "Invalid invitation." }));
        var ownSlot = await database.Contributions.AsNoTracking()
            .Where(c => c.RemovedAtUtc == null &&
                c.Lantern.ShareLinks.Any(l => l.IsOfficial && l.TokenHash == inviteHash) &&
                c.GuestVisitor.TokenHash == visitorHash)
            .Select(c => (int?)c.SlotIndex)
            .FirstOrDefaultAsync(cancellationToken);
        if (ownSlot is null)
            return (null, StatusCode(403, new { message = "Your light is not available on this parol." }));

        return (new StoryRenderPayload("friend", preview.DesignKey, preview.PatternKey,
            preview.AcceptedFriends,
            preview.Lights.OrderBy(x => x.SlotIndex).Take(499).Select(x => x.SlotIndex)
                .Append(ownSlot.Value).Distinct().ToArray(),
            ownSlot, format), null);
    }

    private async Task<IActionResult> JobAsync(StoryRenderPayload snapshot, string action, string? id,
        CancellationToken cancellationToken)
    {
        if (action is not ("start" or "status" or "file" or "cancel")) return NotFound();
        if (action != "start" && !Guid.TryParse(id, out _))
            return BadRequest(new { message = "Invalid Story job identifier." });
        if (string.IsNullOrEmpty(config["StoryRenderer:SharedSecret"]))
            return StatusCode(503, new { message = "Story export is not configured on the server." });
        var rendererPath = action == "start" ? "/jobs" : "/jobs/" + action;
        try
        {
            var client = httpClientFactory.CreateClient("StoryRenderer");
            using var message = new HttpRequestMessage(HttpMethod.Post, rendererPath)
            {
                Content = JsonContent.Create(new {
                    snapshot.Kind, snapshot.DesignKey, snapshot.PatternKey,
                    snapshot.FriendCount, snapshot.Slots, snapshot.HighlightSlot,
                    snapshot.Format, Id = id
                }, options: new JsonSerializerOptions(JsonSerializerDefaults.Web))
            };
            message.Headers.Add("X-Story-Renderer-Key", config["StoryRenderer:SharedSecret"]);
            using var response = await client.SendAsync(message, HttpCompletionOption.ResponseHeadersRead,
                cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync(cancellationToken);
                logger.LogWarning("Story job {Action} returned HTTP {Status}: {Error}", action,
                    (int)response.StatusCode, error);
                return StatusCode((int)response.StatusCode, new { message = "Story job is unavailable. Try again." });
            }
            Response.Headers.CacheControl = "no-store";
            if (action == "file")
            {
                Response.ContentType = "video/mp4";
                Response.Headers["Content-Disposition"] = "attachment; filename=\"BeMyParol-Story.mp4\"";
                await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
                await stream.CopyToAsync(Response.Body, cancellationToken);
                return new EmptyResult();
            }
            Response.ContentType = "application/json";
            return Content(await response.Content.ReadAsStringAsync(cancellationToken), "application/json");
        }
        catch (HttpRequestException exception)
        {
            logger.LogWarning(exception, "Story job service unavailable");
            return StatusCode(503, new { message = "Story export service is unavailable." });
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return StatusCode(504, new { message = "Story job timed out. Try again." });
        }
    }

    private async Task<IActionResult> RenderAsync(StoryRenderPayload snapshot, CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(config["StoryRenderer:SharedSecret"]))
            return StatusCode(503, new { message = "Story export is not configured on the server." });
        try
        {
            var client = httpClientFactory.CreateClient("StoryRenderer");
            using var message = new HttpRequestMessage(HttpMethod.Post, "/render")
            {
                Content = JsonContent.Create(snapshot, options: new JsonSerializerOptions(JsonSerializerDefaults.Web))
            };
            message.Headers.Add("X-Story-Renderer-Key", config["StoryRenderer:SharedSecret"]);
            using var response = await client.SendAsync(message, HttpCompletionOption.ResponseHeadersRead,
                cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("Story renderer responded with HTTP {StatusCode}", (int)response.StatusCode);
                var description = response.StatusCode switch
                {
                    System.Net.HttpStatusCode.ServiceUnavailable => "Story renderer is busy. Retry shortly.",
                    System.Net.HttpStatusCode.Forbidden when environment.IsDevelopment() =>
                        "Story renderer credentials do not match. Restart using bash scripts/dev-with-stories.sh.",
                    _ => "Story rendering failed. Check the renderer logs."
                };
                return StatusCode(503, new { message = description });
            }
            Response.ContentType = snapshot.Format == "png" ? "image/png" : "video/mp4";
            Response.Headers.CacheControl = "no-store";
            Response.Headers["Content-Disposition"] = "attachment; filename=\"BeMyParol-Story." + snapshot.Format + "\"";
            if (response.Content.Headers.ContentLength is long length) Response.ContentLength = length;
            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            await stream.CopyToAsync(Response.Body, cancellationToken);
            return new EmptyResult();
        }
        catch (HttpRequestException exception)
        {
            logger.LogWarning(exception, "Story renderer connection failed");
            return StatusCode(503, new { message = environment.IsDevelopment()
                ? "Story renderer is offline. Stop other dev servers and run bash scripts/dev-with-stories.sh from the repository root."
                : "Story export service is unavailable." });
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            logger.LogWarning("Story rendering exceeded the configured timeout");
            return StatusCode(504, new { message = "Story export timed out. Try again later." });
        }
    }

    private async Task<bool> ValidCsrfAsync()
    {
        try { await antiforgery.ValidateRequestAsync(HttpContext); return true; }
        catch (AntiforgeryValidationException) { return false; }
    }
}
