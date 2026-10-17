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
    // Public catalog only. The API does not rely on cached counts for access.
    public async Task<IReadOnlyList<DesignDto>> GetEnabledAsync(CancellationToken cancellationToken) =>
        await cache.GetOrCreateAsync("bemyparol.public.designs.v2", async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(2);
            return (IReadOnlyList<DesignDto>)(await repository.GetEnabledAsync(cancellationToken))
                .Select(x => new DesignDto(x.DesignKey, x.Name, x.AssetKey, x.RequiredFriends))
                .OrderBy(x => x.RequiredFriends)
                .ToList();
        }) ?? [];
}
