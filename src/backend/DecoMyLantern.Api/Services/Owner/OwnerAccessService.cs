using DecoMyLantern.Api.Models.Database;
using DecoMyLantern.Api.Services.Lanterns;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace DecoMyLantern.Api.Services.Owner;

public sealed record IssuedOwnerAccess(Guid OwnerId, string Token, string RecoveryCode, DateTime ExpiresAtUtc);
public sealed class OwnerAccessException(int statusCode, string message) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
}

public interface IOwnerAccessService
{
    Task<IssuedOwnerAccess> CreateAsync(CancellationToken cancellationToken);
    Task<IssuedOwnerAccess> UpgradeLegacyAsync(Guid ownerId, CancellationToken cancellationToken);
    Task<IssuedOwnerAccess> RecoverAsync(string recoveryCode, CancellationToken cancellationToken);
    Task<string> RotateRecoveryAsync(Guid ownerId, CancellationToken cancellationToken);
    Task SignOutAsync(Guid ownerId, CancellationToken cancellationToken);
}

public sealed class OwnerAccessService(
    ApplicationDbContext database,
    UserManager<ApplicationUser> userManager,
    ILanternService lanternService,
    TimeProvider clock) : IOwnerAccessService
{
    public async Task<IssuedOwnerAccess> CreateAsync(CancellationToken cancellationToken)
    {
        await using var transaction = await database.Database.BeginTransactionAsync(cancellationToken);
        var username = "parol-" + Guid.NewGuid().ToString("N");
        var user = new ApplicationUser { Id = Guid.NewGuid(), UserName = username, Email = null };
        var result = await userManager.CreateAsync(user);
        if (!result.Succeeded)
            throw new OwnerAccessException(500, "Unable to create your parol. Please try again.");

        await lanternService.CreateAsync(user.Id, cancellationToken);
        var issued = await IssueForOwnerAsync(user.Id, cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return issued;
    }

    public async Task<IssuedOwnerAccess> UpgradeLegacyAsync(Guid ownerId, CancellationToken cancellationToken)
    {
        if (!await database.Lanterns.AsNoTracking().AnyAsync(x => x.OwnerUserId == ownerId, cancellationToken))
            throw new OwnerAccessException(404, "No existing parol was found for this session.");
        if (await database.OwnerCredentials.AsNoTracking().AnyAsync(x => x.OwnerUserId == ownerId, cancellationToken))
            throw new OwnerAccessException(409, "This parol already uses secure owner access.");

        // Existing Identity users and lantern IDs stay intact.
        return await IssueForOwnerAsync(ownerId, cancellationToken);
    }

    public async Task<IssuedOwnerAccess> RecoverAsync(string recoveryCode, CancellationToken cancellationToken)
    {
        if (!OwnerSecrets.TryHash(recoveryCode, out var hash))
            throw new OwnerAccessException(401, "Invalid or expired recovery key.");

        var credential = await database.OwnerCredentials
            .SingleOrDefaultAsync(x => x.RecoveryHash == hash, cancellationToken);
        var now = clock.GetUtcNow().UtcDateTime;
        if (credential is null || credential.RecoveryExpiresAtUtc <= now)
            throw new OwnerAccessException(401, "Invalid or expired recovery key.");

        // Recovery consumes the old code and immediately invalidates the old owner cookie.
        var newToken = OwnerSecrets.Generate();
        var newRecovery = OwnerSecrets.Generate();
        credential.TokenHash = Hash(newToken);
        credential.RecoveryHash = Hash(newRecovery);
        credential.SessionExpiresAtUtc = now.Add(OwnerSession.Lifetime);
        credential.RecoveryExpiresAtUtc = now.Add(OwnerSession.RecoveryLifetime);
        try { await database.SaveChangesAsync(cancellationToken); }
        catch (DbUpdateConcurrencyException)
        { throw new OwnerAccessException(409, "This recovery key has already been used. Try the newest key."); }
        return new IssuedOwnerAccess(credential.OwnerUserId, newToken, newRecovery, credential.SessionExpiresAtUtc);
    }

    public async Task<string> RotateRecoveryAsync(Guid ownerId, CancellationToken cancellationToken)
    {
        var credential = await GetCredentialAsync(ownerId, cancellationToken);
        var newRecovery = OwnerSecrets.Generate();
        credential.RecoveryHash = Hash(newRecovery);
        credential.RecoveryExpiresAtUtc = clock.GetUtcNow().UtcDateTime.Add(OwnerSession.RecoveryLifetime);
        try { await database.SaveChangesAsync(cancellationToken); }
        catch (DbUpdateConcurrencyException)
        { throw new OwnerAccessException(409, "Your recovery key changed. Refresh and retry."); }
        return newRecovery;
    }

    public async Task SignOutAsync(Guid ownerId, CancellationToken cancellationToken)
    {
        var credential = await GetCredentialAsync(ownerId, cancellationToken);
        // A new unknown hash revokes the old bearer token without destroying recovery.
        credential.TokenHash = Hash(OwnerSecrets.Generate());
        credential.SessionExpiresAtUtc = clock.GetUtcNow().UtcDateTime;
        try { await database.SaveChangesAsync(cancellationToken); }
        catch (DbUpdateConcurrencyException)
        { throw new OwnerAccessException(409, "Your session changed. Please refresh."); }
    }

    private async Task<IssuedOwnerAccess> IssueForOwnerAsync(Guid ownerId, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow().UtcDateTime;
        var token = OwnerSecrets.Generate();
        var recoveryCode = OwnerSecrets.Generate();
        var credential = new OwnerCredential
        {
            OwnerUserId = ownerId,
            TokenHash = Hash(token),
            RecoveryHash = Hash(recoveryCode),
            CreatedAtUtc = now,
            SessionExpiresAtUtc = now.Add(OwnerSession.Lifetime),
            RecoveryExpiresAtUtc = now.Add(OwnerSession.RecoveryLifetime)
        };
        database.OwnerCredentials.Add(credential);
        try { await database.SaveChangesAsync(cancellationToken); }
        catch (DbUpdateException)
        { throw new OwnerAccessException(409, "Owner access has already been issued. Please refresh."); }
        return new IssuedOwnerAccess(ownerId, token, recoveryCode, credential.SessionExpiresAtUtc);
    }

    private async Task<OwnerCredential> GetCredentialAsync(Guid ownerId, CancellationToken cancellationToken) =>
        await database.OwnerCredentials.SingleOrDefaultAsync(x => x.OwnerUserId == ownerId, cancellationToken)
            ?? throw new OwnerAccessException(404, "Owner access was not found.");

    private static string Hash(string secret) =>
        OwnerSecrets.TryHash(secret, out var hash) ? hash :
        throw new InvalidOperationException("Unable to hash a generated owner secret.");
}
