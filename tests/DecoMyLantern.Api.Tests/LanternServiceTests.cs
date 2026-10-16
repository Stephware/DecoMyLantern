using DecoMyLantern.Api.Models.Database;
using DecoMyLantern.Api.Models.DTOs;
using DecoMyLantern.Api.Repository.Lanterns;
using DecoMyLantern.Api.Services.Lanterns;
using Xunit;

namespace DecoMyLantern.Api.Tests;

public sealed class LanternServiceTests
{
    [Theory]
    [InlineData("2026-12-31T15:59:59Z", 2026)]
    [InlineData("2026-12-31T16:00:00Z", 2027)]
    public void Season_uses_Philippine_time(string instant, int expected) =>
        Assert.Equal(expected, LanternPolicy.SeasonFor(DateTime.Parse(instant).ToUniversalTime()));

    [Fact]
    public async Task Host_can_create_only_one_lantern_in_current_season()
    {
        var repository = new FakeRepository();
        var service = new LanternService(repository, TimeProvider.System);
        var ownerId = Guid.NewGuid();

        var created = await service.CreateAsync(ownerId, CancellationToken.None);
        Assert.Equal("classic", created.DesignKey);
        Assert.Equal(0, created.AcceptedFriends);

        var duplicate = await Assert.ThrowsAsync<LanternOperationException>(() => service.CreateAsync(ownerId, CancellationToken.None));
        Assert.Equal(409, duplicate.StatusCode);

        var otherOwner = await service.CreateAsync(Guid.NewGuid(), CancellationToken.None);
        Assert.NotEqual(created.Id, otherOwner.Id);
    }

    [Fact]
    public async Task Owner_can_select_every_enabled_design_with_zero_friends()
    {
        var repository = new FakeRepository();
        var service = new LanternService(repository, TimeProvider.System);
        var ownerId = Guid.NewGuid();
        await service.CreateAsync(ownerId, CancellationToken.None);

        // Old seeded RequiredFriends values must never restrict design selection.
        foreach (var key in new[] { "floral", "festival", "classic" })
        {
            var updated = await service.UpdateAsync(ownerId,
                new UpdateLanternRequest { DesignKey = key, PatternKey = "rings" }, CancellationToken.None);
            Assert.Equal(key, updated.DesignKey);
            Assert.Equal("rings", updated.PatternKey);
            Assert.Equal("base", updated.GrowthStage);
            Assert.Equal(0, updated.AcceptedFriends);
        }

        repository.AcceptedCount = 6;
        var growing = await service.GetCurrentAsync(ownerId, CancellationToken.None);
        Assert.NotNull(growing);
        Assert.Equal("details", growing.GrowthStage);
        Assert.Equal(6, growing.AcceptedFriends);
    }

    [Fact]
    public async Task Unauthorized_owner_cannot_get_or_update_another_hosts_lantern()
    {
        var repository = new FakeRepository();
        var service = new LanternService(repository, TimeProvider.System);
        await service.CreateAsync(Guid.NewGuid(), CancellationToken.None);
        var stranger = Guid.NewGuid();

        Assert.Null(await service.GetCurrentAsync(stranger, CancellationToken.None));
        var exception = await Assert.ThrowsAsync<LanternOperationException>(() =>
            service.UpdateAsync(stranger, new UpdateLanternRequest { DesignKey = "classic", PatternKey = "rings" }, CancellationToken.None));
        Assert.Equal(404, exception.StatusCode);
    }

    [Fact]
    public async Task Rejects_invalid_pattern()
    {
        var repository = new FakeRepository();
        var service = new LanternService(repository, TimeProvider.System);
        var ownerId = Guid.NewGuid();
        await service.CreateAsync(ownerId, CancellationToken.None);

        var exception = await Assert.ThrowsAsync<LanternOperationException>(() =>
            service.UpdateAsync(ownerId, new UpdateLanternRequest { DesignKey = "classic", PatternKey = "random" }, CancellationToken.None));
        Assert.Equal(400, exception.StatusCode);
    }

    [Theory]
    [InlineData(0, "base")]
    [InlineData(1, "lights")]
    [InlineData(5, "lights")]
    [InlineData(6, "details")]
    [InlineData(15, "details")]
    [InlineData(16, "fuller")]
    [InlineData(30, "fuller")]
    [InlineData(31, "grand")]
    [InlineData(49, "grand")]
    [InlineData(50, "grand")]
    [InlineData(51, "grand")]
    public async Task Owner_lantern_response_includes_all_active_friends_without_a_50_cap(
        int acceptedFriends, string expectedStage)
    {
        var repository = new FakeRepository { AcceptedCount = acceptedFriends };
        var service = new LanternService(repository, TimeProvider.System);
        var ownerId = Guid.NewGuid();
        await service.CreateAsync(ownerId, CancellationToken.None);

        var lantern = await service.GetCurrentAsync(ownerId, CancellationToken.None);
        Assert.NotNull(lantern);
        Assert.Equal(acceptedFriends, lantern.AcceptedFriends);
        Assert.Equal(expectedStage, lantern.GrowthStage);
        Assert.Equal(acceptedFriends, lantern.Lights.Count);
        Assert.Equal(Enumerable.Range(0, acceptedFriends), lantern.Lights.Select(x => x.SlotIndex));
    }

    [Fact]
    public async Task Fifty_sparsely_numbered_friend_slots_remain_unchanged_in_response()
    {
        var expected = Enumerable.Range(0, 50).Select(i => i * 2).ToArray();
        var repository = new FakeRepository { SlotIndexes = expected };
        var service = new LanternService(repository, TimeProvider.System);
        var ownerId = Guid.NewGuid();
        await service.CreateAsync(ownerId, CancellationToken.None);

        var lantern = await service.GetCurrentAsync(ownerId, CancellationToken.None);
        Assert.NotNull(lantern);
        Assert.Equal(50, lantern.AcceptedFriends);
        Assert.Equal("grand", lantern.GrowthStage);
        Assert.Equal(expected, lantern.Lights.Select(x => x.SlotIndex));
    }

    [Fact]
    public async Task Returns_each_persisted_contribution_slot_without_renumbering()
    {
        var repository = new FakeRepository { SlotIndexes = [0, 8, 21] };
        var service = new LanternService(repository, TimeProvider.System);
        var ownerId = Guid.NewGuid();
        await service.CreateAsync(ownerId, CancellationToken.None);

        var lantern = await service.GetCurrentAsync(ownerId, CancellationToken.None);
        Assert.NotNull(lantern);
        Assert.Equal(3, lantern.AcceptedFriends);
        Assert.Equal(new[] { 0, 8, 21 }, lantern.Lights.Select(light => light.SlotIndex));
        Assert.Equal("lights", lantern.GrowthStage);

        var saved = await service.UpdateAsync(ownerId,
            new UpdateLanternRequest { DesignKey = "classic", PatternKey = "rings" }, CancellationToken.None);
        Assert.Equal(new[] { 0, 8, 21 }, saved.Lights.Select(light => light.SlotIndex));
    }

    private sealed class FakeRepository : ILanternRepository
    {
        private readonly List<Lantern> lanterns = [];
        private readonly List<ParolDesign> designs =
        [
            new ParolDesign { Id = Guid.NewGuid(), DesignKey = "classic", Name = "Classic Gold", IsEnabled = true, RequiredFriends = 0 },
            new ParolDesign { Id = Guid.NewGuid(), DesignKey = "floral", Name = "Floral Bloom", IsEnabled = true, RequiredFriends = 5 },
            new ParolDesign { Id = Guid.NewGuid(), DesignKey = "festival", Name = "Festival Lights", IsEnabled = true, RequiredFriends = 15 }
        ];

        public int AcceptedCount { get; set; }
        public int[]? SlotIndexes { get; set; }

        public Task<Lantern?> FindByOwnerAndSeasonAsync(Guid ownerId, int year, CancellationToken cancellationToken) =>
            Task.FromResult(lanterns.FirstOrDefault(lantern => lantern.OwnerUserId == ownerId && lantern.SeasonYear == year));

        public Task<ParolDesign?> FindEnabledDesignAsync(string key, CancellationToken cancellationToken) =>
            Task.FromResult(designs.FirstOrDefault(design => design.DesignKey == key && design.IsEnabled));

        public Task<IReadOnlyList<DecoMyLantern.Api.Models.DTOs.ContributionLightDto>> GetAcceptedLightsAsync(Guid lanternId, CancellationToken cancellationToken)
        {
            IReadOnlyList<DecoMyLantern.Api.Models.DTOs.ContributionLightDto> lights = (SlotIndexes ?? Enumerable.Range(0, AcceptedCount).ToArray())
                .Select(index => new DecoMyLantern.Api.Models.DTOs.ContributionLightDto(Guid.NewGuid(), index, $"Friend {index + 1}"))
                .ToList();
            return Task.FromResult(lights);
        }

        public void Add(Lantern lantern) => lanterns.Add(lantern);

        public Task SaveChangesAsync(CancellationToken cancellationToken) => Task.CompletedTask;
    }
}
