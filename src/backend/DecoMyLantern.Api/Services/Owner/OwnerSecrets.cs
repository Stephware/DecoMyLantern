using System.Security.Cryptography;
using Microsoft.AspNetCore.WebUtilities;

namespace DecoMyLantern.Api.Services.Owner;

/// <summary>Opaque 256-bit bearer credentials. Never persist or log the plaintext.</summary>
public static class OwnerSecrets
{
    // Owner session and guest-browser tokens stay 256-bit and 43 characters.
    public static string Generate() => WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32));

    // Recovery is 128-bit / 22 characters. Old 43-character keys remain valid.
    public static string GenerateRecoveryKey() => WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(16));

    public static bool TryHashRecovery(string? secret, out string hash) =>
        TryHashWithLengths(secret, out hash, 16, 32);

    public static bool TryHash(string? secret, out string hash)
    {
        return TryHashWithLengths(secret, out hash, 32);
    }

    private static bool TryHashWithLengths(string? secret, out string hash, params int[] allowedBytes)
    {
        hash = "";
        if (string.IsNullOrEmpty(secret) || !allowedBytes.Any(n => (n * 8 + 5) / 6 == secret.Length)) return false;
        try
        {
            var bytes = WebEncoders.Base64UrlDecode(secret);
            if (!allowedBytes.Contains(bytes.Length) ||
                WebEncoders.Base64UrlEncode(bytes) != secret) return false;
            hash = Convert.ToHexString(SHA256.HashData(bytes));
            return true;
        }
        catch (FormatException) { return false; }
    }
}

public static class OwnerSession
{
    public const string Scheme = "BeMyParol.OwnerToken";
    public const string LegacyUpgradePolicy = "BeMyParol.LegacyOwnerUpgrade";
    public const string Cookie = "BeMyParol.Owner";
    public static readonly TimeSpan Lifetime = TimeSpan.FromDays(400);
    public static readonly TimeSpan RecoveryLifetime = TimeSpan.FromDays(365);

    public static CookieOptions CookieOptions(HttpContext context, IHostEnvironment environment, DateTime expiresAtUtc) =>
        new()
        {
            HttpOnly = true,
            Secure = !environment.IsDevelopment() || context.Request.IsHttps,
            SameSite = SameSiteMode.Strict,
            Path = "/api",
            Expires = new DateTimeOffset(DateTime.SpecifyKind(expiresAtUtc, DateTimeKind.Utc)),
            IsEssential = true
        };
}
