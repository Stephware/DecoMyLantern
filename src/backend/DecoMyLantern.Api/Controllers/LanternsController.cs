using DecoMyLantern.Api.Models.DTOs;
using DecoMyLantern.Api.Services.Lanterns;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace DecoMyLantern.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/my/lantern")]
public sealed class LanternsController(ILanternService service, IAntiforgery antiforgery) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var ownerId)) return Unauthorized();
        var lantern = await service.GetCurrentAsync(ownerId, cancellationToken);
        return lantern is null ? NotFound(new { message = "No lantern created for this season." }) : Ok(lantern);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var ownerId)) return Unauthorized();
        if (!await ValidCsrfAsync()) return BadRequest(new { message = "Invalid request token. Refresh and try again." });
        try
        {
            var lantern = await service.CreateAsync(ownerId, cancellationToken);
            return Created("/api/my/lantern", lantern);
        }
        catch (LanternOperationException exception)
        {
            return StatusCode(exception.StatusCode, new { message = exception.Message });
        }
    }

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] UpdateLanternRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var ownerId)) return Unauthorized();
        if (!await ValidCsrfAsync()) return BadRequest(new { message = "Invalid request token. Refresh and try again." });
        try
        {
            return Ok(await service.UpdateAsync(ownerId, request, cancellationToken));
        }
        catch (LanternOperationException exception)
        {
            return StatusCode(exception.StatusCode, new { message = exception.Message });
        }
    }

    private bool TryGetUserId(out Guid userId) =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out userId);

    private async Task<bool> ValidCsrfAsync()
    {
        try
        {
            await antiforgery.ValidateRequestAsync(HttpContext);
            return true;
        }
        catch (AntiforgeryValidationException)
        {
            return false;
        }
    }
}
