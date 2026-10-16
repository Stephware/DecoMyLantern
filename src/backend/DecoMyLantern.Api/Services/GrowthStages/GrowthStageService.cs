using DecoMyLantern.Api.Models.DTOs;
using DecoMyLantern.Api.Repository.GrowthStages;
using Microsoft.Extensions.Caching.Memory;

namespace DecoMyLantern.Api.Services.GrowthStages;

public interface IGrowthStageService
{
    Task<IReadOnlyList<GrowthStageDto>> GetStagesAsync(CancellationToken cancellationToken);
}

public sealed class GrowthStageService(IGrowthStageRepository repository, IMemoryCache cache) : IGrowthStageService
{
    public async Task<IReadOnlyList<GrowthStageDto>> GetStagesAsync(CancellationToken cancellationToken) =>
        await cache.GetOrCreateAsync("bemyparol.public.growth-stages.v1", async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(2);
            return (IReadOnlyList<GrowthStageDto>)(await repository.GetAllAsync(cancellationToken))
                .Select(x => new GrowthStageDto(x.StageKey, x.Name, x.RequiredFriends))
                .ToList();
        }) ?? [];
}
