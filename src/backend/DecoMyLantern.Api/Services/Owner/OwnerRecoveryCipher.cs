using DecoMyLantern.Api.Services.Shared;
using System.Security.Cryptography;
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
    private readonly AesGcmCipher _cipher = new("Invitations:EncryptionKey", "BeMyParol.owner-recovery.v1", 22, 43);

    public string Protect(string recoveryCode, Guid ownerId)
    {
        if (!OwnerSecrets.TryHashRecovery(recoveryCode, out _))
            throw new ArgumentException("Invalid recovery key format.", nameof(recoveryCode));

        return _cipher.Protect(recoveryCode, ownerId, configuration);
    }

    public string Unprotect(string encryptedRecoveryCode, Guid ownerId)
    {
        var code = _cipher.Unprotect(encryptedRecoveryCode, ownerId, configuration);
        if (!OwnerSecrets.TryHashRecovery(code, out _))
            throw new CryptographicException("Invalid decrypted recovery key.");
        return code;
    }
}