using DecoMyLantern.Api.Models.Database;
using DecoMyLantern.Api.Services.Owner;
using Xunit;

namespace DecoMyLantern.Api.Tests;

public sealed class OwnerRecoveryPolicyTests
{
    private static readonly DateTime CreatedAt = new(2026, 10, 20, 0, 0, 0, DateTimeKind.Utc);

    private static OwnerCredential NewCredential(DateTime? expiresAt = null) => new()
    {
        CreatedAtUtc = CreatedAt,
        RecoveryHash = "original-recovery-hash",
        RecoveryExpiresAtUtc = expiresAt ?? CreatedAt.AddDays(365),
        TokenHash = "first-session"
    };

    [Fact]
    public void Original_key_can_be_reused_any_number_of_times_before_one_year()
    {
        var owner = NewCredential();
        var expiry = owner.RecoveryExpiresAtUtc;
        for (var day = 0; day < 365; day++)
        {
            var when = CreatedAt.AddDays(day);
            Assert.True(OwnerRecoveryPolicy.CanRecover(owner, when));
            OwnerRecoveryPolicy.RefreshSession(owner, "session-" + day, when);
            Assert.Equal("original-recovery-hash", owner.RecoveryHash);
            Assert.Equal(expiry, owner.RecoveryExpiresAtUtc);
            Assert.Equal(when.Add(OwnerSession.Lifetime), owner.SessionExpiresAtUtc);
        }
    }

    [Fact]
    public void Key_is_invalid_at_one_year_even_if_old_database_expiration_was_two_years()
    {
        var old = NewCredential(CreatedAt.AddDays(730));
        Assert.True(OwnerRecoveryPolicy.CanRecover(old, CreatedAt.AddDays(365).AddTicks(-1)));
        Assert.False(OwnerRecoveryPolicy.CanRecover(old, CreatedAt.AddDays(365)));
        Assert.False(OwnerRecoveryPolicy.CanRecover(old, CreatedAt.AddDays(400)));
    }

    [Fact]
    public void Earlier_expiration_stays_respected_without_renewing_the_key()
    {
        var older = NewCredential(CreatedAt.AddDays(10));
        Assert.True(OwnerRecoveryPolicy.CanRecover(older, CreatedAt.AddDays(9)));
        Assert.False(OwnerRecoveryPolicy.CanRecover(older, CreatedAt.AddDays(10)));
    }
}
