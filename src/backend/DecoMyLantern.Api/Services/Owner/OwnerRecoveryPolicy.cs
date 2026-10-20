using DecoMyLantern.Api.Models.Database;

namespace DecoMyLantern.Api.Services.Owner;

/// <summary>
/// Recovery keys can be redeemed repeatedly during a fixed one-year window.
/// Older credentials also obey the new deadline without changing their hashes.
/// </summary>
public static class OwnerRecoveryPolicy
{
    public static bool CanRecover(OwnerCredential credential, DateTime nowUtc)
    {
        var firstYearDeadline = credential.CreatedAtUtc.Add(OwnerSession.RecoveryLifetime);
        return nowUtc < firstYearDeadline && nowUtc < credential.RecoveryExpiresAtUtc;
    }
}
