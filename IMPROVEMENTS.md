# BeMyParol Improvement Opportunities

*Generated from codebase analysis on 2026-11-08*

---

## 🔴 Critical Security & Correctness

### 1. **Recovery Key Rotation Vulnerability** 
**File:** `src/backend/DecoMyLantern.Api/Services/Owner/OwnerAccessService.cs:76-82`

When an owner recovers using an old (hash-only) recovery key, the code encrypts the code and stores it. However, if `OwnerRecoveryPolicy.CanRecover` returns true but the key is already past its 1-year expiry (edge case with clock skew), the old key could be encrypted with a new deadline. 

**Fix:** Add explicit validation that the recovery key was issued within the valid window before encrypting.

### 2. **Missing Guest Visitor Rate Limiting on Contribution**
**File:** `src/backend/DecoMyLantern.Api/Services/Invitations/InvitationService.cs:160-171`

The code checks if a `GuestVisitor` already contributed to this lantern, but doesn't rate-limit *new* `GuestVisitor` creation per IP. An attacker could create unlimited guest visitors and attempt contributions.

**Fix:** Add a rate limit on `GuestVisitor` creation per IP (or fingerprint) in addition to the existing `invitation-contribute` policy.

### 3. **SQL Injection Risk in Raw SQL**
**File:** `src/backend/DecoMyLantern.Api/Services/Invitations/InvitationService.cs:80, 152`

Uses `FromSqlInterpolated` with `$"SELECT ... WHERE [OwnerUserId] = {ownerId}"`. While parameterized, the `UPDLOCK, HOLDLOCK` hints make this fragile if schema changes.

**Fix:** Prefer LINQ with `WithLock` extension or document why raw SQL is necessary. Add integration tests for locking behavior.

### 4. **No Brute-Force Protection on Recovery Key**
**File:** `src/backend/DecoMyLantern.Api/Controllers/OwnerController.cs:62-74`

The `Recover` endpoint has rate limiting (`owner-recover`: 6/15min per IP), but the 22-char (128-bit) recovery key space is large. However, 43-char (256-bit) old keys are still accepted. The rate limit should be stricter for recovery attempts.

**Fix:** Reduce `owner-recover` to 3/15min; add exponential backoff on repeated failures per IP.

---

## 🟠 Architecture & Maintainability

### 5. **Duplicate Cipher Logic**
**Files:** 
- `src/backend/DecoMyLantern.Api/Services/Owner/OwnerRecoveryCipher.cs`
- `src/backend/DecoMyLantern.Api/Services/Invitations/InvitationTokenCipher.cs`

Both implement nearly identical AES-GCM encryption with different key derivation. The only difference is the HMAC purpose string and payload length validation.

**Fix:** Extract a shared `AesGcmCipher` base class or utility with configurable purpose string and expected plaintext lengths.

### 6. **OwnerSession Constants in Multiple Files**
**Files:**
- `src/backend/DecoMyLantern.Api/Services/Owner/OwnerSecrets.cs:44-45`
- `src/backend/DecoMyLantern.Api/Services/Owner/OwnerRecoveryPolicy.cs:14`

`Lifetime` (400 days) and `RecoveryLifetime` (365 days) are defined in `OwnerSession` but used in `OwnerRecoveryPolicy`. If they diverge, bugs occur.

**Fix:** Centralize these in a single `OwnerPolicy` static class; have both reference it.

### 7. **LanternPolicy.SeasonFor Uses Fixed UTC+8 Offset**
**File:** `src/backend/DecoMyLantern.Api/Services/Lanterns/LanternPolicy.cs:8`

```csharp
utcNow.ToUniversalTime().AddHours(8).Year
```

This assumes Philippine Time is always UTC+8 (no DST). Correct for PST, but fragile if requirements change.

**Fix:** Use `TimeZoneInfo.FindSystemTimeZoneById("Singapore Standard Time")` (covers PST) or `Asia/Manila` on Linux, with a fallback.

### 8. **Magic Numbers in Rate Limiting**
**File:** `src/backend/DecoMyLantern.Api/Program.cs:87-197`

All rate limit values (6, 120, 80, 36, 60, 10, 100, 30, 12, 18, 3) are hardcoded. No configuration, no documentation of rationale.

**Fix:** Move to `appsettings.json` with comments explaining each limit's purpose and threat model.

### 9. **Frontend-Backend Contract Duplication**
**Files:**
- `src/frontend/src/lib/api.ts` (TypeScript types)
- Backend DTOs in `src/backend/DecoMyLantern.Api/Models/DTOs/`

Types like `Lantern`, `InvitationPreview`, `Design` are manually duplicated. Drift causes runtime errors.

**Fix:** Use a shared contract package or code generation (e.g., `swagger-typescript-api` from OpenAPI spec).

---

## 🟡 Performance & Scalability

### 10. **Story Renderer Single-Threaded Bottleneck**
**File:** `story-renderer/server.mjs:37, 155-160`

```javascript
let busy = false
// ...
if (busy) return respond(res, 503, 'Story renderer is busy.')
busy = true
```

Only one render job at a time (video OR image). Under load, all requests queue with 503.

**Fix:** 
- Allow concurrent image renders (they're fast PNG/WebP via `renderStill`)
- Keep video rendering serialized
- Add a small worker pool or queue with proper backpressure

### 11. **No Database Connection Pool Tuning**
**File:** `src/backend/DecoMyLantern.Api/Program.cs:36-37`

```csharp
options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"))
```

Default pool size (100) may be too high for small SQL instances or too low for burst traffic.

**Fix:** Configure `Max Pool Size`, `Min Pool Size`, `Connection Lifetime` in connection string or via `UseSqlServer` options.

### 12. **CachedParolScene Creates Many Object URLs Without Cleanup Guarantees**
**File:** `src/frontend/src/features/lantern/renderer/CachedParolScene.tsx:103-115`

`ownedUrls.current` tracks URLs but cleanup only happens on unmount or when URLs change. If user rapidly zooms, multiple 2x/3x images accumulate.

**Fix:** Implement LRU eviction (max 3-4 cached images); revoke immediately on failed decode.

### 13. **Frontend Polling Every 12 Seconds Regardless of State**
**File:** `src/frontend/src/app/App.tsx:101-125`

```typescript
const interval = window.setInterval(() => void refresh(), 12000)
```

Polls even when no friends are expected. Wastes backend resources.

**Fix:** Implement exponential backoff (12s → 30s → 60s → 5min) when no new contributions for 2+ polls. Reset on visibility change.

---

## 🟢 Developer Experience & Code Quality

### 14. **Missing OpenAPI/Swagger Documentation**
No `Swashbuckle.AspNetCore` or similar. API contracts in `docs/api-contracts.md` are manual and drift.

**Fix:** Add Swashbuckle; generate OpenAPI spec; CI check for breaking changes.

### 15. **No Integration Tests for Critical Flows**
**Tests location:** `tests/DecoMyLantern.Api.Tests/`

Only unit tests exist. No tests for:
- Full owner creation → invitation → guest contribution → message → Christmas reveal
- Recovery key rotation
- Concurrent contribution race conditions
- Story rendering end-to-end

**Fix:** Add `DecoMyLantern.Api.IntegrationTests` project with `WebApplicationFactory<Program>` and testcontainers for SQL Server.

### 16. **Frontend Tests Use Node Test Runner (Not Vitest/Jest)**
**File:** `src/frontend/package.json:12`

```json
"test": "node --experimental-strip-types --test tests/*.test.mjs"
```

No component testing, no React Testing Library, no coverage, no watch mode.

**Fix:** Migrate to Vitest + React Testing Library + @testing-library/user-event. Add coverage thresholds.

### 17. **Inconsistent Error Handling Patterns**
- Backend: `OwnerAccessException`, `InvitationException` with status codes
- Frontend: `ApiError` class with status
- Story renderer: Plain strings in JSON responses

**Fix:** Standardize on RFC 9457 (Problem Details) everywhere. Backend already uses `AddProblemDetails()` — extend to all endpoints.

### 18. **No Structured Logging / Correlation IDs**
**File:** `src/backend/DecoMyLantern.Api/Program.cs` — no `Serilog` or `Microsoft.Extensions.Logging` configuration.

**Fix:** Add Serilog with JSON output, request correlation IDs (`X-Correlation-ID`), and structured log properties (ownerId, lanternId, traceId).

### 19. **Magic Strings for Design/Pattern Keys**
**Files:** Multiple — `'classic'`, `'floral'`, `'default'`, `'rings'`, `'rays'` scattered across backend, frontend, story-renderer.

**Fix:** Define constants/enums in a shared location; reference everywhere.

### 20. **Story Renderer Has No Health Check Beyond `/health`**
**File:** `story-renderer/server.mjs:202`

```javascript
if (req.url === '/health' && req.method === 'GET') return respond(res,200,'ready')
```

No check for: disk space, Remotion bundle validity, Chrome/Chromium availability.

**Fix:** Enhance `/health` to verify renderer can actually start a render (headless check).

---

## 🔵 Feature Completeness & UX

### 21. **Christmas Inbox UI Incomplete (Per README)**
**README.md:7, 147**

> "The Christmas inbox UI and production abuse controls remain incomplete"

**Fix:** Implement owner message list with sealed/unlocked states, pagination, search, and "mark read" actions.

### 22. **No Admin Dashboard for Abuse Controls**
**README.md:17, docs/architecture.md:18**

> "Duplicate-submission checks, rate limits, moderation, and other safeguards must be finished before public launch."

**Fix:** Build admin UI for: viewing contributions, removing abusive lights/messages, revoking invitations, banning IPs/guest tokens.

### 23. **No Email Notifications**
No email service configured. Owner recovery key is shown once — if lost, no recovery.

**Fix:** Add optional email on parol creation with recovery key (encrypted) and invitation link. Use SendGrid/Postmark/etc.

### 24. **Guest Contribution Has No Captcha/Honeypot**
**File:** `src/backend/DecoMyLantern.Api/Services/Invitations/InvitationService.cs:124-220`

Only rate limiting and guest cookie prevent bot submissions.

**Fix:** Add honeypot field (hidden `website` input) and/or Cloudflare Turnstile for guest contributions.

### 25. **Story Export Only MP4/PNG — No WebM/GIF**
**File:** `story-renderer/server.mjs:59, 169, 261-265`

Only `h264` MP4 and PNG supported. No WebM (better compression) or GIF (social sharing).

**Fix:** Add `webm` (VP9) and `gif` output options; let frontend choose.

---

## 📦 Dependency & Build Hygiene

### 26. **Story Renderer Uses `@remotion/bundler` at Runtime**
**File:** `story-renderer/server.mjs:22-36`

Bundles on every server start (~5-10s). Not suitable for serverless or fast scaling.

**Fix:** Pre-bundle at build time (`remotion bundle`); serve static bundle in production.

### 27. **Frontend Uses Tailwind v4 (Beta) with Vite Plugin**
**File:** `src/frontend/package.json:21`

```json
"@tailwindcss/vite": "^4.1.12",
"tailwindcss": "^4.1.12"
```

Tailwind v4 is new; migration from v3 incomplete (no `tailwind.config.js`).

**Fix:** Verify all v3 features used are compatible; add `@tailwindcss/postcss` for non-Vite builds.

### 28. **No Dependabot / Renovate Config**
No automated dependency updates. Security patches delayed.

**Fix:** Add `.github/dependabot.yml` for npm and NuGet.

### 29. **Docker Compose Uses Separate Files for Dev/Prod**
**Files:** `compose.yaml`, `compose.yml`

Confusing; `compose.yml` is SQL-only dev, `compose.yaml` is full stack prod.

**Fix:** Use single `compose.yaml` with profiles (`dev`, `prod`, `tunnel`) and override files.

### 30. **Global.json Pins .NET 10 — No Roll-Forward Policy**
**File:** `global.json`

```json
{"sdk": {"version": "10.0.x", "rollForward": "latestFeature"}}
```

Not present. If .NET 10.1 releases, builds may break.

**Fix:** Add `global.json` with explicit roll-forward policy.

---

## 📋 Suggested Priority Order

| Priority | Items | Effort |
|----------|-------|--------|
| **P0 (Do First)** | 1, 2, 3, 4, 14, 15 | High |
| **P1 (Next Sprint)** | 5, 6, 7, 8, 9, 16, 17, 18 | Medium |
| **P2 (Technical Debt)** | 10, 11, 12, 13, 19, 20, 26, 27, 28, 29, 30 | Medium-Low |
| **P3 (Feature Completion)** | 21, 22, 23, 24, 25 | High (feature work) |

---

## 🎯 Quick Wins (≤1 hour each)

1. **Add `global.json`** with roll-forward policy
2. **Extract shared cipher utility** (#5) 
3. **Centralize `OwnerPolicy` constants** (#6)
4. **Add `TimeZoneInfo` for PST** (#7)
5. **Move rate limits to `appsettings.json`** (#8)
6. **Add Dependabot config** (#28)
6. **Define design/pattern constants** (#19)
7. **Enhance story renderer `/health`** (#20)
8. **Add ProblemDetails to all endpoints** (#17)