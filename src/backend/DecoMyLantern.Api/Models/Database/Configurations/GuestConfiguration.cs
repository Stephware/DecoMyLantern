using DecoMyLantern.Api.Models.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DecoMyLantern.Api.Models.Database.Configurations;

public sealed class GuestConfiguration : IEntityTypeConfiguration<GuestVisitor>
{
    public void Configure(EntityTypeBuilder<GuestVisitor> entity)
    {
        entity.HasKey(x => x.Id);
        entity.HasIndex(x => x.TokenHash).IsUnique();
        entity.Property(x => x.TokenHash).HasMaxLength(64).IsRequired().IsUnicode(false);
    }
}
public sealed class ShareLinkConfiguration : IEntityTypeConfiguration<ShareLink>
{
    public void Configure(EntityTypeBuilder<ShareLink> entity)
    {
        entity.HasKey(x => x.Id);
        entity.HasIndex(x => x.TokenHash).IsUnique();
        entity.Property(x => x.TokenHash).HasMaxLength(64).IsRequired().IsUnicode(false);
        entity.HasOne(x => x.Lantern).WithMany(x => x.ShareLinks).HasForeignKey(x => x.LanternId).OnDelete(DeleteBehavior.Restrict);
    }
}
