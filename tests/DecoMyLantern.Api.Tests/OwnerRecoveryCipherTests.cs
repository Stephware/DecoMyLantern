using System.Security.Cryptography;
using DecoMyLantern.Api.Services.Owner;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace DecoMyLantern.Api.Tests;

public sealed class OwnerRecoveryCipherTests
{
    private static OwnerRecoveryCipher NewCipher(byte[]? root = null)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Invitations:EncryptionKey"] = Convert.ToBase64String(root ?? RandomNumberGenerator.GetBytes(32))
            }).Build();
        return new OwnerRecoveryCipher(config);
    }

    [Fact]
    public void Original_recovery_key_is_encrypted_and_available_to_the_same_owner()
    {
        var cipher = NewCipher();
        var owner = Guid.NewGuid();
        var recovery = OwnerSecrets.GenerateRecoveryKey();
        var protectedCode = cipher.Protect(recovery, owner);

        Assert.DoesNotContain(recovery, protectedCode, StringComparison.Ordinal);
        Assert.Equal(recovery, cipher.Unprotect(protectedCode, owner));
        Assert.NotEqual(cipher.Protect(recovery, owner), protectedCode);
        Assert.Throws<CryptographicException>(() =>
            cipher.Unprotect(protectedCode, Guid.NewGuid()));
    }

    [Fact]
    public void Cipher_rejects_tampered_payloads_and_wrong_installation_secret()
    {
        var first = NewCipher();
        var second = NewCipher();
        var owner = Guid.NewGuid();
        var encrypted = first.Protect(OwnerSecrets.GenerateRecoveryKey(), owner);

        Assert.Throws<CryptographicException>(() => second.Unprotect(encrypted, owner));

        var bytes = Microsoft.AspNetCore.WebUtilities.WebEncoders.Base64UrlDecode(encrypted);
        bytes[^1] ^= 1;
        var altered = Microsoft.AspNetCore.WebUtilities.WebEncoders.Base64UrlEncode(bytes);
        Assert.Throws<CryptographicException>(() => first.Unprotect(altered, owner));
    }

    [Fact]
    public void Old_forty_three_character_keys_are_supported_after_owner_recovery()
    {
        var cipher = NewCipher();
        var original = OwnerSecrets.Generate();
        var owner = Guid.NewGuid();
        Assert.Equal(original, cipher.Unprotect(cipher.Protect(original, owner), owner));
    }
}
