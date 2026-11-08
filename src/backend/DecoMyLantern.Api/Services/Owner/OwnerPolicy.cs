namespace DecoMyLantern.Api.Services.Owner;

/// <summary>
/// Centralized policy constants for owner session and recovery lifetimes.
/// </summary>
public static class OwnerPolicy
{
    /// <summary>The lifetime of an owner session (400 days).</summary>
    public static readonly TimeSpan SessionLifetime = TimeSpan.FromDays(400);

    /// <summary>The recovery lifetime window (365 days).</summary>
    public static readonly TimeSpan RecoveryLifetime = TimeSpan.FromDays(365);
}