using System.Security.Claims;
using DecoMyLantern.Api.Services.Messages;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DecoMyLantern.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/my/lanterns/{lanternId:guid}/messages")]
public sealed class MessagesController(IMessageService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(Guid lanternId, CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userId, out var ownerId)) return Unauthorized();

        var inbox = await service.GetInboxAsync(lanternId, ownerId, DateTime.UtcNow, cancellationToken);
        return inbox is null ? NotFound() : Ok(inbox);
    }
}
