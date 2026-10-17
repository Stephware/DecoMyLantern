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
| PUT | `/api/my/lantern` | Owner token + CSRF | Update selected design and visual pattern; rejects a new locked design with 409, preserves a pre-existing selection |

PUT JSON: `{ "designKey": "classic", "patternKey": "rings" }`.

Supported `patternKey` values: `default`, `rings`, `rays`. Supported designs currently seeded: `classic`, `floral`, `festival` — all available at zero friends. Pattern and selected design are persisted in the existing `Lanterns` table.

Lantern responses include `id`, `seasonYear`, `designKey`, `paletteKey`, `patternKey`, `acceptedFriends`, `maxReachedFriends`, `growthStage`, `unlockAtUtc`, and `createdAtUtc`. These are computed from server-side ownership and real accepted contribution rows, never from client-submitted friend counts. Unique DB index protects one lantern per host per season.

## Existing public/read-only endpoints

- GET `/api/health` — liveness
- GET `/api/designs` — enabled catalog (`designKey`, `name`, `assetKey`, `requiredFriends`); 0/3/10/23/40/50 unlock requirements are enforced by PUT `/api/my/lantern`
- GET `/api/growth-stages` — six design unlock milestones (0, 3, 10, 23, 40, 50 friends)
- GET `/api/my/lanterns/{lanternId}/messages` — owner-authenticated Christmas inbox with server-side pre-unlock body redaction; full frontend inbox planned for Phase 4.

## Task 4 — Friend invitations and contributions

A passwordless owner creates a random 256-bit invitation token with `POST /api/my/lantern/invitations`; only its SHA-256 hash is stored in SQL. The frontend builds a share URL of the form `https://bemyparol.site/#/invite/<token>`. The guest submits the token in a **POST JSON body**, not in an HTTP path or query.

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/my/lantern/invitations` | Owner | List current-season link metadata, never plaintext tokens |
| POST | `/api/my/lantern/invitations` | Owner + CSRF | Issue one new share token and its expiry |
| DELETE | `/api/my/lantern/invitations/{id}` | Owner + CSRF | Revoke an owned invitation without removing lights |
| GET | `/api/invitations/csrf` | Public | Set HTTP-only guest cookie and provide CSRF token |
| POST | `/api/invitations/preview` | Public + CSRF | `{ token }` returns safe public parol and contributed status |
| POST | `/api/invitations/contribute` | Guest + CSRF | `{ token, displayName, message? }` returns assigned light slot and safe preview |

Name: 1–80 characters after trimming; optional message: at most 500 characters. Guest cookies are random, HTTP-only, and hashed in SQL. Contribution/slot uniqueness indexes and SQL `UPDLOCK` / serializable transaction prevent accidental browser duplicates and slot collisions. Invalid/revoked/expired links yield 404; duplicate submissions yield 409. Guest previews never return message text, owner ID, owner credentials, or other contributors' display names. Links expire at 23:59:59 on December 31 Philippine time. Rate limiting is per API instance pending future production hardening.

See the [Task 4 workflow and integration test guide](task4-friend-invitations.md).

## Planned for later phases

Invitation creation/revocation and anonymous contributions are implemented in Task 4. Production distributed abuse controls, real-human identity verification, moderation/reporting UI and completed owner inbox UI are still pending.
