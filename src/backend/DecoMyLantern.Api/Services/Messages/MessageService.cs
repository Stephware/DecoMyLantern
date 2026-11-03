using DecoMyLantern.Api.Models.DTOs;
using DecoMyLantern.Api.Repository.Messages;

namespace DecoMyLantern.Api.Services.Messages;

public interface IMessageService
{
    Task<ChristmasInboxDto?> GetInboxAsync(Guid lanternId, Guid ownerId, DateTime utcNow, CancellationToken cancellationToken);
}

public sealed class MessageService(IMessageRepository repository) : IMessageService
{
    public async Task<ChristmasInboxDto?> GetInboxAsync(
        Guid lanternId, Guid ownerId, DateTime utcNow, CancellationToken cancellationToken)
    {
        var lantern = await repository.FindOwnedLanternAsync(lanternId, ownerId, cancellationToken);
        if (lantern is null) return null;
        // Separating the true Christmas timestamp from admin early access
        // prevents ordinary visitors from seeing a pre-Christmas reveal.
        var christmasDayReached = ChristmasUnlockPolicy.CanRead(utcNow, lantern.UnlockAtUtc);
        var unlocked = lantern.IsAdmin || christmasDayReached;
        // Before Christmas, normal owners need only the sealed-inbox status.
        // Avoid selecting contributor names and thousands of letter records
        // on every dashboard visit until the server really unlocks them.
        var letters = unlocked
            ? await repository.GetLettersAsync(lanternId, true, cancellationToken)
            : [];
        return new ChristmasInboxDto(unlocked, lantern.UnlockAtUtc, letters, christmasDayReached);
    }
}
