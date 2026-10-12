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
For SQL Server Management Studio users, run `database/create-database.sql` on master and generated `database/schema.sql` on DecoMyLanternDb in SQLCMD mode. The generated migration is the source of truth.

## Validation
```bash
cd src/frontend && npm run lint && npm run typecheck && npm run build
cd ../..
dotnet restore DecoMyLantern.slnx
dotnet build DecoMyLantern.slnx --no-restore --configuration Release
dotnet test DecoMyLantern.slnx --no-build --configuration Release
```
The project is an early scaffold; the GitHub CI checks code quality but does not run a real SQL Server integration test.
