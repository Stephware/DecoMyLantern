using DecoMyLantern.Api.Models.Database;
using DecoMyLantern.Api.Models.DTOs;
using Microsoft.EntityFrameworkCore;

namespace DecoMyLantern.Api.Repository.Messages;

public interface IMessageRepository
{
    Task<Lantern?> FindOwnedLanternAsync(Guid lanternId, Guid ownerId, CancellationToken cancellationToken);
    Task<List<ChristmasLetterDto>> GetLettersAsync(Guid lanternId, bool unlocked, CancellationToken cancellationToken);
}

public sealed class MessageRepository(ApplicationDbContext context) : IMessageRepository
{
    public Task<Lantern?> FindOwnedLanternAsync(Guid lanternId, Guid ownerId, CancellationToken cancellationToken) =>
        context.Lanterns.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == lanternId && x.OwnerUserId == ownerId, cancellationToken);

    public Task<List<ChristmasLetterDto>> GetLettersAsync(Guid lanternId, bool unlocked, CancellationToken cancellationToken) =>
        context.Messages.AsNoTracking()
            .Where(x => x.Contribution.LanternId == lanternId && x.Contribution.RemovedAtUtc == null)
            .OrderBy(x => x.CreatedAtUtc)
            .Select(x => new ChristmasLetterDto(
                x.Id,
                x.Contribution.DisplayName,
                x.CreatedAtUtc,
                !unlocked,
                unlocked ? x.Body : null))
            .ToListAsync(cancellationToken);
}
