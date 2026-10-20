using DecoMyLantern.Api.Models.Database;
using DecoMyLantern.Api.Services.Lanterns;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.SqlClient;
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
        if (credential is null || !OwnerRecoveryPolicy.CanRecover(credential, now))
            throw new OwnerAccessException(401, "Invalid or expired recovery key.");

        // Each recovery issues a new owner session but keeps the same recovery
        // hash and the original one-year deadline. Repeated use never rotates it.
        var newToken = OwnerSecrets.Generate();
        OwnerRecoveryPolicy.RefreshSession(credential, Hash(newToken), now);
        try { await database.SaveChangesAsync(cancellationToken); }
        catch (DbUpdateConcurrencyException)
        { throw new OwnerAccessException(409, "Your session changed during recovery. Retry with the same recovery key."); }
        return new IssuedOwnerAccess(credential.OwnerUserId, newToken, recoveryCode, credential.SessionExpiresAtUtc);
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
        catch (DbUpdateException exception) when (exception.InnerException is SqlException sql &&
            (sql.Number == 2601 || sql.Number == 2627))
        { throw new OwnerAccessException(409, "Owner access has already been issued. Please refresh."); }
        return new IssuedOwnerAccess(ownerId, token, recoveryCode, credential.SessionExpiresAtUtc);
    }

    private static string Hash(string secret) =>
        OwnerSecrets.TryHash(secret, out var hash) ? hash :
        throw new InvalidOperationException("Unable to hash a generated owner secret.");
}
