using DecoMyLantern.Api.Services.Shared;
using System.Security.Cryptography;
using Microsoft.AspNetCore.WebUtilities;

namespace DecoMyLantern.Api.Services.Invitations;

/// <summary>
/// Protects the single reusable invitation token at rest. The 32-byte secret
/// must stay unchanged across API restarts, deployments and replicas.
/// </summary>
public sealed class InvitationTokenCipher(IConfiguration configuration)
{
    private readonly AesGcmCipher _cipher = new("Invitations:EncryptionKey", null, 16);

    public string Protect(string token, Guid lanternId)
    {
        return _cipher.Protect(token, lanternId, configuration);
    }

    public string Unprotect(string ciphertext, Guid lanternId)
    {
        var token = _cipher.Unprotect(ciphertext, lanternId, configuration);
        if (!InvitationPolicy.IsValidToken(token))
            throw new CryptographicException("Saved invitation is not valid.");
        return token;
    }
}