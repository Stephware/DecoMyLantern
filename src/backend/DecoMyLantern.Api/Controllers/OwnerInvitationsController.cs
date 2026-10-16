using System.Security.Claims;
using DecoMyLantern.Api.Services.Invitations;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace DecoMyLantern.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/my/lantern/invitations")]
public sealed class OwnerInvitationsController(
    IInvitationService service,
    IAntiforgery antiforgery) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken) =>
        TryOwner(out var ownerId)
            ? Ok(await service.GetLinksAsync(ownerId, cancellationToken))
            : Unauthorized();

    [HttpPost]
    [EnableRateLimiting("invitation-create")]
    public async Task<IActionResult> Create(CancellationToken cancellationToken)
    {
        if (!TryOwner(out var ownerId)) return Unauthorized();
        if (!await ValidateCsrfAsync()) return BadRequest(new { message = "Invalid request token. Refresh and retry." });
        try
        {
            // Return the secret once; SQL persists the hash, never the plaintext.
            return Ok(await service.CreateLinkAsync(ownerId, cancellationToken));
        }
        catch (InvitationException ex) { return StatusCode(ex.StatusCode, new { message = ex.Message }); }
    }

    [HttpDelete("{linkId:guid}")]
    public async Task<IActionResult> Revoke(Guid linkId, CancellationToken cancellationToken)
    {
        if (!TryOwner(out var ownerId)) return Unauthorized();
        if (!await ValidateCsrfAsync()) return BadRequest(new { message = "Invalid request token. Refresh and retry." });
        try
        {
            await service.RevokeLinkAsync(ownerId, linkId, cancellationToken);
            return NoContent();
        }
        catch (InvitationException ex) { return StatusCode(ex.StatusCode, new { message = ex.Message }); }
    }

    private bool TryOwner(out Guid ownerId) =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out ownerId);

    private async Task<bool> ValidateCsrfAsync()
    {
        try { await antiforgery.ValidateRequestAsync(HttpContext); return true; }
        catch (AntiforgeryValidationException) { return false; }
    }
}
