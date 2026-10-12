using DecoMyLantern.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DecoMyLantern.Api.Infrastructure.Persistence.Configurations;

public sealed class DesignConfiguration : IEntityTypeConfiguration<ParolDesign>
{
    public void Configure(EntityTypeBuilder<ParolDesign> entity)
    {
        entity.HasKey(x => x.Id);
        entity.HasIndex(x => x.DesignKey).IsUnique();
        entity.Property(x => x.DesignKey).HasMaxLength(64).IsRequired();
        entity.Property(x => x.Name).HasMaxLength(120).IsRequired();
        entity.Property(x => x.AssetKey).HasMaxLength(120).IsRequired();
    }
}

public sealed class GrowthStageConfiguration : IEntityTypeConfiguration<GrowthStage>
{
    public void Configure(EntityTypeBuilder<GrowthStage> entity)
    {
        entity.HasKey(x => x.Id);
        entity.HasIndex(x => x.StageKey).IsUnique();
        entity.HasIndex(x => x.RequiredFriends).IsUnique();
        entity.Property(x => x.StageKey).HasMaxLength(64).IsRequired();
        entity.Property(x => x.Name).HasMaxLength(120).IsRequired();
    }
}
