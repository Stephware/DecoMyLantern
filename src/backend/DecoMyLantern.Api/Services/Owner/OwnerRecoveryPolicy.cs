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
        var issuedAt = credential.RecoveryIssuedAtUtc ?? credential.CreatedAtUtc;
        var firstYearDeadline = issuedAt.Add(OwnerSession.RecoveryLifetime);
        return nowUtc < firstYearDeadline && nowUtc < credential.RecoveryExpiresAtUtc;
    }

    // Updates only the cookie bearer session; the recovery hash and deadline
    // never change, including after an unlimited number of successful restores.
    public static void RefreshSession(OwnerCredential credential, string newTokenHash, DateTime nowUtc)
    {
        credential.TokenHash = newTokenHash;
        credential.SessionExpiresAtUtc = nowUtc.Add(OwnerSession.Lifetime);
    }
}
