# Development setup

Requirements: .NET SDK 10, Node.js 22, npm, and SQL Server (local or remote). On Apple Silicon use a supported remote/Windows SQL Server instance if needed.

Frontend:
```bash
cd src/frontend
npm install
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

Create and commit the **initial migration** on a machine with .NET SDK 10 (the migration is not generated in this bootstrap commit):
```bash
dotnet tool restore
dotnet ef migrations add InitialCreate --project src/backend/DecoMyLantern.Api --startup-project src/backend/DecoMyLantern.Api --output-dir Infrastructure/Persistence/Migrations
```

Apply migrations:
```bash
dotnet ef database update --project src/backend/DecoMyLantern.Api --startup-project src/backend/DecoMyLantern.Api
```
Generate the npm lockfile after the first `npm install`, then commit `src/frontend/package-lock.json`, change CI to `npm ci`, and enable npm caching. An EF migration is not yet checked in, and the schema is not yet applied. Do not use `EnsureCreated` in production.

Branch workflow: feature branches off `dev`; PRs to `dev`; owner-only release PRs to `main`. GitHub branch protection must be configured manually in repository settings, and private repo enforcement depends on eligible GitHub plan.
