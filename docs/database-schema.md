# SQL Server database structure

The schema is defined in `src/backend/DecoMyLantern.Api/Models/Database` using EF Core 10 Code First.

| Entity | Database rule |
|---|---|
| Identity ApplicationUser | Internal owner record, no email/password required for new owners; retains existing owner foreign keys and historical rows |
| Lanterns | Unique OwnerUserId + SeasonYear, rowversion concurrency | 
| OwnerCredentials | One-to-one owner row; SHA-256 TokenHash/RecoveryHash (unique), session/recovery expiration, rowversion for rotation conflict detection |
| ParolDesigns | Unique DesignKey, 6 seeded design families with RequiredFriends milestones 0, 3, 10, 23, 40, 50; existing three IDs preserved |
| GrowthStages | Unique StageKey + RequiredFriends; six selectable design milestones at 0, 3, 10, 23, 40, 50 |
| ShareLinks | Unique SHA-256 TokenHash, expiry and revocation; plaintext link returned only at creation |
| GuestVisitors | Unique SHA-256 hash of a random guest browser token (not verified human identity) |
| Contributions | Unique (LanternId, GuestVisitorId) and (LanternId, SlotIndex); slot counter assigned under SQL row lock/transaction |
| Messages | Optional one per contribution, max 500 characters |
| MessageReports | Message moderation/report tracking |

## Apply the Task 1 migration to an existing database

The **ProgressiveParolGrowth** migration changes seed data only; it does not drop or reset lanterns, contributors, designs, or identity accounts. From the solution root:

```bash
dotnet tool restore
dotnet ef database update --project src/backend/DecoMyLantern.Api --startup-project src/backend/DecoMyLantern.Api
```

This changes the two previously locked design seed values to zero and adds the fifth growth-range row. Do not edit existing data manually as a substitute for the migration.

## Task 4 — Existing schema reused

ShareLinks, GuestVisitors, Contributions and Messages were already present with uniqueness constraints, so Task 4 does **not** require an additional migration. Ensure that Task 1 and Task 2 migrations have been applied first. For real 51-guest validation, use the guarded `scripts/invitation-smoke.mjs` against a disposable local database.

## Apply the Task 2 migration

`20261016173000_PasswordlessOwnerAccess` adds a new `OwnerCredentials` table and two unique hash indexes. It does not remove the existing Identity users, lanterns, messages, or contributor data. The existing user ID is still the foreign key owner ID. Apply all pending migrations (including Task 1) from the repository root:

```bash
dotnet tool restore
dotnet ef database update --project src/backend/DecoMyLantern.Api --startup-project src/backend/DecoMyLantern.Api
```

Do not use manual SQL scripts and EF migrations interchangeably without checking `__EFMigrationsHistory`.

## Living parol design migration

`20261017230000_LivingParolDesigns` changes **seed data only**: it adjusts requirements for the existing Floral and Festival designs, adds three more selectable designs, and aligns six growth-stage rows. Existing owners, parols, contributions and private messages are preserved. Confirm the EF connection points to **DecoMyLanternDb** (not `master`) and back up the database before running `dotnet ef database update`. Do not reapply the full schema if the migration is already recorded.

## Create the database

1. Configure `ConnectionStrings:DefaultConnection` with `dotnet user-secrets` or environment variables.
2. From the repository root run `bash database/bootstrap.sh` to create the initial EF migration if missing, and generate `database/schema.sql` from that migration.
3. Commit the generated migration source and `database/schema.sql` to Git.
4. Run `bash database/bootstrap.sh --apply` to apply the migrations to your configured SQL Server.

Alternatively, run `database/create-database.sql` connected to master, then run the generated `database/schema.sql` in the new database using SQLCMD mode. Never use `EnsureCreated()` for the shared database, and always review migration changes.
