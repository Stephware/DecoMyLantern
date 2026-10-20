# BeMyParol (formerly Deco My Lantern)

**BeMyParol** is a mobile-first Filipino Christmas *parol* experience. Every accepted friend keeps an identifiable light in the central tambor and adds **three actual visual growth layers** to an elaborate, round/floral festival-style parol inspired by San Fernando, Pampanga. A single visible outer boundary completes every three growth layers. Fifty friends therefore create 150 filled growth layers and 50 outer bands across 15 geometric, floral and illuminated regions. Friend milestones at **0, 3, 10, 23, 40 and 50** unlock six selectable design families.

The parol looks complete even with **zero friends**: a compact festival lantern with intricate glass windows, a floral-starburst tambor, diamond patterns and decorative lighting. Every friend triggers a three-wave visual reveal and one completed outer band; the camera fits the growing design. **No dangling tail, cord, tassels or ribbon fringe.** Design unlocks are separate from ongoing visual evolution; friends can continue joining past 50.

> **Development status:** Passwordless owner access and guest invitations exist. The extended 150-layer procedural design and three-wave animation require local build and browser validation before release. The owner Christmas inbox UI and production abuse controls remain incomplete; full .NET, SQL Server and browser validation are required before release.

## How the app is intended to work

- **Owners** create a seasonal parol without signing up or logging in. The API gives the browser a secure HTTP-only owner cookie and shows a reusable 22-character private recovery key once (old 43-character keys remain accepted if valid).
- **Friends** open the owner's single short invitation link without creating an account, then contribute one light per browser visitor and optionally leave a sealed Christmas message.
- Each accepted contribution keeps a stable central light and adds three connected ornament layers, with one visible contour after all three. The first 150 layers span 15 distinct festival-inspired regions instead of repeating the previous final design.
- Owners can switch among designs unlocked by their reached friend milestones (0/3/10/23/40/50). A previously selected design stays available.
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
| Owner access | Hashed 256-bit random tokens in SQL Server, HTTP-only cookie, reusable one-year recovery key; Identity database retained for existing foreign keys |
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

Create/update the database using the **committed EF Core migrations**. Task 1 updates design and stage seeds; Task 2 adds the `OwnerCredentials` table without deleting prior user/parol data:

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

Open the site and choose **Create my parol**. No email/password is needed. **Copy your private recovery key and keep it safe before continuing.** The owner session persists in a secure HTTP-only browser cookie across refreshes. The original recovery key remains usable for one year from creation and does not change when restoring the parol. Use **Leave parol** to revoke the browser session; recovering access afterward requires the same recovery key. You can preview six evolving design families, simulate individual friends using the +1 friend button, and jump to 0/3/10/23/40/50 friend milestones without changing real contributions.

The dashboard displays real accepted contributions. Owners can create, copy and revoke invitation links. The Christmas inbox still needs its full owner UI; message bodies remain server-protected until December 25.

**Owner API security:** The server authenticates by looking up the SHA-256 hash of a 256-bit random browser token in SQL on each protected request. The token is only sent in an HTTP-only SameSite=Strict cookie (Secure on HTTPS/production); React does not read or persist it. All writes require a fresh CSRF token from `GET /api/owner/csrf`. Only public catalogs are cached for two minutes — never owner identity or recovery codes. See the [API contracts](docs/api-contracts.md).

## Friend invitations — Task 4

Once your parol exists, copy its single invitation link and share it with friends. Friends can open their own guest page, enter a name, and optionally leave a Christmas note. The invitation link never contains your private owner or recovery key. One light per guest browser is enforced with a secure cookie and SQL constraints; this does not prove unique human identity. Links expire December 31 Philippine time, and revoking a link does not remove existing contributions.

The share secret is only returned once, so save the copied URL or create a new link when needed (old links continue working). See [Task 4: invitations, security and real-guest test plan](docs/task4-friend-invitations.md). Its local SQL smoke test inserts 51 guests and must **never** be used against production.

## Short invitation link and recovery key

- Each seasonal parol has one official invitation URL: `https://bemyparol.site/#/i/<16-character-token>`. It is created with the parol, stays identical after reload, and expires December 31 Philippine time. Older long invitation URLs are retired, but existing lights and messages remain.
- New owners receive a **22-character** recovery key, reusable throughout its original one-year lifetime. Existing valid 43-character recovery keys remain accepted.
- The server stores only the SHA-256 invitation hash plus an AES-GCM encrypted copy so the owner can retrieve the same link. Set a **persistent 32-byte Base64 encryption key** using `Invitations:EncryptionKey` (`INVITATION_ENCRYPTION_KEY` for Docker) before creating parols. Never change or lose this value while issued invitations must remain readable.
- For local development, generate a secret once with `openssl rand -base64 32`, then set it from the API project's directory using `dotnet user-secrets set "Invitations:EncryptionKey" "<generated-secret>"`. For Docker, put it in the ignored root `.env` under `INVITATION_ENCRYPTION_KEY`.
- Upgrade existing databases with `dotnet ef database update --project src/backend/DecoMyLantern.Api --startup-project src/backend/DecoMyLantern.Api`; the existing `database/schema.sql` also contains the new idempotent migration section.

## Existing-user migration and recovery

Existing users and lantern data are retained. If you have a still-valid old `Deco.Host` cookie, use **Transfer my existing parol** to issue a new owner token and recovery key. Without that valid old cookie, a previous email/password alone cannot access the new system; plan a separately verified migration before public rollout. Newly created parols can be restored with the private recovery key. **If both your browser cookie and recovery key are lost, there is no built-in recovery mechanism.** Owner tokens have a 400-day lifetime; recovery keys expire 365 days after issuance and can be reused without limit before then. Do not share a recovery key in the public friend invitation link. HTTPS is required in production.

## Run with Docker Compose

The deployment `compose.yaml` builds two application images: the ASP.NET Core API and a production frontend served by Nginx. Caddy routes both hostnames inside Docker, and an optional `cloudflared` service connects them to Cloudflare without inbound ports. The frontend is available locally at `http://localhost:5173`, and Nginx forwards `/api/` requests to the backend. The API is also available locally at `http://localhost:5050`. The tracked `compose.yml` is a separate SQL Server-only development configuration; select either file explicitly with `-f`.

Copy the root `.env.example` to `.env` and set `DATABASE_CONNECTION_STRING` for an existing SQL Server instance. For SQL Server on your Docker host, use `host.docker.internal` as shown in the example. The connection string must point to a database with the committed EF Core migrations applied; see [Database and migrations](docs/database-schema.md). No database container is included in the deployment `compose.yaml`.

```bash
cp .env.example .env
# Edit .env with your SQL Server credentials.
docker compose -f compose.yaml up --build -d
docker compose -f compose.yaml ps
```

Check `http://localhost:5173` for the frontend and `http://localhost:5173/api/health` for the API through Nginx. Use `docker compose -f compose.yaml down` to stop the stack. `FRONTEND_PORT` and `BACKEND_PORT` in `.env` can change the local host ports.

### Public domains through Cloudflare Tunnel

The request path is `Cloudflare HTTPS → cloudflared → Caddy → frontend or backend`. Caddy serves HTTP only within the Docker network and on host loopback port 80. It routes `bemyparol.site` to the frontend and `api.bemyparol.site` to the backend. The backend's `/api/...` routes remain available; on `api.bemyparol.site`, `/health` is the public health URL and `/api/health` redirects to it. The direct frontend and backend ports are bound to localhost only.

The Compose `cloudflared` service can serve this tunnel on its own. If another connector runs directly on the host, it must resolve `caddy` to `127.0.0.1`, where Compose publishes Caddy on port 80; otherwise requests sent to that connector return 502. A host entry of `127.0.0.1 caddy` provides that mapping.

1. In Cloudflare Zero Trust, create a **remotely managed** tunnel for the `bemyparol.site` zone, or use an existing one. Copy its connector token into `CLOUDFLARED_TOKEN` in the root `.env` file. Keep that file private; Git ignores it.
2. In that tunnel's **Public hostnames** settings, point both `bemyparol.site` and `api.bemyparol.site` to the service URL `http://caddy:80`. Set the **HTTP Host Header** on each route to its own hostname (`bemyparol.site` or `api.bemyparol.site`) so Caddy selects the matching site. Replace any conflicting existing DNS record or tunnel route for these names; Cloudflare creates the tunnel DNS records when these hostnames are published.
3. Start the connector with `docker compose -f compose.yaml --profile tunnel up -d`. It uses outbound connections; no inbound port forwarding is required. Check `docker compose -f compose.yaml --profile tunnel ps` and `docker compose -f compose.yaml logs cloudflared` for its connection status.

After the tunnel and hostnames are connected, check these public routes:

```bash
curl -i https://bemyparol.site/
curl -i https://bemyparol.site/api/health
curl -i https://api.bemyparol.site/health
```

### SSH through the tunnel

Publish `ssh.bemyparol.site` on the same Cloudflare Tunnel as an **SSH** service with origin `host.docker.internal:22`, not an HTTP service pointing to Caddy. The Compose `cloudflared` service maps `host.docker.internal` to the Docker host, where SSH listens on port 22. If a second `cloudflared` connector runs directly on the host, add `127.0.0.1 host.docker.internal` to that host's `/etc/hosts` so both connectors reach the same SSH server. Protect the hostname with a Cloudflare Access policy for the intended users.

For native SSH, install `cloudflared` on the client and add this to the client's `~/.ssh/config` (adjust the `cloudflared` path if needed):

```sshconfig
Host ssh.bemyparol.site
    ProxyCommand cloudflared access ssh --hostname %h
```

Then connect with `ssh mark@ssh.bemyparol.site`. The Cloudflare tunnel uses HTTPS/WebSocket transport for this hostname, so a plain `ssh` connection to port 22 on the public hostname does not work without the client-side proxy command.

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

On GitHub, open a pull request with **base: `dev`** and **compare: your feature branch**. Share the manual lint, typecheck, test, and build results in the PR description, review the diff, and then use **Create a merge commit** (the standard **Merge pull request** option). Do not use **Squash and merge** or **Rebase and merge**. No automated checks will be generated.

### Bring new dev changes into an active feature

If teammates have merged work while you're still coding:

```bash
git fetch origin
git switch feature/short-description
git merge origin/dev
```

Resolve any conflicts, rerun the relevant checks, and push your branch.

### Release from dev to main

If `main` has independent commits that block a release PR, first merge `main` into a branch created from `dev`, resolve conflicts there, and merge that branch back into `dev` through a PR. Then release `dev` to `main` normally.

Only the repository owner:

1. Confirms `dev` is stable and the manual checks pass.
2. Opens a PR with **base: `main`** and **compare: `dev`**.
3. Verifies the manual release checks and merges the PR into `main` using **Create a merge commit** (required, not merely preferred).
4. Keeps ongoing development on `dev`.

Do not merge feature branches directly to `main`, force-push protected branches, or commit SQL Server database files or credentials.

## More documentation

- [Detailed local setup](docs/setup-guide.md)
- [Architecture](docs/architecture.md)
- [Parol renderer and light-slot rules](docs/parol-renderer.md)
- [Living parol design system and unlock milestones](docs/living-parol-design.md)
- [Task 3: 50-friend growth capacity checks](docs/task3-50-friend-capacity.md)
- [Task 4: Friend invitation and contribution workflow](docs/task4-friend-invitations.md)
- [Database and migrations](docs/database-schema.md)
- [API routes](docs/api-contracts.md)
- [GitHub branch protection](docs/github-protection.md)
- [Contribution guidelines](CONTRIBUTING.md)
