using DecoMyLantern.Api.Models.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DecoMyLantern.Api.Models.Database.Configurations;

public sealed class LanternConfiguration : IEntityTypeConfiguration<Lantern>
{
    public void Configure(EntityTypeBuilder<Lantern> entity)
    {
        entity.HasKey(x => x.Id);
        entity.HasIndex(x => new { x.OwnerUserId, x.SeasonYear }).IsUnique();
        entity.Property(x => x.PaletteKey).HasMaxLength(60).IsRequired();
        entity.Property(x => x.PatternKey).HasMaxLength(60).IsRequired();
        entity.Property(x => x.RowVersion).IsRowVersion();
        entity.HasOne(x => x.Owner).WithMany(u => u.Lanterns).HasForeignKey(x => x.OwnerUserId).OnDelete(DeleteBehavior.Restrict);
        entity.HasOne(x => x.SelectedDesign).WithMany().HasForeignKey(x => x.SelectedDesignId).OnDelete(DeleteBehavior.Restrict);
    }
}
