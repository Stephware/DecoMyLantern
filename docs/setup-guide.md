# Development setup

Requirements: .NET SDK 10, Node.js 22, npm, and SQL Server (local or remote). On Apple Silicon use a supported remote/Windows SQL Server instance if needed.

Frontend:
```bash
cd src/frontend
npm ci
cp .env.example .env
npm run dev
```
The development preview is standalone; friend-count controls are a simulation.

Backend:
```bash
cd src/backend/DecoMyLantern.Api
dotnet restore
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=YOUR_SERVER;Database=DecoMyLanternDb;User Id=YOUR_USER;Password=YOUR_PASSWORD;Encrypt=True;TrustServerCertificate=True;"
dotnet run
```
Never commit actual connection strings or secrets. Use local user secrets or environment variables.

Database migrations (once generated):
```bash
dotnet ef database update --project src/backend/DecoMyLantern.Api --startup-project src/backend/DecoMyLantern.Api
```
Migrations must be generated with the .NET SDK and a reachable SQL Server connection before claiming the database is created. Do not use `EnsureCreated` in production.

Branch workflow: feature branches off `dev`; PRs to `dev`; owner-only release PRs to `main`. GitHub branch protection must be configured manually in repository settings, and private repo enforcement depends on eligible GitHub plan.
