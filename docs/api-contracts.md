# API contracts

All endpoints are served from the ASP.NET Core API on `http://localhost:5050`. During local frontend development, use the Vite proxy at `/api`.

## Task 2 — Passwordless owner access

The owner never registers or logs in. The API creates an internal, passwordless Identity row solely to preserve the existing owner-to-parol foreign key. It authenticates future requests using a **256-bit random owner token**, delivered only as a persistent **HTTP-only, SameSite=Strict cookie** (`BeMyParol.Owner`, path `/api`, `Secure` outside local development). SHA-256 hashes, never plaintext tokens, are stored in the SQL Server `OwnerCredentials` table. The server validates the token against SQL **on every authorized request**. Owner tokens are **not** stored in localStorage/sessionStorage or exposed to React.

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/owner/csrf` | Public | Issue request CSRF token |
| POST | `/api/owner/create` | Public + CSRF + rate limit | Create anonymous owner and seasonal parol, set token cookie, return private recovery code once |
| POST | `/api/owner/finish-setup` | Owner + CSRF | Confirm the newly created parol and close its cancellation window |
| POST | `/api/owner/cancel-creation` | Owner + CSRF | Delete a still-pending new owner, parol, and credential; clear the owner cookie |
| GET | `/api/owner/me` | Owner | Return `{ "id": "guid" }` |
| POST | `/api/owner/recover` | Public + CSRF + rate limit | Reuse the same high-entropy recovery key within one year, refresh owner session only |
| POST | `/api/owner/sign-out` | Owner + CSRF | Revoke the token in SQL; recovery key remains usable |
| GET | `/api/owner/legacy-available` | Existing legacy Identity cookie | Detect an old logged-in owner |
| GET | `/api/owner/legacy-csrf` | Existing legacy Identity cookie | Issue legacy-identity-bound CSRF token |
| POST | `/api/owner/upgrade-legacy` | Existing legacy Identity cookie + CSRF | Transfer existing owner to token access, preserving user and lantern IDs |

`POST /api/owner/create` returns status 201 with `{ "owner": { "id": "..." }, "recoveryCode": "..." }`; `upgrade-legacy` returns the same shape with 200. `recover` returns `{ "owner": { "id": "..." } }` with 200 and sets a new session cookie. The original recovery key is shown when first issued, reused without rotation during its one-year lifetime, and is not returned from `/me` or `recover`. It must never appear in invitation URLs, logs, or public caches.

Creation leaves setup pending while the recovery key is shown. Continuing calls `finish-setup`; cancelling calls `cancel-creation`, which removes the new owner, its parol, official invitation, and credential in one transaction. Cancellation is rejected after setup finishes or the parol has been used. Recovery and legacy transfer cannot use this cancellation flow.

Recovery body: `{ "recoveryCode": "base64url-secret" }`. Recovery invalidates the old owner cookie but **does not change or consume the original recovery key**. Owner browser sessions are 256-bit random, while newly issued recovery keys are 128-bit random (22 characters); existing 256-bit recovery keys remain accepted. Their hashes are unique indexed values. Recovery is limited to 6 attempts per 15 minutes per observed IP; creation is limited to 6/hour per observed IP. These in-memory counters are per API instance, and production deployments need shared rate limiting and trusted-proxy IP configuration. Owner sessions expire after 400 days; recovery keys expire 365 days after original issuance without renewal on use. Existing keys with longer stored expiration dates are also restricted to one year from their credential creation. Without a valid session or the recovery key, access cannot be regained automatically; verified email recovery is *not* provided.

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

The owner receives one short, cryptographically random 96-bit (16-character) invitation per seasonal parol through the idempotent `POST /api/my/lantern/invitations`. It is issued automatically when creating a new parol, while existing parols receive it on their first dashboard visit. A SHA-256 hash plus an AES-GCM encrypted copy are stored in the existing `ShareLinks` table; the encrypted token is recoverable only using the persistent configured `Invitations:EncryptionKey`. The frontend builds `https://bemyparol.site/#/i/<token>` and sends tokens in POST JSON bodies, not paths or query strings. Historical invitation rows remain but are no longer valid.

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/api/my/lantern/invitations` | Owner + CSRF | Retrieve or create the same single official invitation (returns its token and expiry) |
| GET | `/api/invitations/csrf` | Public | Set HTTP-only guest cookie and provide CSRF token |
| POST | `/api/invitations/preview` | Public + CSRF | `{ token }` returns safe public parol and contributed status |
| POST | `/api/invitations/contribute` | Guest + CSRF | `{ token, displayName, message? }` returns assigned light slot and safe preview |

Name: 1–80 characters after trimming; optional message: at most 500 characters. Guest cookies are random, HTTP-only, and hashed in SQL. Contribution/slot uniqueness indexes and SQL `UPDLOCK` / serializable transaction prevent accidental browser duplicates and slot collisions. Invalid/retired/expired links yield 404; duplicate submissions yield 409. Guest previews never return message text, owner ID, owner credentials, or other contributors' display names. Links expire at 23:59:59 on December 31 Philippine time. Rate limiting is per API instance pending future production hardening.

See the [Task 4 workflow and integration test guide](task4-friend-invitations.md).

## Animated Story sharing (web-first)

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/api/my/lantern/story` | Owner + CSRF + hourly rate limit | Render owner's saved parol MP4 or PNG |
| POST | `/api/invitations/story` | Guest who already contributed + valid invitation + CSRF + hourly rate limit | Render contributor's parol MP4 or PNG |

Both accept `{ "format": "mp4" }` or `{ "format": "png" }`; the guest request also includes the 16-character `token` as a JSON field. The API reads design, pattern, current light slots and verified contributor identity from SQL, never from untrusted client media props. Both endpoints stream binary output with `video/mp4` or `image/png` and never include message bodies, recovery keys or names. The backend sends sanitized data over its private network to the Remotion service authenticated by `StoryRenderer:SharedSecret`. See [Story sharing setup and limitations](story-sharing.md).

## Planned for later phases

Single official invitation issuance/retrieval and anonymous contributions are implemented in Task 4. Production distributed abuse controls, real-human identity verification, moderation/reporting UI and completed owner inbox UI are still pending.
