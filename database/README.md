# SQL Server schema

C# entity classes in `src/backend/DecoMyLantern.Api/Models/Database` and EF Core migrations are the single source of truth.

1. Set your SQL Server connection string using `dotnet user-secrets` in the API project.
2. Run `bash database/bootstrap.sh` from the repository root to generate the initial migration (if missing) and an **idempotent** `database/schema.sql`.
3. Review and commit the generated migration + SQL.
4. Run `bash database/bootstrap.sh --apply` to create/update the configured SQL Server database.

No SQL credentials are committed. You can also use `database/create-database.sql` (on `master`) and the generated `database/schema.sql` (on `DecoMyLanternDb`) in SQL Server Management Studio with SQLCMD mode. Use the generated EF migration as authoritative instead of manually maintaining table definitions.

The API CI can build and test without a live SQL Server. It does not prove your database instance has been created or migrated.
