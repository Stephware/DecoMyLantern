using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.WebUtilities;

namespace DecoMyLantern.Api.Services.Shared;

/// <summary>
/// Shared AES-GCM encryption utility configurable with key derivation,
/// expected plaintext lengths, and config section name.
/// </summary>
public class AesGcmCipher
{
    private readonly string _encryptionKeyConfigSection;
    private readonly string? _purposeString;
    private readonly int[] _allowedPlaintextByteLengths;

    public AesGcmCipher(string encryptionKeyConfigSection, string? purposeString = null, params int[] allowedPlaintextByteLengths)
    {
        _encryptionKeyConfigSection = encryptionKeyConfigSection;
        _purposeString = purposeString;
        _allowedPlaintextByteLengths = allowedPlaintextByteLengths;
    }

    private byte[] LoadKey(IConfiguration configuration)
    {
        var encoded = configuration[_encryptionKeyConfigSection];
        byte[] key;
        try
        {
            key = Convert.FromBase64String(encoded ?? "");
        }
        catch (FormatException)
        {
            throw new InvalidOperationException($"Set {_encryptionKeyConfigSection} to a stable 32-byte Base64 secret.");
        }

        if (key.Length != 32)
        {
            throw new InvalidOperationException($"Set {_encryptionKeyConfigSection} to the stable existing 32-byte Base64 key.");
        }

        if (_purposeString != null)
        {
            return HMACSHA256.HashData(key, Encoding.UTF8.GetBytes(_purposeString));
        }

        return key;
    }

    /// <summary>
    /// Protect/encrypt a plaintext string, returning Base64Url-encoded nonce+tag+ciphertext.
    /// Format: [nonce(12)][tag(16)][ciphertext]
    /// </summary>
    public string Protect(string plaintext, Guid associatedData, IConfiguration configuration)
    {
        var key = LoadKey(configuration);
        var nonce = RandomNumberGenerator.GetBytes(12);
        var bytes = Encoding.ASCII.GetBytes(plaintext);
        var ciphertext = new byte[bytes.Length];
        var tag = new byte[16];
        using (var cipher = new AesGcm(key, 16))
            cipher.Encrypt(nonce, bytes, ciphertext, tag, associatedData.ToByteArray());
        return WebEncoders.Base64UrlEncode([.. nonce, .. tag, .. ciphertext]);
    }

    /// <summary>
    /// Unprotect/decrypt a Base64Url-encoded ciphertext, returning the plaintext string.
    /// Expected format: [nonce(12)][tag(16)][ciphertext]
    /// </summary>
    public string Unprotect(string encrypted, Guid associatedData, IConfiguration configuration)
    {
        var payload = WebEncoders.Base64UrlDecode(encrypted);

        // Expected format: nonce(12) + tag(16) + ciphertext(variable)
        // Minimum payload: 12 + 16 + 1 = 29 bytes
        if (payload.Length < 29)
        {
            throw new CryptographicException("Invalid encrypted payload: too short.");
        }

        var ciphertextLen = payload.Length - 28; // 12 nonce + 16 tag

        // Validate plaintext length against allowed lengths
        if (_allowedPlaintextByteLengths != null && !_allowedPlaintextByteLengths.Contains(ciphertextLen))
        {
            throw new CryptographicException($"Invalid encrypted payload. Expected plaintext length one of: {string.Join(", ", _allowedPlaintextByteLengths)} bytes, got {ciphertextLen} bytes.");
        }

        var plaintext = new byte[ciphertextLen];
        using (var cipher = new AesGcm(LoadKey(configuration), 16))
            cipher.Decrypt(
                payload.AsSpan(0, 12),              // nonce
                payload.AsSpan(28, ciphertextLen),  // ciphertext (after nonce+tag)
                payload.AsSpan(12, 16),             // tag
                plaintext,
                associatedData.ToByteArray());

        return Encoding.ASCII.GetString(plaintext);
    }
}