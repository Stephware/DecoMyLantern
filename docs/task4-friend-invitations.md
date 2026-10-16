# Task 4 — BeMyParol friend invitation and contribution workflow

**Implementation branch:** `feature/task4-friend-invitations`  
**Dependency:** Task 2 owner-token authentication branch / PR #11; this task is stacked on it, not on unverified `dev`.  
**Status:** Code prepared; manual frontend/backend builds and real SQL Server concurrency tests must pass before deployment.

## 1. Workflow

### Owner

1. Create a parol using Task 2's passwordless owner access.
2. In **Invite your friends**, choose **Create invitation link**.
3. The API generates a cryptographically random **256-bit invitation token** and stores **only its SHA-256 hash** in SQL Server's existing `ShareLinks` table.
4. The frontend creates a link such as `https://bemyparol.site/#/invite/<token>` and displays it for copying. This token has no connection to the owner token or recovery key.
5. Existing links continue to work when a new link is issued. The owner can list active links and revoke one without deleting previous contributions.
6. The token is returned in plaintext **only at creation**. It is not recoverable from the SQL hash after a refresh; generating a fresh link is safe and does not revoke previous links. For long-term sharing, save the copied URL yourself.
7. An invitation expires at the end of **December 31 Philippine Standard Time** for the parol's season; revoked or expired links cannot preview or accept more contributions.

### Friend

1. Open the fragment URL. The React app shows a **different, guest-only view**, not the owner's editing tools.
2. React posts the link secret in a JSON request body to `POST /api/invitations/preview`. The token is **not** included in API route paths or query parameters.
3. The server validates the hashed secret, expiry and revocation; returns the current parol theme/pattern, number of accepted lights, and public light positions. It **never** returns message bodies, owner identity, credentials, or other contributors' names.
4. The visitor enters a **required display name** (1–80 trimmed characters) and an **optional Christmas note** (up to 500 trimmed characters), then selects **Add my light**.
5. The API enforces CSRF and rate limiting and uses a randomly generated persistent **HTTP-only guest cookie** to identify the visitor. SQL stores only its hash in `GuestVisitors`.
6. All contribution writes run in a **serializable SQL Server transaction**. An `UPDLOCK, HOLDLOCK` on the lantern row serializes `NextSlotIndex` allocation, and unique indexes on `(LanternId, GuestVisitorId)` and `(LanternId, SlotIndex)` prevent duplicate browser-visitor contributions and slot collisions.
7. The transaction persists the contribution, assigned light position index, and optional private message together. A success response includes updated **public** parol data but **not** message text. The friend sees confirmation; the owner sees the accepted light after refreshing.
8. The server's existing Christmas inbox logic reveals stored message bodies **only to the authenticated owner, on/after December 25 00:00 Philippine Standard Time**. Guests never access this inbox.

**Caveat:** A browser cookie is not a real human identity. A visitor who deletes their cookie or switches devices can appear as a new visitor. This implementation reduces accidental duplicates but cannot guarantee unique real-world individuals. Additional spam/abuse protections should be added before a high-traffic public launch.

## 2. API endpoints

| Method | Route | Access | Behavior |
| --- | --- | --- | --- |
| GET | `/api/my/lantern/invitations` | Owner | List metadata for this season's links; no plaintext token returned |
| POST | `/api/my/lantern/invitations` | Owner + CSRF | Generate link; return `{ id, token, expiresAtUtc }` once |
| DELETE | `/api/my/lantern/invitations/{id}` | Owner + CSRF | Revoke only owner's link |
| GET | `/api/invitations/csrf` | Public | Set guest cookie if absent, issue antiforgery token |
| POST | `/api/invitations/preview` | Public + CSRF | JSON `{ token }`; public parol, light slots, already-contributed status |
| POST | `/api/invitations/contribute` | Guest + CSRF | JSON `{ token, displayName, message? }`; allocate one light, optional sealed note |

- Guest requests carry their own browser cookie and the CSRF token retrieved via `GET /api/invitations/csrf`; both endpoints use `Cache-Control: no-store`.
- Invalid, expired or revoked link → `404`.
- Duplicate browser visitor or concurrent conflicting write → `409`; the UI refreshes the preview before suggesting any retry.
- Public preview is limited to 120 requests per minute per observed IP; contributions to 80 per 15 minutes per observed IP; new owner invitations to 10/hour per owner. **Limiters are in memory and per instance**; multi-instance Google Cloud deployments need shared abuse controls and correctly trusted proxy addresses.
- Tokens use URL-safe Base64 and are generated from `RandomNumberGenerator.GetBytes(32)`; plaintext **owner/recovery secrets are never used in invitation URLs**.

## 3. Data model

No schema changes were necessary: Task 1 already seeded visual progression and Task 2 adds `OwnerCredentials`, while the existing schema contains `ShareLinks`, `GuestVisitors`, `Contributions`, and `Messages`.

`ShareLinks.TokenHash` and `GuestVisitors.TokenHash` are uniquely indexed. `Contributions` has unique indexes for browser-visitor-per-parol and per-parol-slot; `Messages.ContributionId` is unique. No migrations or SQL schema files change in Task 4.

## 4. Developer verification checklist

First, **fully validate and merge Task 2's PR**; Task 4 branches from it. Task 3's separate tests are still awaiting their own PR merge.

Run from the repository root on the Task 4 branch:

```bash
dotnet restore DecoMyLantern.slnx
dotnet build DecoMyLantern.slnx --configuration Release
dotnet test DecoMyLantern.slnx --configuration Release
cd src/frontend
npm ci
npm run test
npm run lint
npm run typecheck
npm run build
```

Run the API against a **disposable local SQL Server database** with all Task 1/2 migrations applied, including the owner credential table. Open a second terminal and, **from the repo root**, execute:

```bash
node scripts/invitation-smoke.mjs --confirm-dev-database
```

The script deliberately creates two new internal owners and **51 guest contributions**. It checks 49 sequential + two concurrent contributions (49→50→51), 51 unique stable slots, duplicate rejection, unauthorized revocation, private inbox authorization, and link revocation without deleting prior lights. **Never point it at production.**

Then visually inspect the flow manually on desktop and mobile (320, 375 and 430 px): copy/share, open invitation in a separate private browser, theme consistency, text legibility, guest acceptance, one-light confirmation, no private message exposure, and owner refresh showing the added light. Verify that reloading the same link shows `Already contributed`; also try a revoked link, an invalid link, and the same link after the seasonal expiry in a controlled-clock test environment.

## 5. Explicitly not verified yet

- No .NET SDK or user's SQL Server instance is available in this execution environment. The API build, EF migration application, real concurrency behavior and the integration script have **not been executed**.
- Automated Node invitation-route tests can be run without a database; full browser rendering and React production build still need local `npm ci`.
- Production spam prevention, distributed throttling, moderation, real-human duplicate assurance, and dedicated message reporting remain additional launch-hardening tasks.
- Task 3's capacity test covers SVG geometry, but this invitation task's database-level 50-friend test must be **run locally** before claiming production readiness.
