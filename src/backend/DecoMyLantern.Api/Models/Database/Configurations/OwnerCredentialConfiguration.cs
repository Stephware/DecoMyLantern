using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DecoMyLantern.Api.Models.Database.Configurations;

public sealed class OwnerCredentialConfiguration : IEntityTypeConfiguration<OwnerCredential>
{
    public void Configure(EntityTypeBuilder<OwnerCredential> entity)
    {
        entity.ToTable("OwnerCredentials");
        entity.HasKey(x => x.OwnerUserId);
        entity.HasOne(x => x.Owner).WithOne().HasForeignKey<OwnerCredential>(x => x.OwnerUserId)
            .OnDelete(DeleteBehavior.Restrict);
        entity.Property(x => x.TokenHash).IsRequired().HasMaxLength(64).IsUnicode(false);
        entity.Property(x => x.RecoveryHash).IsRequired().HasMaxLength(64).IsUnicode(false);
        entity.Property(x => x.EncryptedRecoveryCode).HasMaxLength(160).IsUnicode(false);
        entity.Property(x => x.RowVersion).IsRowVersion();
        entity.HasIndex(x => x.TokenHash).IsUnique();
        entity.HasIndex(x => x.RecoveryHash).IsUnique();
    }
}
