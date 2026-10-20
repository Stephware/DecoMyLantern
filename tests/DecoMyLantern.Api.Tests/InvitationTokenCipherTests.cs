using System.Security.Cryptography;
using DecoMyLantern.Api.Services.Invitations;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace DecoMyLantern.Api.Tests;

public sealed class InvitationTokenCipherTests
{
    private static InvitationTokenCipher CreateCipher(byte fill = 42)
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?>
            {
                ["Invitations:EncryptionKey"] = Convert.ToBase64String(Enumerable.Repeat(fill, 32).ToArray())
            }).Build();
        return new InvitationTokenCipher(config);
    }

    [Fact]
    public void Saved_token_can_be_reused_but_is_not_stored_in_plaintext()
    {
        var cipher = CreateCipher();
        var lantern = Guid.NewGuid();
        var token = InvitationPolicy.GenerateToken();
        var encrypted = cipher.Protect(token, lantern);
        Assert.DoesNotContain(token, encrypted);
        Assert.Equal(token, cipher.Unprotect(encrypted, lantern));
        Assert.NotEqual(encrypted, cipher.Protect(token, lantern));
    }

    [Fact]
    public void Invitation_ciphertext_is_bound_to_one_lantern_and_one_secret()
    {
        var original = CreateCipher();
        var lantern = Guid.NewGuid();
        var ciphertext = original.Protect(InvitationPolicy.GenerateToken(), lantern);
        Assert.Throws<CryptographicException>(() => original.Unprotect(ciphertext, Guid.NewGuid()));
        Assert.Throws<CryptographicException>(() => CreateCipher(5).Unprotect(ciphertext, lantern));
    }

    [Fact]
    public void Encryption_cannot_run_without_a_persisted_32_byte_secret()
    {
        var unconfigured = new InvitationTokenCipher(new ConfigurationBuilder().Build());
        Assert.Throws<InvalidOperationException>(() =>
            unconfigured.Protect(InvitationPolicy.GenerateToken(), Guid.NewGuid()));
    }
}
