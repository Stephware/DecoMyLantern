# SQL Server schema

C# entity classes in `src/backend/DecoMyLantern.Api/Models/Database` and EF Core migrations are the single source of truth.

1. Set your SQL Server connection string using `dotnet user-secrets` in the API project.
2. Run `bash database/bootstrap.sh` from the repository root to generate the initial migration (if missing) and an **idempotent** `database/schema.sql`.
3. Review and commit the generated migration + SQL.
4. Run `bash database/bootstrap.sh --apply` to create/update the configured SQL Server database.

No SQL credentials are committed. You can also use `database/create-database.sql` (on `master`) and the generated `database/schema.sql` (on `DecoMyLanternDb`) in SQL Server Management Studio with SQLCMD mode. Use the generated EF migration as authoritative instead of manually maintaining table definitions.

GitHub CI/CD is disabled. Run the frontend and backend builds/tests locally; this does not prove your SQL Server instance has been migrated.

The Task 1 progressive-growth update includes a **seed-data-only** migration (`20261016160000_ProgressiveParolGrowth`) and a matching idempotent SQL section. Existing lanterns/contributions are preserved. Prefer `dotnet ef database update` when using .NET; if applying `database/schema.sql` directly, review the script and migration history first. After changes to migrations, run `bash database/bootstrap.sh` with the local SDK to regenerate this script from EF Core, and review the resulting diff.
