using DecoMyLantern.Api.Services.Designs;
using Microsoft.AspNetCore.Mvc;

namespace DecoMyLantern.Api.Controllers;

[ApiController]
[Route("api/designs")]
public sealed class DesignsController(IDesignService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken) =>
        Ok(await service.GetEnabledAsync(cancellationToken));
}
