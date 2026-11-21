# SQL Server integration verification

This suite adds real HTTP-level verification for the same owner, invitation and guest
flows used by BeMyParol. It is deliberately separate from fast unit/contract tests.

## What it covers

- Owner creation, encrypted recovery key, owner cookies and stable one-link-per-lantern creation.
- Guest cookie + CSRF, a persisted contribution and message, public preview privacy.
- Owner recovery revoking the prior session without deleting the parol or invitation.
- Twelve simultaneous guest contributions: every slot is unique and every private message survives.
- Duplicate submissions are rejected and invalid CSRF does not create an owner.
- Cancelling a pending owner removes the unused lantern atomically.

All tests use the actual Program, ASP.NET Identity, authentication, antiforgery,
services, EF migrations and Microsoft SQL Server. No SQLite or EF InMemory
substitutes can prove the SQL locking rules.

## Run

Use an isolated SQL Server 2022 instance with a disposable test-only SA account.
Never point BEMYPAROL_TEST_SQL at production. On macOS or Linux, example:

    docker run --rm -d --name parol-integration-sql -e ACCEPT_EULA=Y \
      -e MSSQL_SA_PASSWORD='LocalSql!Integration2026' -p 127.0.0.1:1433:1433 \
      mcr.microsoft.com/mssql/server:2022-latest

    export BEMYPAROL_TEST_SQL='Server=127.0.0.1,1433;User Id=sa;Password=LocalSql!Integration2026;Encrypt=True;TrustServerCertificate=True;'
    dotnet test tests/DecoMyLantern.Api.IntegrationTests/DecoMyLantern.Api.IntegrationTests.csproj

The test fixture waits for SQL Server startup, creates a randomly named isolated
database, applies EF migrations and deletes it after the suite completes.
The provided CI workflow runs these tests against an ephemeral SQL Server service.
The password in that workflow is for CI's disposable database only.

Run baseline tests independently:

    dotnet test tests/DecoMyLantern.Api.Tests/DecoMyLantern.Api.Tests.csproj
    (cd src/frontend && npm ci && npm test && npm run lint && npm run build)
    (cd story-renderer && npm ci && npm test)

The benchmark and phone media tests remain separate. Passing this suite does
not prove native OS sharing or video compatibility on physical phones.
