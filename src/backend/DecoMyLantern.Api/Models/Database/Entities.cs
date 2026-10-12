using Microsoft.AspNetCore.Identity;

namespace DecoMyLantern.Api.Models.Database;

public sealed class ApplicationUser : IdentityUser<Guid>
{
    public ICollection<Lantern> Lanterns { get; set; } = new List<Lantern>();
}

public sealed class Lantern
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OwnerUserId { get; set; }
    public ApplicationUser Owner { get; set; } = null!;
    public int SeasonYear { get; set; }
    public Guid SelectedDesignId { get; set; }
    public ParolDesign SelectedDesign { get; set; } = null!;
    public string PaletteKey { get; set; } = "classic";
    public string PatternKey { get; set; } = "default";
    public int NextSlotIndex { get; set; }
    public DateTime UnlockAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public byte[] RowVersion { get; set; } = [];
    public ICollection<ShareLink> ShareLinks { get; set; } = new List<ShareLink>();
    public ICollection<Contribution> Contributions { get; set; } = new List<Contribution>();
}

public sealed class ParolDesign
{
    public Guid Id { get; set; }
    public string DesignKey { get; set; } = "";
    public string Name { get; set; } = "";
    public string AssetKey { get; set; } = "";
    public int RequiredFriends { get; set; }
    public bool IsEnabled { get; set; } = true;
}

public sealed class GrowthStage
{
    public int Id { get; set; }
    public string StageKey { get; set; } = "";
    public string Name { get; set; } = "";
    public int RequiredFriends { get; set; }
    public int SortOrder { get; set; }
}

public sealed class ShareLink
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid LanternId { get; set; }
    public Lantern Lantern { get; set; } = null!;
    public string TokenHash { get; set; } = "";
    public DateTime? ExpiresAtUtc { get; set; }
    public DateTime? RevokedAtUtc { get; set; }
    public ICollection<Contribution> Contributions { get; set; } = new List<Contribution>();
}

public sealed class GuestVisitor
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string TokenHash { get; set; } = "";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public ICollection<Contribution> Contributions { get; set; } = new List<Contribution>();
}

public sealed class Contribution
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid LanternId { get; set; }
    public Lantern Lantern { get; set; } = null!;
    public Guid GuestVisitorId { get; set; }
    public GuestVisitor GuestVisitor { get; set; } = null!;
    public Guid ShareLinkId { get; set; }
    public ShareLink ShareLink { get; set; } = null!;
    public string DisplayName { get; set; } = "";
    public int SlotIndex { get; set; }
    public DateTime AcceptedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? RemovedAtUtc { get; set; }
    public Message? Message { get; set; }
}

public sealed class Message
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ContributionId { get; set; }
    public Contribution Contribution { get; set; } = null!;
    public string Body { get; set; } = "";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? OpenedAtUtc { get; set; }
    public ICollection<MessageReport> Reports { get; set; } = new List<MessageReport>();
}

public sealed class MessageReport
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MessageId { get; set; }
    public Message Message { get; set; } = null!;
    public Guid ReporterUserId { get; set; }
    public ApplicationUser Reporter { get; set; } = null!;
    public string Reason { get; set; } = "";
    public string Status { get; set; } = "Open";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
