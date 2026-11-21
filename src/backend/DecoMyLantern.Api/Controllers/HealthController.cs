using System.Net.Http.Json;
using DecoMyLantern.Api.Models.Database;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DecoMyLantern.Api.Controllers;

/// <summary>
/// Keep liveness independent of dependencies, so an unavailable renderer never
/// causes the API process to be removed from service. Readiness reports both
/// the essential SQL dependency and the optional image/video renderer.
/// </summary>
[ApiController]
[Route("api/health")]
public sealed class HealthController(
    ApplicationDbContext database,
    IHttpClientFactory clients,
    ILogger<HealthController> logger,
    ReadinessTransitionLogger transitions) : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        NoStore();
        return Ok(new { status = "ok" });
    }

    [HttpGet("ready")]
    public async Task<IActionResult> Ready(CancellationToken cancellationToken)
    {
        NoStore();
        var sql = "unavailable";
        using (var deadline = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken))
        {
            deadline.CancelAfter(TimeSpan.FromSeconds(3));
            try
            {
                if (await database.Database.CanConnectAsync(deadline.Token))
                    sql = "ready";
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { throw; }
            catch (Exception ex)
            {
                // Never put a connection string or raw exception text in public
                // health responses or routine warning logs.
                logger.LogDebug("SQL readiness probe failed (type {FailureType})", ex.GetType().Name);
            }
        }

        var renderer = "unavailable";
        using (var deadline = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken))
        {
            deadline.CancelAfter(TimeSpan.FromSeconds(2));
            try
            {
                using var response = await clients.CreateClient("StoryRenderer")
                    .GetAsync("/ready", HttpCompletionOption.ResponseHeadersRead, deadline.Token);
                if (response.IsSuccessStatusCode)
                {
                    var report = await response.Content.ReadFromJsonAsync<RendererReadyReport>(
                        cancellationToken: deadline.Token);
                    if (report?.Status is "ready" or "degraded")
                        renderer = report.Status;
                }
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { throw; }
            catch (Exception ex)
            {
                logger.LogDebug("Story renderer readiness probe failed (type {FailureType})",
                    ex.GetType().Name);
            }
        }

        // Transition-only structured logs prevent health polling from
        // flooding console output. No personal data or bearer secrets logged.
        transitions.Record(logger, sql, renderer);
        var status = sql != "ready" ? "unavailable"
            : renderer == "ready" ? "ready" : "degraded";

        // Renderer trouble is a degraded feature, not an API outage:
        // owner creation and guest contributions must remain reachable.
        return StatusCode(sql == "ready" ? StatusCodes.Status200OK
            : StatusCodes.Status503ServiceUnavailable,
            new { status, components = new { database = sql, renderer } });
    }

    private void NoStore()
    {
        Response.Headers.CacheControl = "no-store";
        Response.Headers.Pragma = "no-cache";
    }

    private sealed record RendererReadyReport(string Status);
}

/// <summary>Logs only changes in component readiness, not every poll.</summary>
public sealed class ReadinessTransitionLogger
{
    private readonly object gate = new();
    private string? previous;

    public void Record(ILogger logger, string database, string renderer)
    {
        var current = database + "/" + renderer;
        lock (gate)
        {
            if (current == previous) return;
            previous = current;
        }

        if (database != "ready")
            logger.LogError("BeMyParol readiness changed: Database={Database}, Renderer={Renderer}",
                database, renderer);
        else if (renderer != "ready")
            logger.LogWarning("BeMyParol readiness changed: Database={Database}, Renderer={Renderer}",
                database, renderer);
        else
            logger.LogInformation("BeMyParol readiness changed: Database={Database}, Renderer={Renderer}",
                database, renderer);
    }
}
