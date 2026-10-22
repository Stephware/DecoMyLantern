using DecoMyLantern.Api.Services.Owner;
using Xunit;

namespace DecoMyLantern.Api.Tests;

public sealed class OwnerSecretsTests
{
    [Fact]
    public void Generated_secrets_are_random_256_bit_base64url_tokens()
    {
        var secrets = Enumerable.Range(0, 80).Select(_ => OwnerSecrets.Generate()).ToArray();
        Assert.Equal(80, secrets.Distinct().Count());

        foreach (var secret in secrets)
        {
            Assert.Equal(43, secret.Length);
            Assert.Matches("^[A-Za-z0-9_-]{43}$", secret);
            Assert.True(OwnerSecrets.TryHash(secret, out var hash));
            Assert.Equal(64, hash.Length);
            Assert.Matches("^[A-F0-9]{64}$", hash);
            Assert.DoesNotContain(secret, hash, StringComparison.Ordinal);
        }
    }

    [Fact]
    public void Recovery_keys_are_22_characters_and_old_43_character_keys_still_work()
    {
        var recovery = OwnerSecrets.GenerateRecoveryKey();
        Assert.Equal(22, recovery.Length);
        Assert.True(OwnerSecrets.TryHashRecovery(recovery, out var hash));
        Assert.Equal(64, hash.Length);
        var old = OwnerSecrets.Generate();
        Assert.True(OwnerSecrets.TryHashRecovery(old, out _));
        Assert.False(OwnerSecrets.TryHash(recovery, out _));
        Assert.False(OwnerSecrets.TryHashRecovery("invalid!", out _));
    }

    [Theory]
    [InlineData("")]
    [InlineData("123")]
    [InlineData("not-a-token")]
    [InlineData("!AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")]
    public void Malformed_owner_secrets_are_rejected(string input)
    {
        Assert.False(OwnerSecrets.TryHash(input, out var hash));
        Assert.Equal("", hash);
    }

    [Fact]
    public void Identical_secret_gives_same_hash_and_different_secret_does_not()
    {
        var first = OwnerSecrets.Generate();
        var second = OwnerSecrets.Generate();
        Assert.True(OwnerSecrets.TryHash(first, out var hash1));
        Assert.True(OwnerSecrets.TryHash(first, out var hashAgain));
        Assert.True(OwnerSecrets.TryHash(second, out var hash2));
        Assert.Equal(hash1, hashAgain);
        Assert.NotEqual(hash1, hash2);
    }

    [Fact]
    public void Owner_session_has_defined_expiration_and_recovery_window()
    {
        Assert.Equal(TimeSpan.FromDays(400), OwnerSession.Lifetime);
        Assert.Equal(TimeSpan.FromDays(365), OwnerSession.RecoveryLifetime);
    }
}
