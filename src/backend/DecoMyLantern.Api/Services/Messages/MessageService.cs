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
        var unlocked = lantern.IsAdmin || ChristmasUnlockPolicy.CanRead(utcNow, lantern.UnlockAtUtc);
        var letters = await repository.GetLettersAsync(lanternId, unlocked, cancellationToken);
        return new ChristmasInboxDto(unlocked, lantern.UnlockAtUtc, letters);
    }
}
