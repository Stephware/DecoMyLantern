using DecoMyLantern.Api.Models.Database;
using Microsoft.EntityFrameworkCore;

namespace DecoMyLantern.Api.Repository.Designs;

public interface IDesignRepository
{
    Task<List<ParolDesign>> GetEnabledAsync(CancellationToken cancellationToken);
}

public sealed class DesignRepository(ApplicationDbContext context) : IDesignRepository
{
    public Task<List<ParolDesign>> GetEnabledAsync(CancellationToken cancellationToken) =>
        context.ParolDesigns.AsNoTracking()
            .Where(x => x.IsEnabled)
            .OrderBy(x => x.RequiredFriends)
            .ThenBy(x => x.Name)
            .ToListAsync(cancellationToken);
}
