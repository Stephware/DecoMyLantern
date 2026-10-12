# SQL Server database structure

The schema is defined in `src/backend/DecoMyLantern.Api/Models/Database` using EF Core 10 Code First.

| Entity | Database rule |
|---|---|
| Identity ApplicationUser | Registered lantern owner |
| Lanterns | Unique OwnerUserId + SeasonYear, rowversion concurrency |
| ParolDesigns | Unique DesignKey, 3 seeded themes |
| GrowthStages | Unique StageKey + RequiredFriends; seeded 0, 5, 15, 30 |
| ShareLinks | Unique TokenHash; expiry and revocation |
| GuestVisitors | Unique random browser TokenHash (not verified human identity) |
| Contributions | Unique (LanternId, GuestVisitorId) and (LanternId, SlotIndex) |
| Messages | Optional one per contribution, max 500 characters |
| MessageReports | Message moderation/report tracking |

## Create the database

1. Configure `ConnectionStrings:DefaultConnection` with `dotnet user-secrets` or environment variables.
2. From the repository root run `bash database/bootstrap.sh` to create the initial EF migration if missing, and generate `database/schema.sql` from that migration.
3. Commit the generated migration source and `database/schema.sql` to Git.
4. Run `bash database/bootstrap.sh --apply` to apply the migrations to your configured SQL Server.

Alternatively, run `database/create-database.sql` connected to master, then run the generated `database/schema.sql` in the new database using SQLCMD mode. Never use `EnsureCreated()` for the shared database, and always review migration changes.
