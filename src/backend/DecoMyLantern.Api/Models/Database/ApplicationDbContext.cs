using DecoMyLantern.Api.Models.Database;
using DecoMyLantern.Api.Services.Shared;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace DecoMyLantern.Api.Models.Database;

public sealed class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : IdentityDbContext<ApplicationUser, Microsoft.AspNetCore.Identity.IdentityRole<Guid>, Guid>(options)
{
    public DbSet<Lantern> Lanterns => Set<Lantern>();
    public DbSet<OwnerCredential> OwnerCredentials => Set<OwnerCredential>();
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
            new ParolDesign { Id = Guid.Parse("c54deae0-8e9c-4a63-ae19-88989b0f3011"), DesignKey = DesignConstants.DesignKeys.Classic, Name = "Classic Gold", AssetKey = "classic", RequiredFriends = 0 },
            new ParolDesign { Id = Guid.Parse("c54deae0-8e9c-4a63-ae19-88989b0f3012"), DesignKey = DesignConstants.DesignKeys.Floral, Name = "Floral Bloom", AssetKey = "floral", RequiredFriends = 3 },
            new ParolDesign { Id = Guid.Parse("c54deae0-8e9c-4a63-ae19-88989b0f3013"), DesignKey = DesignConstants.DesignKeys.Festival, Name = "Festival Lights", AssetKey = "festival", RequiredFriends = 10 },
            new ParolDesign { Id = Guid.Parse("c54deae0-8e9c-4a63-ae19-88989b0f3014"), DesignKey = DesignConstants.DesignKeys.Celestial, Name = "Celestial Lace", AssetKey = "celestial", RequiredFriends = 23 },
            new ParolDesign { Id = Guid.Parse("c54deae0-8e9c-4a63-ae19-88989b0f3015"), DesignKey = DesignConstants.DesignKeys.Fiesta, Name = "Radiant Fiesta", AssetKey = "fiesta", RequiredFriends = 40 },
            new ParolDesign { Id = Guid.Parse("c54deae0-8e9c-4a63-ae19-88989b0f3016"), DesignKey = DesignConstants.DesignKeys.Sampaguita, Name = "Sampaguita Glow", AssetKey = "sampaguita", RequiredFriends = 50 }
        );
        builder.Entity<GrowthStage>().HasData(
            new GrowthStage { Id = 1, StageKey = DesignConstants.DesignKeys.Classic, Name = "Classic Gold", RequiredFriends = 0, SortOrder = 1 },
            new GrowthStage { Id = 2, StageKey = DesignConstants.DesignKeys.Floral, Name = "Floral Bloom", RequiredFriends = 3, SortOrder = 2 },
            new GrowthStage { Id = 3, StageKey = DesignConstants.DesignKeys.Festival, Name = "Festival Lights", RequiredFriends = 10, SortOrder = 3 },
            new GrowthStage { Id = 4, StageKey = DesignConstants.DesignKeys.Celestial, Name = "Celestial Lace", RequiredFriends = 23, SortOrder = 4 },
            new GrowthStage { Id = 5, StageKey = DesignConstants.DesignKeys.Fiesta, Name = "Radiant Fiesta", RequiredFriends = 40, SortOrder = 5 },
            new GrowthStage { Id = 6, StageKey = DesignConstants.DesignKeys.Sampaguita, Name = "Sampaguita Glow", RequiredFriends = 50, SortOrder = 6 }
        );
    }
}
