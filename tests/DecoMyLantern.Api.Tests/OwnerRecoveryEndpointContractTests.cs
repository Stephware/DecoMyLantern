using System.Reflection;
using DecoMyLantern.Api.Controllers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Xunit;

namespace DecoMyLantern.Api.Tests;

public sealed class OwnerRecoveryEndpointContractTests
{
    [Theory]
    [InlineData(nameof(OwnerController.RecoveryKey), "recovery-key", "owner-recovery-display")]
    [InlineData(nameof(OwnerController.ReplaceRecoveryKey), "replace-recovery-key", "owner-recovery-replace")]
    public void Recovery_key_endpoints_require_owner_csrf_and_are_rate_limited(
        string action, string route, string policy)
    {
        var method = typeof(OwnerController).GetMethod(action)!;
        Assert.NotNull(method.GetCustomAttribute<AuthorizeAttribute>());
        Assert.Equal(route, method.GetCustomAttribute<HttpPostAttribute>()?.Template);
        Assert.Equal(policy, method.GetCustomAttribute<EnableRateLimitingAttribute>()?.PolicyName);

        // The caller must not provide an owner ID or an arbitrary key.
        Assert.Equal(new[] { typeof(CancellationToken) },
            method.GetParameters().Select(x => x.ParameterType).ToArray());
    }

    [Fact]
    public void Recovery_access_contract_never_exposes_an_owner_token()
    {
        var fields = typeof(DecoMyLantern.Api.Services.Owner.OwnerRecoveryKeyView)
            .GetProperties().Select(x => x.Name).OrderBy(x => x).ToArray();
        Assert.Equal(new[] { "Available", "ExpiresAtUtc", "RecoveryCode" }, fields);
    }
}
