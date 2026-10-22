# Setup guide

Requirements: .NET 10 SDK, Node.js 22, and a SQL Server instance (Windows or remote SQL Server is preferable on Apple Silicon).

```bash
git clone https://github.com/Stephware/DecoMyLantern.git
cd DecoMyLantern
git switch dev
```

## Frontend
```bash
cd src/frontend
npm install
cp .env.example .env
npm run dev
```
Vite is on http://localhost:5173 and proxies /api to http://localhost:5050.

Open the website and choose **Create my parol**; no email/password is required. **Save the private recovery key** before continuing. Close/reopen the tab and verify the owner cookie resumes the same parol. Use **Leave parol** only after saving the original key. The restoration form can redeem that same key repeatedly on another browser/device during its one-year validity (only the previous owner session is replaced). Never share the recovery key in an invitation or screenshot. To migrate an existing host, the same browser must still have a valid old `Deco.Host` cookie so **Transfer my existing parol** appears.

## Backend
```bash
cd src/backend/DecoMyLantern.Api
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=YOUR_SERVER;Database=DecoMyLanternDb;User Id=YOUR_USER;Password=YOUR_PASSWORD;Encrypt=True;TrustServerCertificate=True;"
dotnet run
```
Keep the real SQL connection string out of Git. For a production DB use proper TLS validation instead of `TrustServerCertificate=True`.

## Database
Return to the repository root:
```bash
dotnet tool restore
bash database/bootstrap.sh
# Review + commit generated EF migration and database/schema.sql
bash database/bootstrap.sh --apply
```
For SQL Server Management Studio users, run `database/create-database.sql` on master and generated `database/schema.sql` on DecoMyLanternDb in SQLCMD mode. The generated migration is the source of truth. **Task 2** adds `OwnerCredentials`: apply it before opening the updated frontend. Do not run the site against production data during testing.

## Single invitation configuration

Before starting the API, generate and securely save a stable 32-byte Base64 key with `openssl rand -base64 32`. Run `dotnet user-secrets set "Invitations:EncryptionKey" "<generated-key>"` inside the API project directory. For Docker, set `INVITATION_ENCRYPTION_KEY` in the ignored root `.env`. Use the same key in all replicas and on subsequent deployments.

Apply EF Core migration `20261020220000_SingleInvitationLink` to the existing database. It extends `ShareLinks` rather than replacing the table, preserves past contributions and letters, and retires all previous invitation links. Copy the newly issued short invitation and share it again with friends. Do not lose or regenerate the encryption key, because existing official links would become unreadable.

## Invitation flow verification

Create a parol, copy an invitation link, and open it in a private browser. Enter a friend name and an optional Christmas message, then verify that the owner's parol displays a new light and that the guest can no longer contribute from the same browser.

For **destructive, local-only SQL verification** with 51 guests and two simultaneous contributions, first start the API with a disposable, migrated development database, then from the repo root:

```bash
node scripts/invitation-smoke.mjs --confirm-dev-database
```

The script refuses non-localhost targets. See [Task 4](task4-friend-invitations.md).

## Validation
```bash
cd src/frontend && npm run lint && npm run typecheck && npm run test && npm run build
cd ../..
dotnet restore DecoMyLantern.slnx
dotnet build DecoMyLantern.slnx --no-restore --configuration Release
dotnet test DecoMyLantern.slnx --no-build --configuration Release
```
When database models change, also validate EF Core migrations from the repository root:

```bash
dotnet tool restore
dotnet ef migrations has-pending-model-changes --project src/backend/DecoMyLantern.Api --startup-project src/backend/DecoMyLantern.Api
```

**Manual API acceptance:** verify owner creation returns an original one-year recovery key, repeated recovery works using exactly the same key without extending expiry, refresh preserves owner identity, old token fails after sign-out/recovery, a wrong recovery key returns 401, 6+ rapid recovery attempts return 429 from the same IP, design edits require the owner cookie and CSRF, and Christmas letters stay sealed before Dec 25 in Philippine time. Record results in the PR before merging. When testing an old authenticated account, verify legacy upgrade preserves lantern ID.

**GitHub Actions CI/CD has been removed.** Run and record these checks manually before each pull request. The project is an early scaffold; the checks do not replace real SQL Server integration testing.
