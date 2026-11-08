namespace DecoMyLantern.Api.Services.Shared;

/// <summary>
/// Configuration options for a single rate limit policy.
/// </summary>
public sealed class RateLimitPolicyOptions
{
    /// <summary>Maximum number of requests allowed in the time window.</summary>
    public int PermitLimit { get; init; }

    /// <summary>Window duration in hours (mutually exclusive with WindowMinutes).</summary>
    public int? WindowHours { get; init; }

    /// <summary>Window duration in minutes (mutually exclusive with WindowHours).</summary>
    public int? WindowMinutes { get; init; }

    /// <summary>Gets the time window as a TimeSpan.</summary>
    public TimeSpan Window =>
        WindowHours.HasValue ? TimeSpan.FromHours(WindowHours.Value)
        : WindowMinutes.HasValue ? TimeSpan.FromMinutes(WindowMinutes.Value)
        : TimeSpan.FromHours(1); // Default fallback

    /// <summary>Queue limit for the rate limiter (0 = no queue).</summary>
    public int QueueLimit { get; init; } = 0;

    /// <summary>Whether the limiter should auto-replenish permits.</summary>
    public bool AutoReplenishment { get; init; } = true;
}

/// <summary>
/// All rate limit policies configuration.
/// </summary>
public sealed class RateLimitsOptions
{
    public RateLimitPolicyOptions OwnerCreate { get; init; } = new() { PermitLimit = 6, WindowHours = 1 };
    public RateLimitPolicyOptions InvitationCreate { get; init; } = new() { PermitLimit = 120, WindowHours = 1 };
    public RateLimitPolicyOptions InvitationPreview { get; init; } = new() { PermitLimit = 120, WindowMinutes = 1 };
    public RateLimitPolicyOptions InvitationContribute { get; init; } = new() { PermitLimit = 80, WindowMinutes = 15 };
    public RateLimitPolicyOptions DesignShowcase { get; init; } = new() { PermitLimit = 36, WindowMinutes = 10 };
    public RateLimitPolicyOptions ParolImageOwner { get; init; } = new() { PermitLimit = 60, WindowMinutes = 10 };
    public RateLimitPolicyOptions ParolImageGuest { get; init; } = new() { PermitLimit = 60, WindowMinutes = 10 };
    public RateLimitPolicyOptions StoryOwner { get; init; } = new() { PermitLimit = 10, WindowHours = 1 };
    public RateLimitPolicyOptions StoryVideoStatus { get; init; } = new() { PermitLimit = 100, WindowMinutes = 1 };
    public RateLimitPolicyOptions StoryVideoDownload { get; init; } = new() { PermitLimit = 30, WindowHours = 1 };
    public RateLimitPolicyOptions StoryGuest { get; init; } = new() { PermitLimit = 12, WindowHours = 1 };
    public RateLimitPolicyOptions OwnerRecoveryDisplay { get; init; } = new() { PermitLimit = 18, WindowHours = 1 };
    public RateLimitPolicyOptions OwnerRecoveryReplace { get; init; } = new() { PermitLimit = 3, WindowHours = 1 };
    public RateLimitPolicyOptions GuestVisitorCreate { get; init; } = new() { PermitLimit = 20, WindowHours = 1 };
    public RateLimitPolicyOptions OwnerRecover { get; init; } = new() { PermitLimit = 3, WindowMinutes = 15 };
}