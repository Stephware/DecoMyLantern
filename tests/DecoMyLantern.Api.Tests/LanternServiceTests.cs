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
    public async Task Each_design_requires_its_friend_milestone_and_retains_valid_selection()
    {
        var repository = new FakeRepository();
        var service = new LanternService(repository, TimeProvider.System);
        var ownerId = Guid.NewGuid();
        await service.CreateAsync(ownerId, CancellationToken.None);

        // A direct API update must not bypass the design gallery's lock.
        var locked = await Assert.ThrowsAsync<LanternOperationException>(() =>
            service.UpdateAsync(ownerId,
                new UpdateLanternRequest { DesignKey = "floral", PatternKey = "rings" },
                CancellationToken.None));
        Assert.Equal(409, locked.StatusCode);

        foreach (var (friends, key) in new[] {
            (0, "classic"), (3, "floral"), (10, "festival"),
            (23, "celestial"), (40, "fiesta"), (50, "sampaguita")
        })
        {
            repository.AcceptedCount = friends;
            var updated = await service.UpdateAsync(ownerId,
                new UpdateLanternRequest { DesignKey = key, PatternKey = "rings" },
                CancellationToken.None);
            Assert.Equal(key, updated.DesignKey);
            Assert.Equal(friends, updated.AcceptedFriends);
        }

        repository.AcceptedCount = 0;
        // Existing selections are grandfathered, including when old lights are removed.
        var preserved = await service.UpdateAsync(ownerId,
            new UpdateLanternRequest { DesignKey = "sampaguita", PatternKey = "rays" },
            CancellationToken.None);
        Assert.Equal("sampaguita", preserved.DesignKey);
        Assert.Equal("rays", preserved.PatternKey);
    }

    [Fact]
    public async Task NextSlotIndex_keeps_a_design_unlocked_after_a_light_is_removed()
    {
        var repository = new FakeRepository { AcceptedCount = 40, ReachedCount = 40 };
        var service = new LanternService(repository, TimeProvider.System);
        var ownerId = Guid.NewGuid();
        await service.CreateAsync(ownerId, CancellationToken.None);
        repository.AcceptedCount = 1;

        var unlocked = await service.UpdateAsync(ownerId,
            new UpdateLanternRequest { DesignKey = "fiesta", PatternKey = "default" },
            CancellationToken.None);
        Assert.Equal("fiesta", unlocked.DesignKey);
        Assert.Equal(40, unlocked.MaxReachedFriends);
        Assert.Equal(1, unlocked.AcceptedFriends);
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
    [InlineData(1, "base")]
    [InlineData(2, "base")]
    [InlineData(3, "floral")]
    [InlineData(9, "floral")]
    [InlineData(10, "festival")]
    [InlineData(22, "festival")]
    [InlineData(23, "celestial")]
    [InlineData(39, "celestial")]
    [InlineData(40, "fiesta")]
    [InlineData(49, "fiesta")]
    [InlineData(50, "sampaguita")]
    [InlineData(51, "sampaguita")]
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
        Assert.Equal("sampaguita", lantern.GrowthStage);
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
        Assert.Equal("floral", lantern.GrowthStage);

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
            new ParolDesign { Id = Guid.NewGuid(), DesignKey = "floral", Name = "Floral Bloom", IsEnabled = true, RequiredFriends = 3 },
            new ParolDesign { Id = Guid.NewGuid(), DesignKey = "festival", Name = "Festival Lights", IsEnabled = true, RequiredFriends = 10 },
            new ParolDesign { Id = Guid.NewGuid(), DesignKey = "celestial", Name = "Celestial Lace", IsEnabled = true, RequiredFriends = 23 },
            new ParolDesign { Id = Guid.NewGuid(), DesignKey = "fiesta", Name = "Radiant Fiesta", IsEnabled = true, RequiredFriends = 40 },
            new ParolDesign { Id = Guid.NewGuid(), DesignKey = "sampaguita", Name = "Sampaguita Glow", IsEnabled = true, RequiredFriends = 50 }
        ];

        public int AcceptedCount { get; set; }
        public int ReachedCount { get; set; }
        public int[]? SlotIndexes { get; set; }

        public Task<Lantern?> FindByOwnerAndSeasonAsync(Guid ownerId, int year, CancellationToken cancellationToken) =>
            Task.FromResult<Lantern?>(lanterns.FirstOrDefault(lantern => lantern.OwnerUserId == ownerId && lantern.SeasonYear == year) is { } found
                ? ApplyReachedCount(found)
                : null);

        private Lantern ApplyReachedCount(Lantern lantern)
        {
            lantern.NextSlotIndex = Math.Max(lantern.NextSlotIndex, ReachedCount);
            return lantern;
        }

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
