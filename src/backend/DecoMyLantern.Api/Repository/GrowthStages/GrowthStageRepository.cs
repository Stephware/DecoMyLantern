using DecoMyLantern.Api.Models.Database;
using Microsoft.EntityFrameworkCore;

namespace DecoMyLantern.Api.Repository.GrowthStages;

public interface IGrowthStageRepository
{
    Task<List<GrowthStage>> GetAllAsync(CancellationToken cancellationToken);
}

public sealed class GrowthStageRepository(ApplicationDbContext context) : IGrowthStageRepository
{
    public Task<List<GrowthStage>> GetAllAsync(CancellationToken cancellationToken) =>
        context.GrowthStages.AsNoTracking()
            .OrderBy(x => x.SortOrder)
            .ToListAsync(cancellationToken);
}
