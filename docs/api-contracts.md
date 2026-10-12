# API contracts

All endpoints are served from the ASP.NET Core API on `http://localhost:5050`. During local frontend development, use the Vite proxy at `/api`.

## Phase 1 — Host authentication

Authentication uses **HTTP-only, SameSite=Strict session cookies**, not tokens stored in the browser. React fetch requests use `credentials: 'same-origin'`.

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/auth/csrf` | Public | Issue an anti-forgery token; send it with every state-changing request |
| POST | `/api/auth/register` | Public | Create host and issue session cookie |
| POST | `/api/auth/login` | Public | Authenticate host and issue session cookie |
| GET | `/api/auth/me` | Host | Return authenticated host ID and email |
| POST | `/api/auth/logout` | Host | Clear the session |

Register/login JSON: `{ "email": "example@email.com", "password": "..." }`.

To POST/PUT from an API client, first GET `/api/auth/csrf` with cookie persistence, then send its returned `token` in the `X-CSRF-TOKEN` header **along with the same cookies**. The frontend API client does this automatically for every write. Auth and lantern endpoints reject missing or invalid CSRF tokens.

## Phase 1 — Host's seasonal lantern

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/my/lantern` | Host | Current Philippine-season lantern; 404 until created |
| POST | `/api/my/lantern` | Host + CSRF | Create the current season's default Classic lantern; 201 or 409 if already exists |
| PUT | `/api/my/lantern` | Host + CSRF | Update selected design and visual pattern; applies design unlock rules |

PUT JSON: `{ "designKey": "classic", "patternKey": "rings" }`.

Supported `patternKey` values: `default`, `rings`, `rays`. Supported designs currently seeded: `classic` (0), `floral` (5), `festival` (15 accepted friends). Pattern and selected design are persisted in the existing `Lanterns` table.

Lantern responses include `id`, `seasonYear`, `designKey`, `paletteKey`, `patternKey`, `acceptedFriends`, `growthStage`, `nextMilestone`, `unlockAtUtc`, and `createdAtUtc`. These are computed from server-side ownership and real accepted contribution rows, never from client-submitted friend counts. Unique DB index protects one lantern per host per season.

## Existing public/read-only endpoints

- GET `/api/health` — liveness
- GET `/api/designs` — enabled parol designs
- GET `/api/growth-stages` — structural growth milestones
- GET `/api/my/lanterns/{lanternId}/messages` — owner-authenticated Christmas inbox with server-side pre-unlock body redaction; full frontend inbox planned for Phase 4.

## Planned for later phases

Share link management, anonymous guest light/message submissions, anti-abuse safeguards, and message reporting UI/API are **not yet implemented**. Do not expose public mutations without invitation verification, duplicate protection, rate limiting, and transactional light-slot assignment.
