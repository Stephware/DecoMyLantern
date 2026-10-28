using System.Net;
using System.Net.Http.Json;
using DecoMyLantern.Api.Services.Designs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace DecoMyLantern.Api.Controllers;

/// <summary>
/// Public, generic 50-friend design previews. No owner's parol, invitation
/// token or private contribution data is ever read or returned here.
/// </summary>
[ApiController]
[Route("api/designs")]
public sealed class DesignShowcaseController(
    IDesignService designs,
    IHttpClientFactory clients,
    IConfiguration configuration,
    ILogger<DesignShowcaseController> logger) : ControllerBase
{
    [HttpGet("{designKey}/showcase")]
    [EnableRateLimiting("design-showcase")]
    public async Task<IActionResult> GetShowcase(string designKey, CancellationToken cancellationToken)
    {
        if (designKey.Length > 40) return NotFound();
        var enabled = await designs.GetEnabledAsync(cancellationToken);
        var selected = enabled.FirstOrDefault(d =>
            string.Equals(d.DesignKey, designKey, StringComparison.OrdinalIgnoreCase));
        if (selected is null) return NotFound(new { message = "Design not found." });

        var secret = configuration["StoryRenderer:SharedSecret"];
        if (string.IsNullOrWhiteSpace(secret))
            return StatusCode(503, new { message = "Preview service is not configured." });

        // Fixed, synthetic full-bloom preview: NEVER mutate real contribution data.
        var payload = new {
            designKey = selected.DesignKey,
            patternKey = "default",
            friendCount = 50,
            slots = Enumerable.Range(0, 50).ToArray(),
            format = "webp"
        };

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, "/render-parol") {
                Content = JsonContent.Create(payload)
            };
            request.Headers.Add("X-Story-Renderer-Key", secret);
            var client = clients.CreateClient("StoryRenderer");
            using var response = await client.SendAsync(request,
                HttpCompletionOption.ResponseHeadersRead, cancellationToken);

            if (response.StatusCode == HttpStatusCode.ServiceUnavailable) {
                Response.Headers["Retry-After"] = "3";
                return StatusCode(503, new { message = "Preview is preparing. Please retry." });
            }
            if (!response.IsSuccessStatusCode) {
                logger.LogWarning("Design preview renderer returned {Status}", response.StatusCode);
                return StatusCode(503, new { message = "Preview is temporarily unavailable." });
            }

            const long maximumBytes = 12 * 1024 * 1024;
            if (response.Content.Headers.ContentLength is > maximumBytes)
                return StatusCode(503, new { message = "Preview exceeds size limit." });
            var bytes = await response.Content.ReadAsByteArrayAsync(cancellationToken);
            if (bytes.LongLength > maximumBytes)
                return StatusCode(503, new { message = "Preview exceeds size limit." });

            Response.Headers.CacheControl = "public, max-age=86400";
            return File(bytes, "image/webp");
        }
        catch (HttpRequestException ex) {
            logger.LogWarning(ex, "Unable to reach private design preview renderer");
            Response.Headers["Retry-After"] = "3";
            return StatusCode(503, new { message = "Preview renderer is unavailable." });
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested) {
            return StatusCode(504, new { message = "Preview timed out." });
        }
    }
}
