# BeMyParol Improvement Execution Plan

## Phase 1: Critical Security Fixes (P0) - DO FIRST
- [ ] 1. Recovery key rotation vulnerability fix
- [ ] 2. Guest visitor rate limiting
- [ ] 3. Raw SQL → LINQ with proper locking
- [ ] 4. Stricter recovery brute-force protection

## Phase 2: Architecture & Maintainability (P1)
- [ ] 5. Extract shared AesGcmCipher utility
- [ ] 6. Centralize OwnerPolicy constants
- [ ] 7. Use TimeZoneInfo for PST
- [ ] 8. Move rate limits to appsettings.json
- [ ] 9. Generate frontend types from OpenAPI (defer - needs Swashbuckle first)

## Phase 3: Developer Experience (P1-P2)
- [ ] 14. Add Swashbuckle/OpenAPI
- [ ] 17. Standardize on RFC 9457 Problem Details
- [ ] 18. Add Serilog structured logging
- [ ] 19. Define design/pattern constants
- [ ] 20. Enhance story renderer health check
- [ ] 16. Migrate frontend tests to Vitest + RTL

## Phase 4: Performance (P2)
- [ ] 10. Story renderer concurrency (image vs video)
- [ ] 11. DB connection pool tuning
- [ ] 12. CachedParolScene Object URL LRU
- [ ] 13. Exponential backoff polling

## Phase 5: Build Hygiene (P2-P3)
- [ ] 26. Pre-bundle Remotion at build time
- [ ] 27. Verify Tailwind v4 migration
- [ ] 28. Add Dependabot config
- [ ] 29. Consolidate Docker Compose
- [ ] 30. Add global.json with roll-forward

## Phase 6: Integration Tests (P1 - parallelizable)
- [ ] 15. Add integration test project with testcontainers

## Phase 7: Feature Completion (P3 - separate feature work)
- [ ] 21. Christmas inbox UI
- [ ] 22. Admin abuse controls
- [ ] 23. Email notifications
- [ ] 24. Bot protection (honeypot/Turnstile)
- [ ] 25. Additional story export formats

---

## Current Phase: Phase 1 - Critical Security Fixes

### Task 1.1: Recovery Key Rotation Vulnerability
**File:** `src/backend/DecoMyLantern.Api/Services/Owner/OwnerAccessService.cs`
**Issue:** Lines 76-82 encrypt old recovery keys without validating they're within the valid window
**Fix:** Add explicit check that `RecoveryIssuedAtUtc` (or `CreatedAtUtc`) + 1 year > now before encrypting

### Task 1.2: Guest Visitor Rate Limiting
**File:** `src/backend/DecoMyLantern.Api/Services/Invitations/InvitationService.cs`
**Issue:** No rate limit on new `GuestVisitor` creation per IP
**Fix:** Add rate limiting policy for guest visitor creation; check before creating new visitor

### Task 1.3: Raw SQL → LINQ
**File:** `src/backend/DecoMyLantern.Api/Services/Invitations/InvitationService.cs`
**Issue:** Lines 80, 152 use `FromSqlInterpolated` with `UPDLOCK, HOLDLOCK`
**Fix:** Use EF Core's `WithLock` or implement proper pessimistic locking via LINQ

### Task 1.4: Stricter Recovery Rate Limit
**File:** `src/backend/DecoMyLantern.Api/Program.cs`
**Issue:** `owner-recover` policy allows 6/15min per IP
**Fix:** Reduce to 3/15min; add exponential backoff tracking per IP