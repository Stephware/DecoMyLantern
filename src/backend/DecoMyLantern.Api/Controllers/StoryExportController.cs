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
    IAntiforgery antiforgery) : ControllerBase
{
    [Authorize]
    [HttpPost("my/lantern/story")]
    [EnableRateLimiting("story-owner")]
    public async Task<IActionResult> OwnerStory([FromBody] StoryExportRequest request,
        CancellationToken cancellationToken)
    {
        if (!await ValidCsrfAsync()) return BadRequest(new { message = "Invalid security token." });
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var ownerId))
            return Unauthorized();
        var lantern = await lanternService.GetCurrentAsync(ownerId, cancellationToken);
        if (lantern is null) return NotFound(new { message = "Create your parol first." });
        var snapshot = new StoryRenderPayload("owner", lantern.DesignKey, lantern.PatternKey,
            lantern.AcceptedFriends,
            lantern.Lights.OrderBy(x => x.SlotIndex).Take(500).Select(x => x.SlotIndex).ToArray(),
            null, request.Format);
        return await RenderAsync(snapshot, cancellationToken);
    }

    [AllowAnonymous]
    [HttpPost("invitations/story")]
    [EnableRateLimiting("story-guest")]
    public async Task<IActionResult> GuestStory([FromBody] GuestStoryExportRequest request,
        CancellationToken cancellationToken)
    {
        if (!await ValidCsrfAsync()) return BadRequest(new { message = "Invalid security token." });
        if (!Request.Cookies.TryGetValue("BeMyParol.Guest", out var visitorSecret) ||
            !OwnerSecrets.TryHash(visitorSecret, out var visitorHash))
            return StatusCode(403, new { message = "Contribute your light before sharing your Story." });

        InvitationPreviewDto preview;
        try { preview = await invitations.PreviewAsync(request.Token, visitorSecret, cancellationToken); }
        catch (InvitationException ex) { return StatusCode(ex.StatusCode, new { message = ex.Message }); }
        if (!preview.AlreadyContributed)
            return StatusCode(403, new { message = "Contribute your light before sharing your Story." });

        if (!InvitationPolicy.TryHash(request.Token, out var inviteHash))
            return NotFound(new { message = "Invalid invitation." });
        var ownSlot = await database.Contributions.AsNoTracking()
            .Where(c => c.RemovedAtUtc == null &&
                c.Lantern.ShareLinks.Any(l => l.IsOfficial && l.TokenHash == inviteHash) &&
                c.GuestVisitor.TokenHash == visitorHash)
            .Select(c => (int?)c.SlotIndex)
            .FirstOrDefaultAsync(cancellationToken);
        if (ownSlot is null)
            return StatusCode(403, new { message = "Your light is not available on this parol." });

        var snapshot = new StoryRenderPayload("friend", preview.DesignKey, preview.PatternKey,
            preview.AcceptedFriends,
            preview.Lights.OrderBy(x => x.SlotIndex).Take(499).Select(x => x.SlotIndex)
                .Append(ownSlot.Value).Distinct().ToArray(),
            ownSlot, request.Format);
        return await RenderAsync(snapshot, cancellationToken);
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
                return StatusCode(503, new { message = response.StatusCode == System.Net.HttpStatusCode.ServiceUnavailable
                    ? "Story renderer is busy. Try again shortly."
                    : "Story export is temporarily unavailable." });
            Response.ContentType = snapshot.Format == "png" ? "image/png" : "video/mp4";
            Response.Headers.CacheControl = "no-store";
            Response.Headers["Content-Disposition"] = "attachment; filename=\"BeMyParol-Story." + snapshot.Format + "\"";
            if (response.Content.Headers.ContentLength is long length) Response.ContentLength = length;
            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            await stream.CopyToAsync(Response.Body, cancellationToken);
            return new EmptyResult();
        }
        catch (HttpRequestException) { return StatusCode(503, new { message = "Story export service is unavailable." }); }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        { return StatusCode(504, new { message = "Story export timed out." }); }
    }

    private async Task<bool> ValidCsrfAsync()
    {
        try { await antiforgery.ValidateRequestAsync(HttpContext); return true; }
        catch (AntiforgeryValidationException) { return false; }
    }
}
