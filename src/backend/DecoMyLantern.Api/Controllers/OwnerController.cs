using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using DecoMyLantern.Api.Services.Owner;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace DecoMyLantern.Api.Controllers;

public sealed class RecoverOwnerRequest
{
    [Required, MaxLength(128)]
    public string RecoveryCode { get; init; } = "";
}

[ApiController]
[Route("api/owner")]
public sealed class OwnerController(
    IOwnerAccessService access,
    IAntiforgery antiforgery,
    IHostEnvironment environment) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet("csrf")]
    public IActionResult Csrf()
    {
        NoStore();
        return Ok(new { token = antiforgery.GetAndStoreTokens(HttpContext).RequestToken });
    }

    [Authorize]
    [HttpGet("me")]
    public IActionResult Me()
    {
        NoStore();
        return TryOwner(out var id) ? Ok(new { id }) : Unauthorized();
    }

    [AllowAnonymous]
    [EnableRateLimiting("owner-create")]
    [HttpPost("create")]
    public async Task<IActionResult> Create(CancellationToken cancellationToken)
    {
        if (!await ValidCsrfAsync()) return BadRequest(new { message = "Invalid security token. Refresh and try again." });
        if (User.Identity?.IsAuthenticated == true)
            return Conflict(new { message = "This browser already owns a parol. Open your dashboard instead." });
        NoStore();
        try
        {
            var issued = await access.CreateAsync(cancellationToken);
            SetCookie(issued);
            return Created("/api/my/lantern", new { owner = new { id = issued.OwnerId }, recoveryCode = issued.RecoveryCode });
        }
        catch (OwnerAccessException ex) { return StatusCode(ex.StatusCode, new { message = ex.Message }); }
    }

    [AllowAnonymous]
    [EnableRateLimiting("owner-recover")]
    [HttpPost("recover")]
    public async Task<IActionResult> Recover([FromBody] RecoverOwnerRequest request, CancellationToken cancellationToken)
    {
        if (!await ValidCsrfAsync()) return BadRequest(new { message = "Invalid security token. Refresh and try again." });
        NoStore();
        try
        {
            var issued = await access.RecoverAsync(request.RecoveryCode.Trim(), cancellationToken);
            SetCookie(issued);
            return Ok(new { owner = new { id = issued.OwnerId }, recoveryCode = issued.RecoveryCode });
        }
        catch (OwnerAccessException ex) { return StatusCode(ex.StatusCode, new { message = ex.Message }); }
    }

    // Transitional support for existing signed-in hosts. No new email/password
    // registration or login route remains available.
    [Authorize(Policy = OwnerSession.LegacyUpgradePolicy)]
    [HttpGet("legacy-csrf")]
    public IActionResult LegacyCsrf()
    {
        NoStore();
        return Ok(new { token = antiforgery.GetAndStoreTokens(HttpContext).RequestToken });
    }

    [Authorize(Policy = OwnerSession.LegacyUpgradePolicy)]
    [HttpGet("legacy-available")]
    public IActionResult LegacyAvailable()
    {
        NoStore();
        return TryOwner(out _) ? Ok(new { available = true }) : Unauthorized();
    }

    [Authorize(Policy = OwnerSession.LegacyUpgradePolicy)]
    [EnableRateLimiting("owner-recover")]
    [HttpPost("upgrade-legacy")]
    public async Task<IActionResult> UpgradeLegacy(CancellationToken cancellationToken)
    {
        if (!await ValidCsrfAsync()) return BadRequest(new { message = "Invalid security token. Refresh and try again." });
        if (!TryOwner(out var id)) return Unauthorized();
        NoStore();
        try
        {
            var issued = await access.UpgradeLegacyAsync(id, cancellationToken);
            SetCookie(issued);
            Response.Cookies.Delete("Deco.Host", new CookieOptions { Path = "/" });
            return Ok(new { owner = new { id = issued.OwnerId }, recoveryCode = issued.RecoveryCode });
        }
        catch (OwnerAccessException ex) { return StatusCode(ex.StatusCode, new { message = ex.Message }); }
    }

    [Authorize]
    [HttpPost("recovery-code")]
    public async Task<IActionResult> RotateRecovery(CancellationToken cancellationToken)
    {
        if (!await ValidCsrfAsync()) return BadRequest(new { message = "Invalid security token. Refresh and try again." });
        if (!TryOwner(out var id)) return Unauthorized();
        NoStore();
        try
        {
            var code = await access.RotateRecoveryAsync(id, cancellationToken);
            return Ok(new { recoveryCode = code });
        }
        catch (OwnerAccessException ex) { return StatusCode(ex.StatusCode, new { message = ex.Message }); }
    }

    [Authorize]
    [HttpPost("finish-setup")]
    public async Task<IActionResult> FinishSetup(CancellationToken cancellationToken)
    {
        if (!await ValidCsrfAsync()) return BadRequest(new { message = "Invalid security token. Refresh and try again." });
        if (!TryOwner(out var id)) return Unauthorized();
        NoStore();
        try
        {
            await access.FinishSetupAsync(id, cancellationToken);
            return NoContent();
        }
        catch (OwnerAccessException ex) { return StatusCode(ex.StatusCode, new { message = ex.Message }); }
    }

    [Authorize]
    [HttpPost("cancel-creation")]
    public async Task<IActionResult> CancelCreation(CancellationToken cancellationToken)
    {
        if (!await ValidCsrfAsync()) return BadRequest(new { message = "Invalid security token. Refresh and try again." });
        if (!TryOwner(out var id)) return Unauthorized();
        NoStore();
        try
        {
            await access.CancelCreationAsync(id, cancellationToken);
            ClearOwnerCookie();
            return NoContent();
        }
        catch (OwnerAccessException ex) { return StatusCode(ex.StatusCode, new { message = ex.Message }); }
    }

    [Authorize]
    [HttpPost("sign-out")]
    public async Task<IActionResult> SignOut(CancellationToken cancellationToken)
    {
        if (!await ValidCsrfAsync()) return BadRequest(new { message = "Invalid security token. Refresh and try again." });
        if (!TryOwner(out var id)) return Unauthorized();
        NoStore();
        try
        {
            await access.SignOutAsync(id, cancellationToken);
            ClearOwnerCookie();
            return NoContent();
        }
        catch (OwnerAccessException ex) { return StatusCode(ex.StatusCode, new { message = ex.Message }); }
    }

    private void SetCookie(IssuedOwnerAccess issued) =>
        Response.Cookies.Append(OwnerSession.Cookie, issued.Token,
            OwnerSession.CookieOptions(HttpContext, environment, issued.ExpiresAtUtc));

    private void ClearOwnerCookie() =>
        Response.Cookies.Delete(OwnerSession.Cookie, new CookieOptions
        {
            Path = "/api",
            Secure = !environment.IsDevelopment() || HttpContext.Request.IsHttps,
            SameSite = SameSiteMode.Strict,
            HttpOnly = true
        });

    private bool TryOwner(out Guid ownerId) =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out ownerId);

    private void NoStore()
    {
        Response.Headers.CacheControl = "no-store";
        Response.Headers.Pragma = "no-cache";
    }

    private async Task<bool> ValidCsrfAsync()
    {
        try { await antiforgery.ValidateRequestAsync(HttpContext); return true; }
        catch (AntiforgeryValidationException) { return false; }
    }
}
