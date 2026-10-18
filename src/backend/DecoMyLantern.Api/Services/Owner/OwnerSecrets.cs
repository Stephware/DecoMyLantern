using System.Security.Cryptography;
using Microsoft.AspNetCore.WebUtilities;

namespace DecoMyLantern.Api.Services.Owner;

/// <summary>Opaque 256-bit bearer credentials. Never persist or log the plaintext.</summary>
public static class OwnerSecrets
{
    public static string Generate() => WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32));

    public static bool TryHash(string? secret, out string hash)
    {
        hash = "";
        if (secret is null || secret.Length != 43) return false;
        try
        {
            var bytes = WebEncoders.Base64UrlDecode(secret);
            if (bytes.Length != 32) return false;
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
    public static readonly TimeSpan RecoveryLifetime = TimeSpan.FromDays(730);

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
