using System;

namespace DecoMyLantern.Api.Models;

/// <summary>
/// Configuration settings for rate limiting policies.
/// All values are per-IP or per-user (where applicable) and use fixed window partitioning.
/// </summary>
public class RateLimitSettings
{
    /// <summary>
    /// Maximum number of owner creation attempts allowed per window.
    /// Limits brute-force attempts to create owner accounts.
    /// </summary>
    public int OwnerCreatePermitLimit { get; set; } = 6;

    /// <summary>
    /// Time window (in hours) for owner create rate limit.
    /// </summary>
    public int OwnerCreateWindowHours { get; set; } = 1;

    /// <summary>
    /// Maximum number of invitation creation attempts allowed per window.
    /// Limits rapid invitation creation that could indicate spam.
    /// </summary>
    public int InvitationCreatePermitLimit { get; set; } = 120;

    /// <summary>
    /// Time window (in hours) for invitation create rate limit.
    /// </summary>
    public int InvitationCreateWindowHours { get; set; } = 1;

    /// <summary>
    /// Maximum number of invitation preview attempts allowed per window.
    /// Limits preview requests that could be used for enumeration.
    /// </summary>
    public int InvitationPreviewPermitLimit { get; set; } = 120;

    /// <summary>
    /// Time window (in minutes) for invitation preview rate limit.
    /// </summary>
    public int InvitationPreviewWindowMinutes { get; set; } = 1;

    /// <summary>
    /// Maximum number of invitation contribute attempts allowed per window.
    /// Limits collaborative editing contributions to prevent abuse.
    /// </summary>
    public int InvitationContributePermitLimit { get; set; } = 80;

    /// <summary>
    /// Time window (in minutes) for invitation contribute rate limit.
    /// </summary>
    public int InvitationContributeWindowMinutes { get; set; } = 15;

    /// <summary>
    /// Maximum number of design showcase requests allowed per window.
    /// Snapshot requests are read-only but render images cold-start expensive.
    /// </summary>
    public int DesignShowcasePermitLimit { get; set; } = 36;

    /// <summary>
    /// Time window (in minutes) for design showcase rate limit.
    /// </summary>
    public int DesignShowcaseWindowMinutes { get; set; } = 10;

    /// <summary>
    /// Maximum number of parol image requests allowed per window for owner.
    /// Owner requests may access private letter renders.
    /// </summary>
    public int ParolImageOwnerPermitLimit { get; set; } = 60;

    /// <summary>
    /// Time window (in minutes) for parol image owner rate limit.
    /// </summary>
    public int ParolImageOwnerWindowMinutes { get; set; } = 10;

    /// <summary>
    /// Maximum number of parol image requests allowed per window for guest.
    /// Guest requests access public letter renders.
    /// </summary>
    public int ParolImageGuestPermitLimit { get; set; } = 60;

    /// <summary>
    /// Time window (in minutes) for parol image guest rate limit.
    /// </summary>
    public int ParolImageGuestWindowMinutes { get; set; } = 10;

    /// <summary>
    /// Maximum number of story requests allowed per window for owner.
    /// Owner stories may contain private content.
    /// </summary>
    public int StoryOwnerPermitLimit { get; set; } = 10;

    /// <summary>
    /// Time window (in hours) for story owner rate limit.
    /// </summary>
    public int StoryOwnerWindowHours { get; set; } = 1;

    /// <summary>
    /// Maximum number of story video status checks allowed per window.
    /// Polling and downloading completed owner videos require a valid owner session;
    /// separate limits prevent status checks from spending render quota.
    /// </summary>
    public int StoryVideoStatusPermitLimit { get; set; } = 100;

    /// <summary>
    /// Time window (in minutes) for story video status rate limit.
    /// </summary>
    public int StoryVideoStatusWindowMinutes { get; set; } = 1;

    /// <summary>
    /// Maximum number of story video downloads allowed per window.
    /// Downloading completed owner videos requires a valid owner session.
    /// </summary>
    public int StoryVideoDownloadPermitLimit { get; set; } = 30;

    /// <summary>
    /// Time window (in hours) for story video download rate limit.
    /// </summary>
    public int StoryVideoDownloadWindowHours { get; set; } = 1;

    /// <summary>
    /// Maximum number of guest story requests allowed per window.
    /// </summary>
    public int StoryGuestPermitLimit { get; set; } = 12;

    /// <summary>
    /// Time window (in hours) for guest story rate limit.
    /// </summary>
    public int StoryGuestWindowHours { get; set; } = 1;

    /// <summary>
    /// Maximum number of owner recovery display attempts allowed per window.
    /// Owner recovery displays show recovery options without modifying state.
    /// </summary>
    public int OwnerRecoveryDisplayPermitLimit { get; set; } = 18;

    /// <summary>
    /// Time window (in hours) for owner recovery display rate limit.
    /// </summary>
    public int OwnerRecoveryDisplayWindowHours { get; set; } = 1;

    /// <summary>
    /// Maximum number of owner recovery replace attempts allowed per window.
    /// Replacing an owner recovery code is a destructive operation.
    /// </summary>
    public int OwnerRecoveryReplacePermitLimit { get; set; } = 3;

    /// <summary>
    /// Time window (in hours) for owner recovery replace rate limit.
    /// </summary>
    public int OwnerRecoveryReplaceWindowHours { get; set; } = 1;

    /// <summary>
    /// Maximum number of guest visitor creation attempts allowed per window.
    /// Guest visitor creation should be relatively rare.
    /// </summary>
    public int GuestVisitorCreatePermitLimit { get; set; } = 20;

    /// <summary>
    /// Time window (in hours) for guest visitor create rate limit.
    /// </summary>
    public int GuestVisitorCreateWindowHours { get; set; } = 1;

    /// <summary>
    /// Maximum number of owner recovery operations allowed per window.
    /// Owner recovery is a critical operation that restores access.
    /// </summary>
    public int OwnerRecoverPermitLimit { get; set; } = 3;

    /// <summary>
    /// Time window (in minutes) for owner recover rate limit.
    /// Owner recovery should be rare; limited window prevents abuse.
    /// </summary>
    public int OwnerRecoverWindowMinutes { get; set; } = 15;
}