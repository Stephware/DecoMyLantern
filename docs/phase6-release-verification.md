# Phase 6 — BeMyParol release verification (Phases 1–5)

**Scope:** Development-only verification and small regression fixes. No server/infrastructure, Cloudflare, HostHatch, Docker, SQL migration, advertising deployment, or production merge.

## Verified repository baseline

- PRs **#44, #45, #46, #47, #48, #49** are merged normally into `dev`.
- The `dev` and `main` branches have **diverged**; do not assume a fast-forward release. Do not promote to `main` until the release gates below pass, any differences are reconciled, and the production operator approves it.
- The repository has **no GitHub Actions workflows or recorded CI runs** at the inspected `dev` head. A connector source audit is **not** an executed production build.
- The frontend has a committed npm lockfile; the **story-renderer does not**. The local verifier uses `npm ci` for the frontend and `npm install --package-lock=false` for the renderer, explicitly warning that the renderer's full transitive dependency tree is not yet locked.
- Phase 6 removes the technical **“Story layers”** label from generated Story artwork. Actual growth layers, friend count, frame sequencing and visual geometry are unchanged.

## One-command local automated checks

From the repository root:

```bash
git fetch origin
git switch dev
git pull --ff-only origin dev
bash scripts/verify-phase6.sh
```

The script requires Node 22+, npm, and .NET SDK 10+. It uses clean frontend dependency installation, renderer dependency installation, frontend TypeScript typecheck, ESLint, all frontend tests (including Phase 6), frontend production build, renderer tests and ASP.NET solution tests.

Use `bash scripts/verify-phase6.sh --skip-install` only when dependencies are already present and you explicitly want a faster, **not clean-install**, check. An error stops the script immediately. **A green run does not replace browser and media-rendering checks.**

For a local app/renderer smoke test, start `bash scripts/dev-with-stories.sh` separately after automated checks have passed. Have your existing development SQL Server and app secrets configured. Do **not** point local testing at production data.

## Manual regression matrix — all required before release

| Area | Test | Expected outcome | Status |
| --- | --- | --- | --- |
| Owner access | Create a test parol, save recovery key, leave and recover | Same owner/parol and saved lights after recovery; private key never exposed publicly | **Pending manual** |
| Owner UI (Phase 1) | Desktop/mobile dashboard, design picker, controls | Useful counts remain; debug/test controls only in dev, never public production build | **Pending manual** |
| Guests | Open valid invitation in new browser, contribute once with optional message | Guest can add their light; repeats guarded; no owner secret/name leak | **Pending manual** |
| Invite errors | Invalid/expired invitation | Friendly failure, no bypass or personal data | **Pending manual** |
| Growth | 0, 1, 11, 20, 35, 50-friend parols | True 3-per-friend growth, correct 15 regions/artwork, no tail | **Pending manual** |
| Six designs | Switch through Classic, Floral, Festival, Celestial, Fiesta and Sampaguita | Each saved parol image matches selected design; no prior image leaks | **Pending manual** |
| WebP viewer | Refresh/poll unchanged saved parol | Same image, no repeated snapshot request for unchanged state | **Pending manual** |
| WebP growth | Accept contribution while owner page is open | Saved parol updates, 3-wave reveal, Fit/zoom/pan; no older render overwrites new | **Pending manual** |
| Sharing (Phase 2) | Open dialog in narrow phone and desktop widths, keyboard Tab/Escape | Both format choices; controlled focus and return; no overflowing UI | **Pending manual** |
| Static (Phase 3) | Prepare/download owner and guest PNG | 1200×1280 transparent standalone saved parol, not Story poster | **Pending manual** |
| Animated (Phase 3) | Generate MP4 for owner and guest | 1080×1920, 8-second Story, correct 3-wave animation and friend text | **Pending manual** |
| Native share | Android/iOS browsers | Device's available apps offered if file share supported; download fallback otherwise | **Pending manual** |
| Link | Copy invite / deny clipboard permissions | Copies official existing link or displays selectable link and error | **Pending manual** |
| Media reuse (Phase 4) | PNG/MP4 toggle and reopen unchanged parol | No duplicate render request or missing prepared preview | **Pending manual** |
| Media cancellation | Slow response, cancel/close dialog | Local request aborts without stale share result; server job may still finish | **Pending manual** |
| Media transient error | Simulate HTTP 503/504, 429, 401/403 | At most 2 automatic retries for 503/504; no auto retries for authorization/rate limit | **Pending manual** |
| State invalidation | Switch owner/invitation or accept friend during media generation | Prior PNG/MP4 cannot be shared/downloaded for new state | **Pending manual** |
| Downtime (Phase 5) | `python3 -m http.server 8088 --directory downtime` | Self-contained page displays correct approved Classic Gold parol + “Salamat sa pasensya ✦” | **Pending manual** |
| Downtime offline | Open page, inspect network, resize 320px/375px/desktop | No external requests, no overflow, keyboard retry available; no auto-refresh | **Pending manual** |
| API authorization | Attempt owner image without owner cookie; guest image with invalid token | Request rejected; private recovery key/messages never included | **Pending manual** |

Run media tests against **local development** services only. Backend responses, Story images, actual device share targets and user browser compatibility cannot be authenticated from source code alone.

## Optional endpoint smoke checks

Run the local stack using `bash scripts/dev-with-stories.sh`; confirm the API and renderer are reachable:

```bash
curl -i http://localhost:5050/api/health
curl -i http://127.0.0.1:7070/health
```

Avoid pasting actual invitation tokens, owner cookies, recovery keys, access tokens or media export payloads into public reports.

## Decision policy

**Release GO** only when:
1. `bash scripts/verify-phase6.sh` completes successfully on the intended release commit.
2. The complete manual regression matrix is checked with observed outcomes, including at least one supported phone for file sharing.
3. The actual approved parol is visually checked at representative friend counts.
4. Outstanding issues are repaired and retested.
5. Any divergence between `dev` and `main` is reviewed, and the operator explicitly approves the normal release merge.

**Release NO-GO** when any automated gate fails, visual results differ from approved artwork, owner/guest security is compromised, media exports are unusable, or browser verification remains incomplete.

This phase intentionally **does not create GitHub CI/CD workflows** or deploy an unverified release. Keep `main` unchanged until final acceptance.
