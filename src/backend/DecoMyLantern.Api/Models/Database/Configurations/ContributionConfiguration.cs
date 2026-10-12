using DecoMyLantern.Api.Models.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DecoMyLantern.Api.Models.Database.Configurations;

public sealed class ContributionConfiguration : IEntityTypeConfiguration<Contribution>
{
    public void Configure(EntityTypeBuilder<Contribution> entity)
    {
        entity.HasKey(x => x.Id);
        entity.HasIndex(x => new { x.LanternId, x.GuestVisitorId }).IsUnique();
        entity.HasIndex(x => new { x.LanternId, x.SlotIndex }).IsUnique();
        entity.Property(x => x.DisplayName).HasMaxLength(80).IsRequired();
        entity.HasOne(x => x.Lantern).WithMany(x => x.Contributions).HasForeignKey(x => x.LanternId).OnDelete(DeleteBehavior.Restrict);
        entity.HasOne(x => x.GuestVisitor).WithMany(x => x.Contributions).HasForeignKey(x => x.GuestVisitorId).OnDelete(DeleteBehavior.Restrict);
        entity.HasOne(x => x.ShareLink).WithMany(x => x.Contributions).HasForeignKey(x => x.ShareLinkId).OnDelete(DeleteBehavior.Restrict);
    }
}
public sealed class MessageConfiguration : IEntityTypeConfiguration<Message>
{
    public void Configure(EntityTypeBuilder<Message> entity)
    {
        entity.HasKey(x => x.Id);
        entity.HasIndex(x => x.ContributionId).IsUnique();
        entity.Property(x => x.Body).HasMaxLength(500).IsRequired();
        entity.HasOne(x => x.Contribution).WithOne(x => x.Message).HasForeignKey<Message>(x => x.ContributionId).OnDelete(DeleteBehavior.Restrict);
    }
}
public sealed class MessageReportConfiguration : IEntityTypeConfiguration<MessageReport>
{
    public void Configure(EntityTypeBuilder<MessageReport> entity)
    {
        entity.HasKey(x => x.Id);
        entity.Property(x => x.Reason).HasMaxLength(500).IsRequired();
        entity.Property(x => x.Status).HasMaxLength(24).IsRequired();
        entity.HasOne(x => x.Message).WithMany(x => x.Reports).HasForeignKey(x => x.MessageId).OnDelete(DeleteBehavior.Restrict);
        entity.HasOne(x => x.Reporter).WithMany().HasForeignKey(x => x.ReporterUserId).OnDelete(DeleteBehavior.Restrict);
    }
}
