using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.WebUtilities;

namespace DecoMyLantern.Api.Services.Invitations;

/// <summary>
/// Protects the single reusable invitation token at rest. The 32-byte secret
/// must stay unchanged across API restarts, deployments and replicas.
/// </summary>
public sealed class InvitationTokenCipher(IConfiguration configuration)
{
    private byte[] LoadKey()
    {
        var encoded = configuration["Invitations:EncryptionKey"];
        byte[] key;
        try { key = Convert.FromBase64String(encoded ?? ""); }
        catch (FormatException) { throw new InvalidOperationException("Set Invitations:EncryptionKey to a stable 32-byte Base64 secret."); }
        if (key.Length != 32)
            throw new InvalidOperationException("Set Invitations:EncryptionKey to a stable 32-byte Base64 secret.");
        return key;
    }

    public string Protect(string token, Guid lanternId)
    {
        var key = LoadKey();
        var nonce = RandomNumberGenerator.GetBytes(12);
        var bytes = Encoding.ASCII.GetBytes(token);
        var encrypted = new byte[bytes.Length];
        var tag = new byte[16];
        using (var cipher = new AesGcm(key, 16))
            cipher.Encrypt(nonce, bytes, encrypted, tag, lanternId.ToByteArray());
        return WebEncoders.Base64UrlEncode([..nonce, ..tag, ..encrypted]);
    }

    public string Unprotect(string ciphertext, Guid lanternId)
    {
        var payload = WebEncoders.Base64UrlDecode(ciphertext);
        if (payload.Length != 12 + 16 + 16)
            throw new CryptographicException("Saved invitation is not valid.");
        var plaintext = new byte[16];
        using (var cipher = new AesGcm(LoadKey(), 16))
            cipher.Decrypt(payload.AsSpan(0, 12), payload.AsSpan(28, 16),
                payload.AsSpan(12, 16), plaintext, lanternId.ToByteArray());
        var token = Encoding.ASCII.GetString(plaintext);
        if (!InvitationPolicy.IsValidToken(token))
            throw new CryptographicException("Saved invitation is not valid.");
        return token;
    }
}
