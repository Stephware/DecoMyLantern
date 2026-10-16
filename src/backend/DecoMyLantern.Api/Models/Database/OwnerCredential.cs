namespace DecoMyLantern.Api.Models.Database;

/// <summary>
/// One revocable, passwordless owner session and recovery secret per internal owner.
/// Only SHA-256 hashes of 256-bit random secrets are ever persisted.
/// </summary>
public sealed class OwnerCredential
{
    public Guid OwnerUserId { get; set; }
    public ApplicationUser Owner { get; set; } = null!;
    public string TokenHash { get; set; } = "";
    public string RecoveryHash { get; set; } = "";
    public DateTime CreatedAtUtc { get; set; }
    public DateTime SessionExpiresAtUtc { get; set; }
    public DateTime RecoveryExpiresAtUtc { get; set; }
    public byte[] RowVersion { get; set; } = [];
}
