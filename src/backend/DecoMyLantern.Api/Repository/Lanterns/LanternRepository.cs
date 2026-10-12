using DecoMyLantern.Api.Models.Database;
using Microsoft.EntityFrameworkCore;

namespace DecoMyLantern.Api.Repository.Lanterns;

public interface ILanternRepository
{
    Task<Lantern?> FindByOwnerAndSeasonAsync(Guid ownerId, int seasonYear, CancellationToken cancellationToken);
    Task<ParolDesign?> FindEnabledDesignAsync(string designKey, CancellationToken cancellationToken);
    Task<int> CountAcceptedContributionsAsync(Guid lanternId, CancellationToken cancellationToken);
    void Add(Lantern lantern);
    Task SaveChangesAsync(CancellationToken cancellationToken);
}

public sealed class LanternRepository(ApplicationDbContext context) : ILanternRepository
{
    public Task<Lantern?> FindByOwnerAndSeasonAsync(Guid ownerId, int seasonYear, CancellationToken cancellationToken) =>
        context.Lanterns
            .Include(lantern => lantern.SelectedDesign)
            .FirstOrDefaultAsync(lantern => lantern.OwnerUserId == ownerId && lantern.SeasonYear == seasonYear, cancellationToken);

    public Task<ParolDesign?> FindEnabledDesignAsync(string designKey, CancellationToken cancellationToken) =>
        context.ParolDesigns.FirstOrDefaultAsync(design => design.DesignKey == designKey && design.IsEnabled, cancellationToken);

    public Task<int> CountAcceptedContributionsAsync(Guid lanternId, CancellationToken cancellationToken) =>
        context.Contributions.CountAsync(contribution => contribution.LanternId == lanternId && contribution.RemovedAtUtc == null, cancellationToken);

    public void Add(Lantern lantern) => context.Lanterns.Add(lantern);

    public async Task SaveChangesAsync(CancellationToken cancellationToken) =>
        await context.SaveChangesAsync(cancellationToken);
}
