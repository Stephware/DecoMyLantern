using DecoMyLantern.Api.Services.Invitations;
using DecoMyLantern.Api.Services.Owner;
using Xunit;

namespace DecoMyLantern.Api.Tests;

public sealed class InvitationPolicyTests
{
    [Theory]
    [InlineData("A", true)]
    [InlineData(" Friend ", true)]
    [InlineData("", false)]
    [InlineData("  ", false)]
    [InlineData(null, false)]
    public void Names_are_trimmed_and_required(string? input, bool expected) =>
        Assert.Equal(expected, InvitationPolicy.IsValidName(input));

    [Fact]
    public void Guest_name_length_is_bounded_to_80_characters()
    {
        Assert.True(InvitationPolicy.IsValidName(new string('x', 80)));
        Assert.False(InvitationPolicy.IsValidName(new string('x', 81)));
    }

    [Fact]
    public void Message_is_optional_but_limited_to_500_characters()
    {
        Assert.True(InvitationPolicy.IsValidMessage(null));
        Assert.True(InvitationPolicy.IsValidMessage(""));
        Assert.True(InvitationPolicy.IsValidMessage(new string('x', 500)));
        Assert.False(InvitationPolicy.IsValidMessage(new string('x', 501)));
    }

    [Fact]
    public void Invitations_expire_at_the_end_of_the_Philippine_calendar_year()
    {
        var expiry = InvitationPolicy.EndOfSeasonUtc(2026);
        Assert.Equal(new DateTime(2026, 12, 31, 15, 59, 59, DateTimeKind.Utc), expiry);
    }

    [Fact]
    public void Invitation_secret_is_cryptographic_and_only_the_hash_is_persistable()
    {
        var secret = InvitationPolicy.GenerateToken();
        Assert.Equal(16, secret.Length);
        Assert.True(InvitationPolicy.TryHash(secret, out var expectedHash));
        Assert.Equal(expectedHash, InvitationPolicy.Hash(secret));
        Assert.Equal(64, expectedHash.Length);
        Assert.NotEqual(secret, expectedHash);
    }

    [Fact]
    public void Malformed_invitation_secrets_are_rejected()
    {
        Assert.Throws<ArgumentException>(() => InvitationPolicy.Hash("not-a-token"));
        Assert.False(InvitationPolicy.IsValidToken(OwnerSecrets.Generate()));
        Assert.False(InvitationPolicy.IsValidToken("x".Repeat(16).Replace('x', '!')));
    }
}
