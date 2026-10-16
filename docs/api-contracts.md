# API contracts

All endpoints are served from the ASP.NET Core API on `http://localhost:5050`. During local frontend development, use the Vite proxy at `/api`.

## Task 2 — Passwordless owner access

The owner never registers or logs in. The API creates an internal, passwordless Identity row solely to preserve the existing owner-to-parol foreign key. It authenticates future requests using a **256-bit random owner token**, delivered only as a persistent **HTTP-only, SameSite=Strict cookie** (`BeMyParol.Owner`, path `/api`, `Secure` outside local development). SHA-256 hashes, never plaintext tokens, are stored in the SQL Server `OwnerCredentials` table. The server validates the token against SQL **on every authorized request**. Owner tokens are **not** stored in localStorage/sessionStorage or exposed to React.

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/owner/csrf` | Public | Issue request CSRF token |
| POST | `/api/owner/create` | Public + CSRF + rate limit | Create anonymous owner and seasonal parol, set token cookie, return private recovery code once |
| GET | `/api/owner/me` | Owner | Return `{ "id": "guid" }` |
| POST | `/api/owner/recover` | Public + CSRF + rate limit | Redeem high-entropy recovery key, rotate both owner token and recovery key |
| POST | `/api/owner/recovery-code` | Owner + CSRF | Rotate recovery key while still in possession of owner session |
| POST | `/api/owner/sign-out` | Owner + CSRF | Revoke the token in SQL; recovery key remains usable |
| GET | `/api/owner/legacy-available` | Existing legacy Identity cookie | Detect an old logged-in owner |
| GET | `/api/owner/legacy-csrf` | Existing legacy Identity cookie | Issue legacy-identity-bound CSRF token |
| POST | `/api/owner/upgrade-legacy` | Existing legacy Identity cookie + CSRF | Transfer existing owner to token access, preserving user and lantern IDs |

`POST /api/owner/create` returns status 201 with `{ "owner": { "id": "..." }, "recoveryCode": "..." }`; `recover` and `upgrade-legacy` return the same shape with 200. The recovery code is **only shown once per issue/rotation**. It is not returned from `/me`, does not appear in shareable URLs, and must never be logged or stored in a public client cache.

Recovery body: `{ "recoveryCode": "base64url-secret" }`. Recovery **invalidates the old owner cookie AND old recovery key**. Both secrets are 256-bit random; their hashes are unique indexed values. Recovery is limited to 6 attempts per 15 minutes per observed IP; creation is limited to 6/hour per observed IP. These in-memory counters are per API instance, and production deployments need shared rate limiting and trusted-proxy IP configuration. Owner sessions expire after 400 days, and recovery keys after 730 days. Without a valid session or the recovery key, access cannot be regained automatically; verified email recovery is *not* provided.

Every modifying request first calls `GET /api/owner/csrf` and includes `X-CSRF-TOKEN` plus the same cookies. The legacy migration uses `/api/owner/legacy-csrf` instead. Responses containing owner tokens or recovery codes carry `Cache-Control: no-store`. Owner validation **never trusts the memory cache**; the 2-minute `IMemoryCache` is used only for read-only public design and growth catalog responses.

**Migration caveat:** An existing owner can transfer an old parol only while an old, valid `Deco.Host` login cookie is still present. Existing lantern/user records are NOT deleted. Legacy owners without a valid cookie and without a recovery key cannot migrate by password through the new UI; arrange a separately verified migration before production rollout. The former `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, and login page are removed.

## Phase 1 — Host's seasonal lantern

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/my/lantern` | Owner token | Current Philippine-season lantern; 404 until created |
| POST | `/api/my/lantern` | Owner token + CSRF | Create the current season's default Classic lantern; 201 or 409 if already exists |
| PUT | `/api/my/lantern` | Owner token + CSRF | Update selected design and visual pattern; all enabled designs are selectable immediately |

PUT JSON: `{ "designKey": "classic", "patternKey": "rings" }`.

Supported `patternKey` values: `default`, `rings`, `rays`. Supported designs currently seeded: `classic`, `floral`, `festival` — all available at zero friends. Pattern and selected design are persisted in the existing `Lanterns` table.

Lantern responses include `id`, `seasonYear`, `designKey`, `paletteKey`, `patternKey`, `acceptedFriends`, `growthStage`, `unlockAtUtc`, and `createdAtUtc`. These are computed from server-side ownership and real accepted contribution rows, never from client-submitted friend counts. Unique DB index protects one lantern per host per season.

## Existing public/read-only endpoints

- GET `/api/health` — liveness
- GET `/api/designs` — enabled parol designs (`designKey`, `name`, `assetKey`); no friend requirement
- GET `/api/growth-stages` — five descriptive visual ranges (starts at 0, 1, 6, 16, 31 friends); never unlock requirements
- GET `/api/my/lanterns/{lanternId}/messages` — owner-authenticated Christmas inbox with server-side pre-unlock body redaction; full frontend inbox planned for Phase 4.

## Planned for later phases

Share link management, anonymous guest light/message submissions, anti-abuse safeguards, and message reporting UI/API are **not yet implemented**. Do not expose public mutations without invitation verification, duplicate protection, rate limiting, and transactional light-slot assignment.
