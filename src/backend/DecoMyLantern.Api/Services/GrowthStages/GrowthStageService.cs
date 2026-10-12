using DecoMyLantern.Api.Models.DTOs;
using DecoMyLantern.Api.Repository.GrowthStages;

namespace DecoMyLantern.Api.Services.GrowthStages;

public interface IGrowthStageService
{
    Task<IReadOnlyList<GrowthStageDto>> GetStagesAsync(CancellationToken cancellationToken);
}

public sealed class GrowthStageService(IGrowthStageRepository repository) : IGrowthStageService
{
    public async Task<IReadOnlyList<GrowthStageDto>> GetStagesAsync(CancellationToken cancellationToken) =>
        (await repository.GetAllAsync(cancellationToken))
            .Select(x => new GrowthStageDto(x.StageKey, x.Name, x.RequiredFriends))
            .ToList();
}
