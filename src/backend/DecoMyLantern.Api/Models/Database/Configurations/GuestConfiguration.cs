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
        entity.HasIndex(x => x.LanternId).IsUnique().HasFilter("[IsOfficial] = 1");
        entity.Property(x => x.TokenHash).HasMaxLength(64).IsRequired().IsUnicode(false);
        entity.Property(x => x.EncryptedToken).HasMaxLength(128).IsUnicode(false);
        entity.HasOne(x => x.Lantern).WithMany(x => x.ShareLinks).HasForeignKey(x => x.LanternId).OnDelete(DeleteBehavior.Restrict);
    }
}
