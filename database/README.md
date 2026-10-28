# SQL Server schema

C# entity classes in `src/backend/DecoMyLantern.Api/Models/Database` and EF Core migrations are the single source of truth.

1. Set your SQL Server connection string using `dotnet user-secrets` in the API project.
2. Run `bash database/bootstrap.sh` from the repository root to generate the initial migration (if missing) and an **idempotent** `database/schema.sql`.
3. Review and commit the generated migration + SQL.
4. Run `bash database/bootstrap.sh --apply` to create/update the configured SQL Server database.

No SQL credentials are committed. You can also use `database/create-database.sql` (on `master`) and the generated `database/schema.sql` (on `DecoMyLanternDb`) in SQL Server Management Studio with SQLCMD mode. Use the generated EF migration as authoritative instead of manually maintaining table definitions.

The local Compose SQL Server uses `127.0.0.1:14334` to avoid conflicting with other SQL Server instances on port 1433. Start it with `docker compose up -d sqlserver` after setting `MSSQL_SA_PASSWORD` in the root `.env`. Set the API's `ConnectionStrings:DefaultConnection` user secret to `Server=127.0.0.1,14334;Database=DecoMyLanternDb;User Id=sa;Password=YOUR_LOCAL_PASSWORD;Encrypt=True;TrustServerCertificate=True;`. In DBeaver, use the SQL Server driver, host `127.0.0.1`, port `14334`, database `DecoMyLanternDb`, SQL Server authentication with user `sa` and the same local password. Enable encryption and trust the server certificate for this local development instance only. Recreating the container retains the named database volume; do not run `docker compose down -v` unless you intend to delete the database.

GitHub CI/CD is disabled. Run the frontend and backend builds/tests locally; this does not prove your SQL Server instance has been migrated.

The `20261020220000_SingleInvitationLink` migration updates the existing `ShareLinks` table with `IsOfficial` and `EncryptedToken`. A filtered unique index enforces one official link per lantern. Historical invitation rows and accepted lights/messages are preserved; old links are intentionally retired. The matching update is included in `database/schema.sql`. Keep the AES-GCM encryption secret (`Invitations:EncryptionKey`) stable across restarts, instances and deployments, and back it up securely. The new key never belongs in committed files.

The `20261020220811_PendingOwnerSetup` migration adds `OwnerCredentials.SetupPending` so a newly created, unused parol can be cancelled while its recovery key is shown. The idempotent SQL script includes this migration after `SingleInvitationLink`.

Task 2 adds the `20261016173000_PasswordlessOwnerAccess` migration and `OwnerCredentials` table. Owner bearer tokens stay hash-only; recovery keys have SHA-256 hashes and, for keys issued after the new migration, an authenticated AES-GCM encrypted copy (never raw plaintext in SQL). Existing owners and lantern records are retained. The SQL idempotent schema script includes this migration; regenerate it with `bash database/bootstrap.sh` when a .NET SDK is available and review its diff.

The Task 1 progressive-growth update includes a **seed-data-only** migration (`20261016160000_ProgressiveParolGrowth`) and a matching idempotent SQL section. Existing lanterns/contributions are preserved. Prefer `dotnet ef database update` when using .NET; if applying `database/schema.sql` directly, review the script and migration history first. After changes to migrations, run `bash database/bootstrap.sh` with the local SDK to regenerate this script from EF Core, and review the resulting diff.

## Owner recovery-key redisplay migration (October 29, 2026)

The non-destructive `20261029080000_EncryptedOwnerRecoveryKeys` migration
adds two **nullable** fields on `OwnerCredentials`:

- `EncryptedRecoveryCode` — owner-scoped encrypted copy for currently issued
  recovery keys. Existing owners receive NULL, since historical SHA-256 hashes
  cannot be converted back into the original code.
- `RecoveryIssuedAtUtc` — optional replacement issuance date. Existing keys
  keep the original `CreatedAtUtc` deadline until the user explicitly replaces
  the code.

The existing `Invitations:EncryptionKey` / `INVITATION_ENCRYPTION_KEY`
must remain identical across deploys. The recovery cipher derives a distinct
AES key from that secret; don't rotate it for the recovery UI.

Before starting the new backend against an existing production database:

1. Back up the production SQL Server database.
2. Apply `dotnet ef database update --project src/backend/DecoMyLantern.Api --startup-project src/backend/DecoMyLantern.Api` using production-safe credentials only in a secured migration session.
3. Verify both new columns exist and that legacy credentials remain intact.
4. Deploy the new backend and frontend together.

The repository's pre-generated `database/schema.sql` may lag this new
migration; regenerate it with `bash database/bootstrap.sh` when the SDK is
available before using that SQL script. Do **not** assume the older file has
the latest encrypted-recovery columns.

Avoid `docker compose down -v` or rebuilding a production database from
scratch. Replacing a recovery key requires deliberate owner confirmation;
opening its dialog never rotates any key.
