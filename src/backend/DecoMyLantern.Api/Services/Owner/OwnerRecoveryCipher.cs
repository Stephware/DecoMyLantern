using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.WebUtilities;

namespace DecoMyLantern.Api.Services.Owner;

/// <summary>
/// Encrypts a recoverable copy of newly issued owner recovery keys.
/// The root installation encryption secret is also used for invitations, but
/// a purpose-specific HMAC-derived AES key prevents cross-protocol reuse.
/// This encrypted copy is accessible ONLY via the authenticated owner endpoint.
/// </summary>
public sealed class OwnerRecoveryCipher(IConfiguration configuration)
{
    private byte[] LoadPurposeKey()
    {
        var encoded = configuration["Invitations:EncryptionKey"];
        byte[] rootKey;
        try { rootKey = Convert.FromBase64String(encoded ?? ""); }
        catch (FormatException)
        { throw new InvalidOperationException("Set Invitations:EncryptionKey to the stable existing 32-byte Base64 key."); }

        if (rootKey.Length != 32)
            throw new InvalidOperationException("Set Invitations:EncryptionKey to the stable existing 32-byte Base64 key.");

        return HMACSHA256.HashData(rootKey, Encoding.UTF8.GetBytes("BeMyParol.owner-recovery.v1"));
    }

    public string Protect(string recoveryCode, Guid ownerId)
    {
        if (!OwnerSecrets.TryHashRecovery(recoveryCode, out _))
            throw new ArgumentException("Invalid recovery key format.", nameof(recoveryCode));

        var nonce = RandomNumberGenerator.GetBytes(12);
        var plaintext = Encoding.ASCII.GetBytes(recoveryCode);
        var ciphertext = new byte[plaintext.Length];
        var tag = new byte[16];
        using (var cipher = new AesGcm(LoadPurposeKey(), 16))
            cipher.Encrypt(nonce, plaintext, ciphertext, tag, ownerId.ToByteArray());
        return WebEncoders.Base64UrlEncode([.. nonce, .. tag, .. ciphertext]);
    }

    public string Unprotect(string encryptedRecoveryCode, Guid ownerId)
    {
        var payload = WebEncoders.Base64UrlDecode(encryptedRecoveryCode);
        var size = payload.Length - 28;
        if (size != 22 && size != 43)
            throw new CryptographicException("Invalid encrypted recovery key payload.");

        var plaintext = new byte[size];
        using (var cipher = new AesGcm(LoadPurposeKey(), 16))
            cipher.Decrypt(payload.AsSpan(0, 12), payload.AsSpan(28, size),
                payload.AsSpan(12, 16), plaintext, ownerId.ToByteArray());

        var code = Encoding.ASCII.GetString(plaintext);
        if (!OwnerSecrets.TryHashRecovery(code, out _))
            throw new CryptographicException("Invalid decrypted recovery key.");
        return code;
    }
}
