using DecoMyLantern.Api.Models.Database;
using DecoMyLantern.Api.Models.DTOs;
using DecoMyLantern.Api.Repository.Messages;
using DecoMyLantern.Api.Services.Messages;
using Xunit;

namespace DecoMyLantern.Api.Tests;

public sealed class AdminMessageAccessTests
{
    private static readonly DateTime BeforeChristmas = new(2026, 10, 31, 0, 0, 0, DateTimeKind.Utc);
    private static readonly DateTime UnlockAt = ChristmasUnlockPolicy.UnlockUtcForSeason(2026);

    [Theory]
    [InlineData(false, false)]
    [InlineData(true, true)]
    public async Task Only_admin_parol_can_read_own_message_bodies_early(bool isAdmin, bool expectedUnlocked)
    {
        var ownerId = Guid.NewGuid();
        var lanternId = Guid.NewGuid();
        var repository = new FakeRepository(new Lantern
        {
            Id = lanternId, OwnerUserId = ownerId, IsAdmin = isAdmin, UnlockAtUtc = UnlockAt
        });
        var inbox = await new MessageService(repository).GetInboxAsync(lanternId, ownerId, BeforeChristmas, default);

        Assert.NotNull(inbox);
        Assert.Equal(expectedUnlocked, inbox.Unlocked);
        // An admin can test early without changing when Christmas actually arrives.
        Assert.False(inbox.ChristmasDayReached);
        Assert.Equal(expectedUnlocked ? "private test message" : null, inbox.Messages.Single().Body);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Server_marks_actual_christmas_midnight_for_admin_and_regular_owners(bool isAdmin)
    {
        var ownerId = Guid.NewGuid();
        var lanternId = Guid.NewGuid();
        var repository = new FakeRepository(new Lantern
        {
            Id = lanternId, OwnerUserId = ownerId, IsAdmin = isAdmin, UnlockAtUtc = UnlockAt
        });
        var before = await new MessageService(repository).GetInboxAsync(
            lanternId, ownerId, UnlockAt.AddTicks(-1), default);
        Assert.NotNull(before);
        Assert.False(before.ChristmasDayReached);
        Assert.Equal(isAdmin, before.Unlocked);

        var after = await new MessageService(repository).GetInboxAsync(
            lanternId, ownerId, UnlockAt, default);
        Assert.NotNull(after);
        Assert.True(after.ChristmasDayReached);
        Assert.True(after.Unlocked);
        Assert.Equal("private test message", after.Messages.Single().Body);
    }

    [Fact]
    public async Task Admin_parol_cannot_read_another_parols_messages()
    {
        var repository = new FakeRepository(new Lantern
        {
            Id = Guid.NewGuid(), OwnerUserId = Guid.NewGuid(), IsAdmin = true, UnlockAtUtc = UnlockAt
        });
        var inbox = await new MessageService(repository).GetInboxAsync(repository.Lantern.Id, Guid.NewGuid(), BeforeChristmas, default);

        Assert.Null(inbox);
        Assert.False(repository.LettersRequested);
    }

    private sealed class FakeRepository(Lantern lantern) : IMessageRepository
    {
        public Lantern Lantern { get; } = lantern;
        public bool LettersRequested { get; private set; }

        public Task<Lantern?> FindOwnedLanternAsync(Guid lanternId, Guid ownerId, CancellationToken cancellationToken) =>
            Task.FromResult<Lantern?>(Lantern.Id == lanternId && Lantern.OwnerUserId == ownerId ? Lantern : null);

        public Task<List<ChristmasLetterDto>> GetLettersAsync(Guid lanternId, bool unlocked, CancellationToken cancellationToken)
        {
            LettersRequested = true;
            return Task.FromResult(new List<ChristmasLetterDto>
            {
                new(Guid.NewGuid(), "Test friend", BeforeChristmas, !unlocked, unlocked ? "private test message" : null)
            });
        }
    }
}
