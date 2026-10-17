# Task 3 — BeMyParol 50-friend growth capacity assessment

**Date:** 2026-10-17  
**Branch:** `test/task3-fifty-friend-growth` (based on `dev`)  
**Target:** All accepted contribution counts 0–50, with explicit behavior at 51+.  
**Policy:** **50 friends is a visual design target, NOT a backend quota.** No database constraint or API rejection at 50 has been added.

## Results actually verified

A local Node.js 22.16 environment was used to run the repo's **exact Git-blob-matched** `stages.ts`, `lightPositions.ts`, existing `renderer.test.mjs`, and newly added `fifty-friend-capacity.test.mjs` (no project-wide `npm ci` was available).

- **PASS: 15/15 Node tests.** Five existing renderer tests and ten newly added capacity tests, with no failures.
- **Historical Task 3 result:** the prior renderer used 0 / 1–5 / 6–15 / 16–30 / 31–50 ranges. This was replaced by six design-unlock milestones at 0 / 3 / 10 / 23 / 40 / 50 in the living-parol branch. Run the updated tests before claiming a new pass.
- **PASS: per-friend progression** adds a light at each accepted contribution; from #6 to #50 each also adds exactly one ornament, totaling **10 detail + 15 fuller + 20 crown = 45 ornaments** by #50.
- **PASS: 50 opaque light cores do not intersect.** Minimum center-to-center distance is **21.53 SVG units**; each solid core has radius **5** (10-unit diameter). The larger translucent glow circles *may overlap by design*.
- **PASS: all 50 lights remain inside the 600 × 640 SVG viewBox** with at least 20 SVG units of safety margin around the tested halo circles.
- **PASS: all 45 progressive ornament endpoints stay inside the SVG viewBox** with a safety margin around each ornament's tip.
- **PASS: sparse persisted slots** are not compacted, preventing existing friends' lights from shifting when a contribution is removed.
- **PASS: narrow phone canvas geometry** preserves distinct light cores. At **240 px effective SVG width**, minimum center spacing is **8.61 px** versus a **4 px opaque-core diameter**. At effective 295/350 px widths, the center spacing is approximately **10.59/12.56 px**, respectively.
- **PASS: beyond the target:** #51 and later keep the grand crown's 45 ornaments while their individual light positions continue to be computed. The frontend's **sample preview** is capped at 50; **real accepted contributions are not capped**.
- **PASS: invalid inputs** (negative, fractional, infinite, NaN, unsafe integers) are rejected by the coordinate and growth helpers.

These are **geometry and business-rule** results, not proof of visual readability or browser frame-rate performance.

### Visual progression expectations

| Accepted friends | Stage | Contributed lights | Detail ornaments | Fuller ornaments | Crown ornaments |
| --- | --- | ---: | ---: | ---: | ---: |
| 0 | Complete Base | 0 | 0 | 0 | 0 |
| 1 | Added Lights | 1 | 0 | 0 | 0 |
| 5 | Added Lights | 5 | 0 | 0 | 0 |
| 6 | More Details | 6 | 1 | 0 | 0 |
| 15 | More Details | 15 | 10 | 0 | 0 |
| 16 | Fuller Layers | 16 | 10 | 1 | 0 |
| 30 | Fuller Layers | 30 | 10 | 15 | 0 |
| 31 | Grand Parol | 31 | 10 | 15 | 1 |
| 49 | Grand Parol | 49 | 10 | 15 | 19 |
| 50 | Grand Parol | 50 | 10 | 15 | 20 |
| 51 | Grand Parol | 51 | 10 | 15 | 20 |

The decorative SVG base is always present even at zero friends. Design palettes remain available regardless of count.

## Added automated regression coverage

- `src/frontend/tests/fifty-friend-capacity.test.mjs` — 10 tests for 0–50 stages, incremental lights/ornaments, core spacing, contributor and ornament bounds, mobile scaling geometry, sparse slots, 51+, and malformed inputs.
- `src/frontend/tests/renderer.test.mjs` — 5 existing tests, preserved.
- `src/frontend/package.json` — `npm test` runs **both** `tests/*.test.mjs` files.
- `tests/DecoMyLantern.Api.Tests/PolicyTests.cs` — adds C# all-counts 0–50 and 51+ growth-stage regression tests.
- `tests/DecoMyLantern.Api.Tests/LanternServiceTests.cs` — tests owner-response counts/slots for 0, 1, 5, 6, 15, 16, 30, 31, 49, 50, 51, including 50 sparse slot indexes. **These C# tests have been added but were not executed in this environment.**

## Still required before production readiness

1. **Run the full repo tests locally:** from `src/frontend`, run `npm ci && npm run test && npm run lint && npm run typecheck && npm run build`. At repository root run `dotnet restore DecoMyLantern.slnx && dotnet build DecoMyLantern.slnx --configuration Release && dotnet test DecoMyLantern.slnx --configuration Release`. Record output in the PR.
2. **Visual browser/device inspection:** on actual desktop and mobile browsers, use **+ Add test friend** and jump to **0, 3, 10, 23, 40, 50, 60 sample friends**. Repeat with all six design families and each supported pattern; check for clipping, overlap, legibility, Fit/zoom, accessibility, and narrow phone widths (320, 375, 430 px). Frontend geometry tests do not replace this.
3. **Real DB/API integration:** once Task 4 adds the guest contribution API, accept 50 real contributions to a single parol and check uniqueness, accepted counts, contribution persistence, removal handling, 51st-friend behavior, and idempotency across requests.
4. **Concurrent submissions:** simulate guests submitting simultaneously, including the 49→50 and 50→51 transitions. These API endpoints and concurrency behavior cannot be tested yet because guest acceptance is not implemented.
5. **Browser-performance profiling:** measure actual render/interaction responsiveness at 0, 30, 50 and 51+ contributors on low-end phones. No frame-rate, memory-use, or Google Cloud load-test figures are claimed here.

## Decisions

- **Do not introduce a 50-friend contribution cap.** The existing rendering model retains additional lights and safely saturates outer ornament growth at 50. If future production testing reveals a density issue beyond 50, revisit layout/capacity rather than denying contributors silently.
- **Keep token access and invitations separate.** Task 2's token-authentication PR is independent. Task 4 must handle transactional, unique slot assignment and anti-duplicate/anti-abuse logic.
- **Auto-fit scaling is separate.** Task 3 checks intrinsic SVG bounds; automatic view-scale adjustments with user-gesture preservation are part of the separately planned frontend task, not claimed here.
