# Original Hybrid Rendering Port Implementation Plan

> **For agentic workers:** Use the supplied source branch as the implementation authority. Execute focused tasks with regression tests before implementation and review the complete change.

**Goal:** Adapt the original browser/FFmpeg optimization to latest dev without losing current sharing, security, PNG, or owner-job behavior.
**Architecture:** Port the original layered Story composition, browser WebCodecs renderer, and FFmpeg engine. Retain current owner asynchronous queue and public media contracts, integrating source-aware cache identity and single-render admission.
**Tech Stack:** React/TypeScript, Remotion 4.0.537, Sharp, FFmpeg, ASP.NET.
**Spec:** User-provided request and docs/rendering-port-audit.md.

## Global Constraints

- Technical source of truth is feature/video-parsing-optimization at 47f872a.
- Standard MP4 720×1280/24fps/192 frames; high 1080×1920/30fps/240 frames; duration eight seconds. PNG remains high frame 200.
- Browser caps 6/12, timeout 120 seconds; no new tiers or adaptive strategy.
- Keep owner/guest auth, owner resumable jobs, current UI/branding, native share/download and stale-media checks.
- No merge, deploy, database migration or unrelated infrastructure changes.

## Review Focus

- Cancel/hidden/unmounted/stale browser work must not trigger fallback.
- A changed asset/source/preset must invalidate owner and direct cached videos.
- Owner jobs, direct renders and image captures must never encode concurrently.
- Fully grown parols must bypass browser rendering before expensive work.
- PNG and preview must stay full-size after the standard video preset changes.

### Task 1: Shared composition

Files: StoryFrame.tsx, storySpec.ts, frontend timing tests, remotionEntry.tsx.
- [x] Run original preset/timing regression tests and observe missing-contract failure.
- [x] Port original StoryFrame/spec unchanged; retain current artwork dependencies.
- [x] Test seconds-based growth at 24/30fps and preset dimensions.

### Task 2: Browser and current sharing

Files: BrowserStory.tsx, browserRenderer.tsx, phoneStoryVideo.ts, StoryShare.tsx, API composition helpers/controllers, public/story-assets, frontend dependencies/tests.
Consumes: original StoryData/presets and current owner job APIs.
Produces: original local MP4, current high PNG, authorized saved StoryData.
- [x] Test capability limits, asset validation, cancellation/visibility, no upload and fallback boundaries.
- [x] Port original modules and pinned dependencies; adapt current device API and sharing calls, keeping high PNG/preview and current controls.
- [x] Add original sanitized composition reads with current owner/guest auth/CSRF.
- [x] Run frontend checks and backend contract tests.

### Task 3: Server engine and existing queue

Files: original composition/ffmpegRenderer/generateAssets/vectorBundle/vectorEntry/renderCache/rendererSelection, current server/storyVideoJobs, renderer Dockerfile and package scripts/tests.
Consumes: original shared layered composition; produces: verified cached MP4 for current APIs.
- [x] Port original tests and add queue identity/admission regressions, observe failures.
- [x] Port original engine; integrate into existing queue and direct endpoint with cancellation, bounded admission, original digest, verified atomic output.
- [x] Preserve snapshot scale handling; update reviewed fingerprint and build original assets.
- [x] Run renderer tests and controlled renderer checks.

### Task 4: Verification and delivery

Files: benchmark script, audit/delivery docs.
- [x] Run frontend typecheck/lint/tests/build and backend/renderer suites; name baseline failures.
- [x] Measure current dev and adapted rendering under comparable presets and container limits; verify media and representative frames.
- [x] Check owner/guest authorization, cache reuse, cancellation and fallback with available tools; state unavailable real-device/live-service checks precisely.
- [x] Review diff, document provenance/limitations, commit focused changes.

Delivery operation: open a PR targeting dev. Do not merge/deploy.

Final verification: see docs/benchmarks/story-port-2026-11-06.md. Existing unrelated full-suite failures are reported there; all new rendering checks pass. PR creation remains the final delivery step.
