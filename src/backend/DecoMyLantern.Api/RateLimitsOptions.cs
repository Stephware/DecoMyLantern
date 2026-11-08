using System;

namespace DecoMyLantern.Api.Models;

/// <summary>
/// Options class for rate limit configuration, deserialized from appsettings.json RateLimits section.
/// Maps to the JSON structure: RateLimits.{PolicyName} with PermitLimit, WindowHours, WindowMinutes, QueueLimit, AutoReplenishment.
/// Window is constructed from WindowHours/WindowMinutes combination.
/// </summary>
public class RateLimitsOptions
{
    /// <summary>
    /// Gets or sets the permit limit for owner create operations.
    /// </summary>
    public int OwnerCreatePermitLimit { get; set; } = 6;

    /// <summary>
    /// Gets or sets the window hours for owner create operations.
    /// </summary>
    public int OwnerCreateWindowHours { get; set; } = 1;

    /// <summary>
    /// Gets or sets the permit limit for invitation create operations.
    /// </summary>
    public int InvitationCreatePermitLimit { get; set; } = 120;

    /// <summary>
    /// Gets or sets the window hours for invitation create operations.
    /// </summary>
    public int InvitationCreateWindowHours { get; set; } = 1;

    /// <summary>
    /// Gets or sets the permit limit for invitation preview operations.
    /// </summary>
    public int InvitationPreviewPermitLimit { get; set; } = 120;

    /// <summary>
    /// Gets or sets the window minutes for invitation preview operations.
    /// </summary>
    public int InvitationPreviewWindowMinutes { get; set; } = 1;

    /// <summary>
    /// Gets or sets the permit limit for invitation contribute operations.
    /// </summary>
    public int InvitationContributePermitLimit { get; set; } = 80;

    /// <summary>
    /// Gets or sets the window minutes for invitation contribute operations.
    /// </summary>
    public int InvitationContributeWindowMinutes { get; set; } = 15;

    /// <summary>
    /// Gets or sets the permit limit for design showcase operations.
    /// </summary>
    public int DesignShowcasePermitLimit { get; set; } = 36;

    /// <summary>
    /// Gets or sets the window minutes for design showcase operations.
    /// </summary>
    public int DesignShowcaseWindowMinutes { get; set; } = 10;

    /// <summary>
    /// Gets or sets the permit limit for parol image owner operations.
    /// </summary>
    public int ParolImageOwnerPermitLimit { get; set; } = 60;

    /// <summary>
    /// Gets or sets the window minutes for parol image owner operations.
    /// </summary>
    public int ParolImageOwnerWindowMinutes { get; set; } = 10;

    /// <summary>
    /// Gets or sets the permit limit for parol image guest operations.
    /// </summary>
    public int ParolImageGuestPermitLimit { get; set; } = 60;

    /// <summary>
    /// Gets or sets the window minutes for parol image guest operations.
    /// </summary>
    public int ParolImageGuestWindowMinutes { get; set; } = 10;

    /// <summary>
    /// Gets or sets the permit limit for story owner operations.
    /// </summary>
    public int StoryOwnerPermitLimit { get; set; } = 10;

    /// <summary>
    /// Gets or sets the window hours for story owner operations.
    /// </summary>
    public int StoryOwnerWindowHours { get; set; } = 1;

    /// <summary>
    /// Gets or sets the permit limit for story video status operations.
    /// </summary>
    public int StoryVideoStatusPermitLimit { get; set; } = 100;

    /// <summary>
    /// Gets or sets the window minutes for story video status operations.
    /// </summary>
    public int StoryVideoStatusWindowMinutes { get; set; } = 1;

    /// <summary>
    /// Gets or sets the permit limit for story video download operations.
    /// </summary>
    public int StoryVideoDownloadPermitLimit { get; set; } = 30;

    /// <summary>
    /// Gets or sets the window hours for story video download operations.
    /// </summary>
    public int StoryVideoDownloadWindowHours { get; set; } = 1;

    /// <summary>
    /// Gets or sets the permit limit for story guest operations.
    /// </summary>
    public int StoryGuestPermitLimit { get; set; } = 12;

    /// <summary>
    /// Gets or sets the window hours for story guest operations.
    /// </summary>
    public int StoryGuestWindowHours { get; set; } = 1;

    /// <summary>
    /// Gets or sets the permit limit for owner recovery display operations.
    /// </summary>
    public int OwnerRecoveryDisplayPermitLimit { get; set; } = 18;

    /// <summary>
    /// Gets or sets the window hours for owner recovery display operations.
    /// </summary>
    public int OwnerRecoveryDisplayWindowHours { get; set; } = 1;

    /// <summary>
    /// Gets or sets the permit limit for owner recovery replace operations.
    /// </summary>
    public int OwnerRecoveryReplacePermitLimit { get; set; } = 3;

    /// <summary>
    /// Gets or sets the window hours for owner recovery replace operations.
    /// </summary>
    public int OwnerRecoveryReplaceWindowHours { get; set; } = 1;

    /// <summary>
    /// Gets or sets the permit limit for guest visitor create operations.
    /// </summary>
    public int GuestVisitorCreatePermitLimit { get; set; } = 20;

    /// <summary>
    /// Gets or sets the window hours for guest visitor create operations.
    /// </summary>
    public int GuestVisitorCreateWindowHours { get; set; } = 1;

    /// <summary>
    /// Gets or sets the permit limit for owner recover operations.
    /// </summary>
    public int OwnerRecoverPermitLimit { get; set; } = 3;

    /// <summary>
    /// Gets or sets the window minutes for owner recover operations.
    /// </summary>
    public int OwnerRecoverWindowMinutes { get; set; } = 15;
}