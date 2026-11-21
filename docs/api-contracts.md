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
| POST | `/api/owner/recovery-key` | Owner + CSRF + rate limit | Show current still-valid recovery key if an encrypted copy is available; otherwise `available: false` |
| POST | `/api/owner/replace-recovery-key` | Owner + CSRF + rate limit | Explicitly issue and display a new recovery key; invalidates the previous key but keeps the current session, parol and invitation intact |
| POST | `/api/owner/sign-out` | Owner + CSRF | Revoke the token in SQL; recovery key remains usable |
| GET | `/api/owner/legacy-available` | Existing legacy Identity cookie | Detect an old logged-in owner |
| GET | `/api/owner/legacy-csrf` | Existing legacy Identity cookie | Issue legacy-identity-bound CSRF token |
| POST | `/api/owner/upgrade-legacy` | Existing legacy Identity cookie + CSRF | Transfer existing owner to token access, preserving user and lantern IDs |

`POST /api/owner/create` returns status 201 with `{ "owner": { "id": "..." }, "recoveryCode": "..." }`; `upgrade-legacy` returns the same shape with 200. `recover` returns `{ "owner": { "id": "..." } }` with 200 and sets a new session cookie. The original recovery key is shown when first issued and reused without rotation during its one-year lifetime. New keys are stored as a hash plus a per-owner AES-GCM-encrypted copy; only an authenticated, CSRF-protected recovery-key popup can reveal the encrypted copy. The key is not returned from `/me` or `recover`, nor included in invitation URLs, logs or public caches. Recovery codes are never saved to frontend localStorage.

Creation leaves setup pending while the recovery key is shown. Continuing calls `finish-setup`; cancelling calls `cancel-creation`, which removes the new owner, its parol, official invitation, and credential in one transaction. Cancellation is rejected after setup finishes or the parol has been used. Recovery and legacy transfer cannot use this cancellation flow.

Recovery body: `{ "recoveryCode": "base64url-secret" }`. Recovery invalidates the old owner cookie but **does not change or consume the original recovery key**. Owner browser sessions are 256-bit random, while newly issued recovery keys are 128-bit random (22 characters); existing 256-bit recovery keys remain accepted. Their hashes are unique indexed values. Recovery is limited to 6 attempts per 15 minutes per observed IP; creation is limited to 6/hour per observed IP. Authenticated key reveal is limited to 18/hour per owner and replacement to 3/hour per owner. These in-memory counters are per API instance, and production deployments need shared rate limiting and trusted-proxy IP configuration. Owner sessions expire after 400 days; recovery keys expire 365 days after their issuance and are not renewed on use. Legacy keys keep their original one-year deadline; an explicitly replaced key receives a new one-year deadline and its previous key stops working immediately. Without a valid session or the recovery key, access cannot be regained automatically; verified email recovery is *not* provided.

Every modifying request first calls `GET /api/owner/csrf` and includes `X-CSRF-TOKEN` plus the same cookies. The legacy migration uses `/api/owner/legacy-csrf` instead. Responses containing owner tokens or recovery codes carry `Cache-Control: no-store`. Owner validation **never trusts the memory cache**; the 2-minute `IMemoryCache` is used only for read-only public design and growth catalog responses.

**Migration caveat:** An existing owner can transfer an old parol only while an old, valid `Deco.Host` login cookie is still present. Existing lantern/user records are NOT deleted. Legacy owners without a valid cookie and without a recovery key cannot migrate by password through the new UI; arrange a separately verified migration before production rollout. The former `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, and login page are removed.

### Redisplaying and replacing owner recovery keys

The owner header has a **Recovery key** action beside **Leave parol**.
Both open a popup; Leave must first display this popup, allowing Copy, Stay
or Leave. The original single-link invitation is never affected.

The new migration `20261029080000_EncryptedOwnerRecoveryKeys` adds nullable
`OwnerCredentials.EncryptedRecoveryCode` and
`OwnerCredentials.RecoveryIssuedAtUtc` columns. Existing hashes, owner
cookies, invitations, lights, and parol records are preserved.

- New keys: encrypted using AES-256-GCM with a distinct purpose-derived key
  from the **existing stable** `Invitations:EncryptionKey`, authenticated
  against `OwnerUserId`; still stored as SHA-256 hashes for redemption.
  Rotating `Invitations:EncryptionKey` will now prevent redisplay of saved
  owner recovery codes as well as existing invitation links.
- Existing owners: their stored one-way hash cannot be decrypted. A read
  returns `available: false`. They can use their saved original recovery key
  unchanged, or **explicitly** confirm a replacement key. The old key becomes
  invalid only if the replacement is committed.
- A legacy key supplied successfully during `/api/owner/recover` can
  additionally be encrypted without changing its hash or lifetime.
- The frontend never stores these keys in localStorage or sessionStorage.
  The popup contains the plaintext only while mounted. Both new endpoints
  are POST actions requiring an authenticated owner cookie and CSRF, and use
  no-store responses.
- `POST /api/owner/recovery-key` yields
  `{ "available": true|false, "recoveryCode": "...|null", "expiresAtUtc": "..." }`.
  `POST /api/owner/replace-recovery-key` yields the new key with
  `available: true`, expiring one year from replacement. A replacement
  does not revoke a valid *browser session*; sign-out does.

**Before deploying** this new API, back up the production database and
apply the latest EF Core migration to that same existing database. Do not
recreate or overwrite it. Without the migration, owner key operations will
fail. There is no need for a new environment secret because it derives a
purpose-separated key from the stable invitation encryption secret.

## Phase 1 — Host's seasonal lantern

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/my/lantern` | Owner token | Current Philippine-season lantern; 404 until created |
| POST | `/api/my/lantern` | Owner token + CSRF | Create the current season's default Classic lantern; 201 or 409 if already exists |
| PUT | `/api/my/lantern` | Owner token + CSRF | Update any enabled design family and visual pattern; friend milestones do not lock designs |

PUT JSON: `{ "designKey": "classic", "patternKey": "rings" }`.

Supported `patternKey` values: `default`, `rings`, `rays`. The six enabled families are `classic`, `floral`, `festival`, `celestial`, `fiesta` and `sampaguita` — all selectable starting at zero friends. Pattern and selected design are persisted in the existing `Lanterns` table.

Lantern responses include `id`, `seasonYear`, `designKey`, `paletteKey`, `patternKey`, `acceptedFriends`, `maxReachedFriends`, `growthStage`, `unlockAtUtc`, and `createdAtUtc`. These are computed from server-side ownership and real accepted contribution rows, never from client-submitted friend counts. Unique DB index protects one lantern per host per season.

## Existing public/read-only endpoints

- GET `/api/health` — liveness
- GET `/api/designs` — enabled catalogue (`designKey`, `name`, `assetKey`, `requiredFriends`); `requiredFriends` is legacy growth milestone metadata, not a selection gate.
- GET `/api/growth-stages` — visual growth milestones (0, 3, 10, 23, 40, 50 friends); parol growth is unchanged.
- GET `/api/my/lanterns/{lanternId}/messages` — owner-authenticated Christmas inbox. Message bodies remain redacted before Christmas for regular parols; an admin-marked parol can read its own messages early for debugging.

## Responsive design selection and full-bloom showcases

- GET `/api/designs/{designKey}/showcase` — public, rate-limited WebP preview
  for an enabled design family rendered at **50 synthetic friends / 150 growth
  layers** with `patternKey: default`. No real owner, message, guest or
  invitation data is accessed or included. Browser cache is public for one day;
  the underlying private renderer has its own content-addressed disk cache.
- A new owner is offered a design picker **after** saving the private recovery
  key. All six choices can be selected immediately; no fake friends are stored.
  The choice is persisted through the existing owner-authenticated, CSRF-protected
  `PUT /api/my/lantern` endpoint. A new owner's one-time picker dismissal is
  remembered in localStorage **for UX only**, never for login or recovery.
- On phones, the design gallery lives in a swipe-up/down drawer with an arrow
  button. The real parol remains a single saved WebP; selecting a card alone
  does not change the saved image until Save. On desktop the same gallery opens
  in a modal. Designs can be changed later without resetting contributions.
- The separate testing lab remains available inside a collapsed section until
  staging deployment is implemented in a later phase.

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

## Phase 2 — Cached parol image snapshots

The existing approved parol SVG can be rasterized into one transparent
**1200 × 1280** WebP or PNG image, generated by the private Story/Remotion
renderer and cached on disk by canonical actual parol state.

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/api/my/lantern/image` | Owner + CSRF + rate limit | Render/reuse the saved owner's current parol |
| POST | `/api/invitations/image` | Valid invitation + CSRF + rate limit | Render/reuse a safely disclosed public parol |

Bodies: `{"format":"webp"}` for the owner, and
`{"token":"16-char-invitation","format":"webp"}` for guests. Format can be
`webp` (default) or `png`. The response is binary `image/webp` or
`image/png`, with `X-Parol-Cache: HIT|MISS`. The API retrieves the
current design, pattern, friend count and occupied slots from SQL rather
than accepting untrusted renderer input from clients. No messages or secrets
enter the snapshot. Binary responses are `no-store` at the HTTP layer;
the private renderer maintains the 24-hour, 128-image disk cache.
A cold request while the renderer is busy responds 503 with Retry-After.
No DB migration or changes to the current live frontend are part of Phase 2.
See [Parol image snapshots](parol-image-snapshots.md).

## Planned for later phases

Single official invitation issuance/retrieval and anonymous contributions are implemented in Task 4. Production distributed abuse controls, real-human identity verification, moderation/reporting UI and completed owner inbox UI are still pending.
