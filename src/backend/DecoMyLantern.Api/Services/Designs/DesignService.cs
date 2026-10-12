using DecoMyLantern.Api.Models.DTOs;
using DecoMyLantern.Api.Repository.Designs;

namespace DecoMyLantern.Api.Services.Designs;

public interface IDesignService
{
    Task<IReadOnlyList<DesignDto>> GetEnabledAsync(CancellationToken cancellationToken);
}

public sealed class DesignService(IDesignRepository repository) : IDesignService
{
    public async Task<IReadOnlyList<DesignDto>> GetEnabledAsync(CancellationToken cancellationToken) =>
        (await repository.GetEnabledAsync(cancellationToken))
            .Select(x => new DesignDto(x.DesignKey, x.Name, x.AssetKey, x.RequiredFriends))
            .ToList();
}
