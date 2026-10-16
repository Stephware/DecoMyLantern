using DecoMyLantern.Api.Models.DTOs;
using DecoMyLantern.Api.Services.Invitations;
using DecoMyLantern.Api.Services.Owner;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace DecoMyLantern.Api.Controllers;

// Guests never receive owner tokens, owner IDs, private messages, or their
// visitor secret in JSON. Invitation secrets are submitted in POST bodies,
// not API paths or query strings.
[AllowAnonymous]
[ApiController]
[Route("api/invitations")]
public sealed class GuestInvitationsController(
    IInvitationService service,
    IAntiforgery antiforgery,
    IHostEnvironment environment) : ControllerBase
{
    private const string VisitorCookie = "BeMyParol.Guest";
    private static readonly TimeSpan VisitorLifetime = TimeSpan.FromDays(400);

    [HttpGet("csrf")]
    public IActionResult Csrf()
    {
        NoStore();
        EnsureGuestToken();
        return Ok(new { token = antiforgery.GetAndStoreTokens(HttpContext).RequestToken });
    }

    [HttpPost("preview")]
    [EnableRateLimiting("invitation-preview")]
    public async Task<IActionResult> Preview(
        [FromBody] InvitationTokenRequest request, CancellationToken cancellationToken)
    {
        if (!await ValidateCsrfAsync()) return BadRequest(new { message = "Refresh the invitation and try again." });
        NoStore();
        try
        {
            var guest = Request.Cookies.TryGetValue(VisitorCookie, out var token) ? token : null;
            return Ok(await service.PreviewAsync(request.Token, guest, cancellationToken));
        }
        catch (InvitationException ex) { return StatusCode(ex.StatusCode, new { message = ex.Message }); }
    }

    [HttpPost("contribute")]
    [EnableRateLimiting("invitation-contribute")]
    public async Task<IActionResult> Contribute(
        [FromBody] GuestContributionRequest request, CancellationToken cancellationToken)
    {
        if (!await ValidateCsrfAsync()) return BadRequest(new { message = "Refresh the invitation and try again." });
        if (User.Identity?.IsAuthenticated == true)
            return Conflict(new { message = "Open your friends' invitation in a separate guest browser to contribute." });

        NoStore();
        if (!Request.Cookies.TryGetValue(VisitorCookie, out var visitorToken) ||
            !OwnerSecrets.TryHash(visitorToken, out _))
            return BadRequest(new { message = "Refresh this invitation to establish your guest session." });

        try
        {
            var result = await service.ContributeAsync(request, visitorToken, cancellationToken);
            return Created("/api/invitations/preview", result);
        }
        catch (InvitationException ex) { return StatusCode(ex.StatusCode, new { message = ex.Message }); }
    }

    private void EnsureGuestToken()
    {
        if (Request.Cookies.TryGetValue(VisitorCookie, out var existing) &&
            OwnerSecrets.TryHash(existing, out _)) return;

        Response.Cookies.Append(VisitorCookie, OwnerSecrets.Generate(), new CookieOptions
        {
            Path = "/api",
            HttpOnly = true,
            SameSite = SameSiteMode.Strict,
            Secure = !environment.IsDevelopment() || Request.IsHttps,
            IsEssential = true,
            Expires = DateTimeOffset.UtcNow.Add(VisitorLifetime)
        });
    }

    private void NoStore()
    {
        Response.Headers.CacheControl = "no-store";
        Response.Headers.Pragma = "no-cache";
        Response.Headers["Referrer-Policy"] = "no-referrer";
    }

    private async Task<bool> ValidateCsrfAsync()
    {
        try { await antiforgery.ValidateRequestAsync(HttpContext); return true; }
        catch (AntiforgeryValidationException) { return false; }
    }
}
