# BeMyParol (formerly Deco My Lantern)

**BeMyParol** is a mobile-first web project inspired by Filipino Christmas *parols*. Each accepted guest contribution adds a light to someone's lantern; friends #6–50 also add one new outer ornament each. No minimum number of friends is needed for any design.

The parol looks complete from **zero friends** and becomes progressively richer with every contribution. Visual ranges describe the artwork; they are not gates or unlock requirements.

> **Development status:** This repository contains the initial UI preview, ASP.NET Core API foundation, SQL Server schema/migrations, and manual validation commands. Phase 1 provides host registration/login and saved lantern customization. **Phase 2** adds Classic/Floral/Festival layered SVG artwork, stable indexed contributor lights, and mobile pinch/drag/fit controls. **Task 1 of the BeMyParol redesign** replaces unlock thresholds with five continuous growth ranges (0, 1–5, 6–15, 16–30, 31–50) and makes all enabled designs immediately available. Invitation acceptance, anonymous contribution submission, and the full Christmas inbox remain **in development**. Live accepted-contribution counts will stay at zero until Phase 3. Do not treat this scaffold as production-ready.

## How the app is intended to work

- **Hosts** register/log in and create **one lantern per Christmas season**.
- **Friends** open a shared link directly, without creating an account, then contribute a light and optionally leave a message.
- Each accepted contribution occupies a stable light position. Friends #6–50 also progressively add an outer ornament; visual ranges start at 0, 1, 6, 16, and 31 friends.
- Hosts can choose any enabled parol design at any friend count, including zero.
- Messages are private to the lantern owner and stay sealed until **December 25, 12:00 AM Philippine Standard Time (UTC+8)**. For Christmas 2026, the server-side unlock is `2026-12-24T16:00:00Z`.

Anonymous guest participation is convenient, but a browser token cannot prove that two contributions came from different people. Duplicate-submission checks, rate limits, moderation, and other safeguards must be finished before public launch.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite |
| Styling | Tailwind CSS |
| Parol visuals | SVG and TypeScript |
| Backend | ASP.NET Core Web API / .NET 10 / C# |
| Backend organization | Controllers → Services → Repository → Models/Database |
| Database | SQL Server with Entity Framework Core 10 |
| Host authentication | ASP.NET Core Identity |
| Validation | Local/manual lint, type-check, unit test, build, and EF migration checks |

React owns the page layout. The backend follows a familiar **MVC-style folder organization**, but it exposes JSON API endpoints rather than Razor views.

## Project layout

```text
DecoMyLantern/
├── src/
│   ├── frontend/
│   │   ├── public/parols/                 # Parol artwork/assets
│   │   └── src/
│   │       ├── app/                       # React app
│   │       ├── components/                # Shared UI
│   │       ├── features/                  # Lantern, customization, messages
│   │       └── styles/
│   └── backend/
│       └── DecoMyLantern.Api/
│           ├── Controllers/               # API endpoints
│           ├── Services/                  # Business logic
│           ├── Repository/                # Database operations
│           ├── Models/
│           │   ├── Database/              # Entities, DbContext, migrations
│           │   └── DTOs/                  # API request/response models
│           └── Program.cs
├── tests/                                  # Automated tests
├── database/                               # Schema and database setup scripts
├── docs/                                   # Development documentation
└── DecoMyLantern.slnx
```

## Prerequisites

Install the following before running the project:

- **Git**
- **.NET 10 SDK** (see `global.json`)
- **Node.js 22** and npm
- **SQL Server** (local, Windows-hosted, or remote); you can use SQL Server Management Studio or DBeaver to inspect it

If you develop on an Apple Silicon Mac, using a supported Windows or remote SQL Server instance is recommended.

## Run locally

### 1. Clone the repository

```bash
git clone https://github.com/Stephware/DecoMyLantern.git
cd DecoMyLantern
git switch dev
```

Use `dev` for ongoing development; `main` is reserved for approved releases.

### 2. Configure the backend database

Open a terminal at the repository root, then:

```bash
cd src/backend/DecoMyLantern.Api
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=YOUR_SERVER;Database=DecoMyLanternDb;User Id=YOUR_USER;Password=YOUR_PASSWORD;Encrypt=True;TrustServerCertificate=True;"
cd ../../..
```

Replace the placeholders with your **own development SQL Server connection**. The example uses `TrustServerCertificate=True` for local development only; use valid TLS certificates in production. You can also configure the connection through environment variables.

**Never commit real database passwords, tokens, `.env` files, or other secrets.**

Create/update the database using the **committed EF Core migrations** (Task 1 includes a data-only migration for design availability and new stage seeds):

```bash
dotnet tool restore
dotnet ef database update --project src/backend/DecoMyLantern.Api --startup-project src/backend/DecoMyLantern.Api
```

If your database administrator prefers SQL scripts, see `database/create-database.sql` and `database/schema.sql` (generated from EF Core migrations). The [database guide](docs/database-schema.md) explains both methods. Developers should use separate local databases; do not point development tools at a production database.

### 3. Start the ASP.NET Core API

From the repository root:

```bash
cd src/backend/DecoMyLantern.Api
dotnet restore
dotnet run
```

With the included development launch profile, the API listens at **http://localhost:5050**.

You can check it at:

```text
http://localhost:5050/api/health
```

The `/api/designs` and `/api/growth-stages` endpoints require the configured database and migrations.

### 4. Start the React frontend

Open a **second terminal** in the repository root:

```bash
cd src/frontend
npm ci
cp .env.example .env
npm run dev
```

On Windows PowerShell, replace the copy command with `Copy-Item .env.example .env`.

Open **http://localhost:5173** in your browser. Vite proxies `/api` to `http://localhost:5050`.

Open the site to **register or log in**, create your seasonal lantern, explore three SVG design collections (all available immediately), choose decorative patterns, and save your changes to SQL Server. Drag or pinch the parol to examine details; use **Fit** to recenter. The Design studio selector lets you preview 0/3/10/23/40/50 lights without changing stored data. Log out and log back in to confirm saved choices persist.

The dashboard shows real server-side contribution counts (initially zero). Share links and anonymous guest submission will arrive in Phase 3; the complete Christmas inbox experience will arrive in Phase 4.

**Host API security:** Authentication uses an HTTP-only SameSite cookie. The frontend automatically requests and sends a CSRF token for every POST/PUT operation. Manual API testing requires fetching `GET /api/auth/csrf` and preserving cookies. See the [API contracts](docs/api-contracts.md).

## Run manual checks before a PR

**Frontend:**

```bash
cd src/frontend
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

**Backend (from the repository root):**

```bash
dotnet restore DecoMyLantern.slnx
dotnet build DecoMyLantern.slnx --no-restore --configuration Release
dotnet test DecoMyLantern.slnx --no-build --configuration Release
```

**Automated GitHub Actions CI/CD is intentionally removed for faster iteration.** Run the commands above yourself before requesting a merge. When a change affects database entities or EF configurations, also run:

```bash
dotnet tool restore
dotnet ef migrations has-pending-model-changes --project src/backend/DecoMyLantern.Api --startup-project src/backend/DecoMyLantern.Api
```

This migration check requires the usual local development configuration. Manual builds and unit tests do **not** replace end-to-end testing against your configured SQL Server database. Record your results in the PR description; do not claim they passed unless you ran them.

## Team branch workflow

Our workflow is:

```text
feature/*  →  dev  →  main
(develop)    (team)  (owner releases)
```

- `main` — stable/release branch. **Only @Stephware merges release PRs into main. No direct pushes.**
- `dev` — shared development branch. Invited collaborators can merge **manually verified feature pull requests** into `dev`. No direct pushes.
- `feature/*` / `fix/*` — individual work, always created from the latest `dev`.

### Start a new task

```bash
git switch dev
git pull origin dev
git switch -c feature/short-description
```

Make your changes, then review and push:

```bash
git status
git add <files-you-changed>
git commit -m "feat: describe your change"
git push -u origin feature/short-description
```

Replace `<files-you-changed>` with specific files or use `git add .` after checking `git status` and ensuring no secrets are included.

On GitHub, open a pull request with **base: `dev`** and **compare: your feature branch**. Share the manual lint, typecheck, test, and build results in the PR description, review the diff, and then use **Squash and merge**. No automated checks will be generated.

### Bring new dev changes into an active feature

If teammates have merged work while you're still coding:

```bash
git fetch origin
git switch feature/short-description
git merge origin/dev
```

Resolve any conflicts, rerun the relevant checks, and push your branch.

### Release from dev to main

Only the repository owner:

1. Confirms `dev` is stable and the manual checks pass.
2. Opens a PR with **base: `main`** and **compare: `dev`**.
3. Verifies the manual release checks and merges the PR into `main` (merge commit is preferred for the release history).
4. Keeps ongoing development on `dev`.

Do not merge feature branches directly to `main`, force-push protected branches, or commit SQL Server database files or credentials.

## More documentation

- [Detailed local setup](docs/setup-guide.md)
- [Architecture](docs/architecture.md)
- [Parol renderer and light-slot rules](docs/parol-renderer.md)
- [Database and migrations](docs/database-schema.md)
- [API routes](docs/api-contracts.md)
- [GitHub branch protection](docs/github-protection.md)
- [Contribution guidelines](CONTRIBUTING.md)
