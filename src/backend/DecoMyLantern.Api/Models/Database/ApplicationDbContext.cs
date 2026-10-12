using DecoMyLantern.Api.Models.Database;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace DecoMyLantern.Api.Models.Database;

public sealed class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : IdentityDbContext<ApplicationUser, Microsoft.AspNetCore.Identity.IdentityRole<Guid>, Guid>(options)
{
    public DbSet<Lantern> Lanterns => Set<Lantern>();
    public DbSet<ParolDesign> ParolDesigns => Set<ParolDesign>();
    public DbSet<GrowthStage> GrowthStages => Set<GrowthStage>();
    public DbSet<ShareLink> ShareLinks => Set<ShareLink>();
    public DbSet<GuestVisitor> GuestVisitors => Set<GuestVisitor>();
    public DbSet<Contribution> Contributions => Set<Contribution>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<MessageReport> MessageReports => Set<MessageReport>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);

        builder.Entity<ParolDesign>().HasData(
            new ParolDesign { Id = Guid.Parse("c54deae0-8e9c-4a63-ae19-88989b0f3011"), DesignKey = "classic", Name = "Classic Gold", AssetKey = "classic", RequiredFriends = 0 },
            new ParolDesign { Id = Guid.Parse("c54deae0-8e9c-4a63-ae19-88989b0f3012"), DesignKey = "floral", Name = "Floral Bloom", AssetKey = "floral", RequiredFriends = 5 },
            new ParolDesign { Id = Guid.Parse("c54deae0-8e9c-4a63-ae19-88989b0f3013"), DesignKey = "festival", Name = "Festival Lights", AssetKey = "festival", RequiredFriends = 15 }
        );
        builder.Entity<GrowthStage>().HasData(
            new GrowthStage { Id = 1, StageKey = "base", Name = "First Light", RequiredFriends = 0, SortOrder = 1 },
            new GrowthStage { Id = 2, StageKey = "enhanced", Name = "Glowing Star", RequiredFriends = 5, SortOrder = 2 },
            new GrowthStage { Id = 3, StageKey = "radiant", Name = "Radiant Parol", RequiredFriends = 15, SortOrder = 3 },
            new GrowthStage { Id = 4, StageKey = "grand", Name = "Grand Parol", RequiredFriends = 30, SortOrder = 4 }
        );
    }
}
