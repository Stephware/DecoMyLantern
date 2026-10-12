using DecoMyLantern.Api.Services.GrowthStages;
using Microsoft.AspNetCore.Mvc;

namespace DecoMyLantern.Api.Controllers;

[ApiController]
[Route("api/growth-stages")]
public sealed class GrowthStagesController(IGrowthStageService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken) =>
        Ok(await service.GetStagesAsync(cancellationToken));
}
