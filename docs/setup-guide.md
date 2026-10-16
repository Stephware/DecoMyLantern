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

Open the website and choose **Create my parol**; no email/password is required. **Save the private recovery key** before continuing. Close/reopen the tab and verify the owner cookie resumes the same parol. Try **Recovery key** to rotate the private code, and **Leave parol** only after saving the current key. The restoration form can redeem the key on another browser/device (and rotates both session and recovery code). Never share the recovery key in an invitation or screenshot. To migrate an existing host, the same browser must still have a valid old `Deco.Host` cookie so **Transfer my existing parol** appears.

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

**Manual API acceptance:** verify owner creation returns a one-time recovery key, refresh preserves owner identity, old token fails after sign-out/recovery, a wrong recovery key returns 401, 6+ rapid recovery attempts return 429 from the same IP, design edits require the owner cookie and CSRF, and Christmas letters stay sealed before Dec 25 in Philippine time. Record results in the PR before merging. When testing an old authenticated account, verify legacy upgrade preserves lantern ID.

**GitHub Actions CI/CD has been removed.** Run and record these checks manually before each pull request. The project is an early scaffold; the checks do not replace real SQL Server integration testing.
