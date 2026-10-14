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

    [Theory]
    [InlineData(0, 5)]
    [InlineData(5, 15)]
    [InlineData(15, 30)]
    [InlineData(30, null)]
    public void Next_milestone_uses_friend_thresholds(int friends, int? expected) =>
        Assert.Equal(expected, LanternPolicy.NextMilestone(friends));

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
    public async Task Owner_cannot_select_locked_design_but_can_save_available_pattern()
    {
        var repository = new FakeRepository();
        var service = new LanternService(repository, TimeProvider.System);
        var ownerId = Guid.NewGuid();
        await service.CreateAsync(ownerId, CancellationToken.None);

        var blocked = await Assert.ThrowsAsync<LanternOperationException>(() =>
            service.UpdateAsync(ownerId, new UpdateLanternRequest { DesignKey = "floral", PatternKey = "rings" }, CancellationToken.None));
        Assert.Equal(403, blocked.StatusCode);

        var updated = await service.UpdateAsync(ownerId,
            new UpdateLanternRequest { DesignKey = "classic", PatternKey = "rays" }, CancellationToken.None);
        Assert.Equal("rays", updated.PatternKey);

        repository.AcceptedCount = 5;
        var unlocked = await service.UpdateAsync(ownerId,
            new UpdateLanternRequest { DesignKey = "floral", PatternKey = "rings" }, CancellationToken.None);
        Assert.Equal("floral", unlocked.DesignKey);
        Assert.Equal("rings", unlocked.PatternKey);
        Assert.Equal("enhanced", unlocked.GrowthStage);
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

    private sealed class FakeRepository : ILanternRepository
    {
        private readonly List<Lantern> lanterns = [];
        private readonly List<ParolDesign> designs =
        [
            new ParolDesign { Id = Guid.NewGuid(), DesignKey = "classic", Name = "Classic Gold", IsEnabled = true, RequiredFriends = 0 },
            new ParolDesign { Id = Guid.NewGuid(), DesignKey = "floral", Name = "Floral Bloom", IsEnabled = true, RequiredFriends = 5 }
        ];

        public int AcceptedCount { get; set; }

        public Task<Lantern?> FindByOwnerAndSeasonAsync(Guid ownerId, int year, CancellationToken cancellationToken) =>
            Task.FromResult(lanterns.FirstOrDefault(lantern => lantern.OwnerUserId == ownerId && lantern.SeasonYear == year));

        public Task<ParolDesign?> FindEnabledDesignAsync(string key, CancellationToken cancellationToken) =>
            Task.FromResult(designs.FirstOrDefault(design => design.DesignKey == key && design.IsEnabled));

        public Task<IReadOnlyList<DecoMyLantern.Api.Models.DTOs.ContributionLightDto>> GetAcceptedLightsAsync(Guid lanternId, CancellationToken cancellationToken)
        {
            IReadOnlyList<DecoMyLantern.Api.Models.DTOs.ContributionLightDto> lights = Enumerable.Range(0, AcceptedCount)
                .Select(index => new DecoMyLantern.Api.Models.DTOs.ContributionLightDto(Guid.NewGuid(), index, $"Friend {index + 1}"))
                .ToList();
            return Task.FromResult(lights);
        }

        public void Add(Lantern lantern) => lanterns.Add(lantern);

        public Task SaveChangesAsync(CancellationToken cancellationToken) => Task.CompletedTask;
    }
}
