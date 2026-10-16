using DecoMyLantern.Api.Models.DTOs;
using DecoMyLantern.Api.Repository.Designs;
using Microsoft.Extensions.Caching.Memory;

namespace DecoMyLantern.Api.Services.Designs;

public interface IDesignService
{
    Task<IReadOnlyList<DesignDto>> GetEnabledAsync(CancellationToken cancellationToken);
}

public sealed class DesignService(IDesignRepository repository, IMemoryCache cache) : IDesignService
{
    // Cache only public, non-sensitive catalog content. Owner authentication
    // always checks the database; an in-memory cache is NOT an access token.
    public async Task<IReadOnlyList<DesignDto>> GetEnabledAsync(CancellationToken cancellationToken) =>
        await cache.GetOrCreateAsync("bemyparol.public.designs.v1", async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(2);
            return (IReadOnlyList<DesignDto>)(await repository.GetEnabledAsync(cancellationToken))
                .Select(x => new DesignDto(x.DesignKey, x.Name, x.AssetKey))
                .ToList();
        }) ?? [];
}
