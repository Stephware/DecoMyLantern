# Fixing recovery-key SQL errors on a development database

When the **Save your key before leaving** dialog shows a SQL Server error,
first check whether the API uses a database that has not received the
`20261029080000_EncryptedOwnerRecoveryKeys` migration. The dialog alone
cannot identify the SQL error number, so **a missing migration is a likely
cause, not a confirmed diagnosis without the database/logs**.

That migration adds nullable `OwnerCredentials.EncryptedRecoveryCode` and
`OwnerCredentials.RecoveryIssuedAtUtc` columns. It does **not** delete old
owner rows, hash values, parols, guests, or messages. It cannot recover the
plaintext of old hash-only keys; existing owners can explicitly replace
those keys while their owner session is still active.

## Safe local repair

1. Keep the current browser session signed in; **do not click Leave anyway**.
2. Stop the local .NET development server and back up the development database.
3. Confirm the API's configured **development** SQL Server points to the database you intend to update. The default local Compose configuration uses `127.0.0.1,14334` / `DecoMyLanternDb`; your local `dotnet user-secrets` configuration is authoritative. Never paste passwords or recovery keys into a chat or issue.
4. At the repository root, apply **existing EF migrations**, not a new schema/reset:

```bash
dotnet tool restore
ASPNETCORE_ENVIRONMENT=Development dotnet ef database update --project src/backend/DecoMyLantern.Api --startup-project src/backend/DecoMyLantern.Api
```

5. Restart the local API, refresh the owner dashboard and open **Recovery key**. If the dialog previously failed, use **Retry loading key**. Save the displayed key before leaving.

For a manual read-only check in the intended SQL Server database, use:

```sql
SELECT DB_NAME() AS CurrentDatabase;
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'OwnerCredentials'
  AND COLUMN_NAME IN ('EncryptedRecoveryCode', 'RecoveryIssuedAtUtc');
SELECT MigrationId FROM __EFMigrationsHistory
WHERE MigrationId = '20261029080000_EncryptedOwnerRecoveryKeys';
```

**Expected:** two column rows and the migration-history row. If the
migration is already recorded but either column is missing, **stop**:
do not drop the database, mark migrations manually, or generate keys.
Check SQL Server logs and migration history and reconcile the schema
with a database administrator before attempting another update.

## What the code fixes

- SQL Server **207** (missing column) during authenticated recovery display
  or replacement becomes a controlled HTTP 503 response with a safe message
  and `RECOVERY_SCHEMA_OUTDATED` code; the full error is logged server-side.
- Other 5xx responses cannot display a raw SQL/provider exception title
  in the recovery-key dialog.
- The dialog can retry the failed request. A failed initial lookup cannot
  enable **Leave anyway**; successful legacy hash-only lookups still allow
  deliberate replacement or leaving if the owner already saved their key.
- There is **no automatic database migration on startup**, forced key rotation,
  storage of plaintext recovery keys in the browser, or infrastructure change.

If the columns and migration history are present but the error persists,
check the API's SQL exception number and inner message in the **local
backend logs** (redact secrets before sharing). A connection, permission,
or other SQL failure may need a separate fix.
