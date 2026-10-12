# Deco My Lantern

**Deco My Lantern** is a mobile-first web project inspired by Filipino Christmas *parols*. Each accepted guest contribution adds a light to someone's lantern. As contributions reach milestones, the parol gains new decorative layers and more intricate patterns.

The goal is to keep the parol beautiful at every stage: **curated SVG themes + milestone-based structural growth**, rather than stretching an image or forcing a Fibonacci snowflake shape.

> **Development status:** This repository contains the initial UI preview, ASP.NET Core API foundation, SQL Server schema/migrations, and CI. The full host dashboard, invitation acceptance, anonymous contribution submission, and end-to-end Christmas message flow are **still in development**. The frontend's friend counter is a simulation, not real data. Do not treat this scaffold as production-ready.

## How the app is intended to work

- **Hosts** register/log in and create **one lantern per Christmas season**.
- **Friends** open a shared link directly, without creating an account, then contribute a light and optionally leave a message.
- Each accepted contribution will occupy a stable light position. Parol growth uses predesigned layers and friend milestones (initially 0, 5, 15, and 30).
- Hosts can choose from compatible parol designs as they unlock them.
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
| CI | GitHub Actions |

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
├── .github/workflows/                      # CI workflow
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

Create/update the database using the **committed EF Core migration**:

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

The current frontend shows a **parol growth and theme preview**. Real guest acceptances and messages are not yet connected.

## Run checks before a PR

**Frontend:**

```bash
cd src/frontend
npm ci
npm run lint
npm run typecheck
npm run build
```

**Backend (from the repository root):**

```bash
dotnet restore DecoMyLantern.slnx
dotnet build DecoMyLantern.slnx --no-restore --configuration Release
dotnet test DecoMyLantern.slnx --no-build --configuration Release
```

The GitHub Actions workflow automatically runs the frontend and backend checks for pull requests into `dev` and `main`, including EF Core migration consistency checks. **Passing CI does not mean the full app has been deployed or tested against a live SQL Server.**

## Team branch workflow

Our workflow is:

```text
feature/*  →  dev  →  main
(develop)    (team)  (owner releases)
```

- `main` — stable/release branch. **Only @Stephware merges release PRs into main. No direct pushes.**
- `dev` — shared development branch. Invited collaborators can merge **passing feature pull requests** into `dev`. No direct pushes.
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

On GitHub, open a pull request with **base: `dev`** and **compare: your feature branch**. Wait for `frontend` and `backend` to pass; the team can then use **Squash and merge**.

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

1. Confirms `dev` is stable and CI passes.
2. Opens a PR with **base: `main`** and **compare: `dev`**.
3. Verifies release checks and merges the PR into `main` (merge commit is preferred for the release history).
4. Keeps ongoing development on `dev`.

Do not merge feature branches directly to `main`, force-push protected branches, or commit SQL Server database files or credentials.

## More documentation

- [Detailed local setup](docs/setup-guide.md)
- [Architecture](docs/architecture.md)
- [Database and migrations](docs/database-schema.md)
- [API routes](docs/api-contracts.md)
- [GitHub branch protection](docs/github-protection.md)
- [Contribution guidelines](CONTRIBUTING.md)
