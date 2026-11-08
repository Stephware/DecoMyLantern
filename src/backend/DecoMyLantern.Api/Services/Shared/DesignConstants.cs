namespace DecoMyLantern.Api.Services.Shared;

/// <summary>
/// Shared design and pattern constants used across backend, frontend, and story-renderer.
/// All values must match across projects.
/// </summary>
public static class DesignConstants
{
    /// <summary>
    /// Design/theme keys for parol lantern designs.
    /// Corresponds to the six Filipino-inspired designs available for owner selection.
    /// </summary>
    public static class DesignKeys
    {
        public const string Classic = "classic";
        public const string Floral = "floral";
        public const string Festival = "festival";
        public const string Celestial = "celestial";
        public const string Fiesta = "fiesta";
        public const string Sampaguita = "sampaguita";
    }

    /// <summary>
    /// Pattern keys for parol lantern patterns.
    /// </summary>
    public static class PatternKeys
    {
        public const string Default = "default";
        public const string Rings = "rings";
        public const string Rays = "rays";
    }

    /// <summary>
    /// Growth stage keys for parol lantern visual milestones.
    /// These correspond to design keys and represent progression thresholds.
    /// </summary>
    public static class GrowthStageKeys
    {
        public const string Base = "base";
        public const string Floral = "floral";
        public const string Festival = "festival";
        public const string Celestial = "celestial";
        public const string Fiesta = "fiesta";
        public const string Sampaguita = "sampaguita";
    }
}