using System.Security.Claims;
using System.Text.Encodings.Web;
using DecoMyLantern.Api.Models.Database;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace DecoMyLantern.Api.Services.Owner;

/// <summary>
/// A cookie is only a bearer secret, not an ASP.NET Identity login ticket.
/// Check SQL on EVERY request so recovery, logout, expiry and revocation take
/// effect immediately, including across multiple Cloud Run instances.
/// </summary>
public sealed class OwnerTokenHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    ApplicationDbContext database,
    TimeProvider clock)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Cookies.TryGetValue(OwnerSession.Cookie, out var secret) ||
            !OwnerSecrets.TryHash(secret, out var hash))
            return AuthenticateResult.NoResult();

        var now = clock.GetUtcNow().UtcDateTime;
        var ownerId = await database.OwnerCredentials.AsNoTracking()
            .Where(x => x.TokenHash == hash && x.SessionExpiresAtUtc > now)
            .Select(x => (Guid?)x.OwnerUserId)
            .SingleOrDefaultAsync(Context.RequestAborted);

        if (ownerId is null) return AuthenticateResult.Fail("Owner session expired or revoked.");
        var identity = new ClaimsIdentity(
            [new Claim(ClaimTypes.NameIdentifier, ownerId.Value.ToString("D"))],
            OwnerSession.Scheme);
        return AuthenticateResult.Success(
            new AuthenticationTicket(new ClaimsPrincipal(identity), OwnerSession.Scheme));
    }
}
