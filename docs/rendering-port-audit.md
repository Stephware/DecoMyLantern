# Original hybrid rendering port audit — 2026-11-06

Source: `origin/feature/video-parsing-optimization` at `47f872a`.
Target baseline: latest fetched `origin/dev` at `fa88739`.

## Findings before implementation

| Area | Original implementation | Latest dev | Adaptation |
| --- | --- | --- | --- |
| Browser MP4 | Remotion WebCodecs, validated versioned assets, verified metadata, 120s deadline | Mediabunny Canvas/foreignObject at 1080p30 | Restore original browser implementation and 720p24 preset; retain hidden-page cancellation |
| Resource limits | 6 friends/slots unknown or <4 GiB; 12 otherwise | Already present | Preserve measured limits; no new quality tiers |
| Story composition | Seconds-based standard/high presets and separate layers | 1080p30 single tree | Port original StoryFrame/spec; use explicit high preset for current preview and PNG |
| Artwork | 15-region geometry and three growth waves | Same Story geometry dependencies | Keep current artwork files; original SVG backdrop/glow are needed for browser canvas compatibility |
| Server MP4 | Reusable background, seven Sharp SVG rasters, one Chromium text capture, FFmpeg H.264, verified output | Full Remotion on each frame | Port original engine and compatibility fallback |
| Cache | Source/asset/preset/renderer fingerprint, TTL, atomic publication | Saved-data digest only | Use original identity for direct and owner-job media |
| Server queue | Generic opaque handles, cancellation on last subscriber | Snapshot-addressed owner queue; accepted jobs survive disconnect | Keep current 12-pending owner queue and APIs; integrate original engine and shared single-render admission |
| PNG | Server high preset | Device-first complete 1080p Story poster | Keep device-first PNG and authenticated fallback |
| Authentication | Sanitized composition endpoints, owner/guest checks | Saved-state authenticated binary APIs and owner jobs | Add only original composition reads; preserve current authorization and CSRF |
| Sharing/UI | Old sharing dialog, old guest-page behavior | Native share/download chooser, current brand, stale-data invalidation | Keep current dialog and guest page; wire original local encoder |
| Snapshot service | Original 1x snapshots | New 1x/2x/3x cache and limits | Preserve current service unchanged |

Read original docs/story-hybrid-rendering.md, docs/story-rendering-optimization.md,
and both original benchmark reports. Those historical measurements are evidence
for the original design, not measurements of this port. The 50-friend browser
fixture took 323s and at least 2.28 GiB; it remains excluded from browser export.

## Compatibility decisions

Do not restore the old generic /jobs contract or replace current owner jobs.
Do not copy the old StoryShare or guest page. Do not overwrite snapshot scale
handling, newer branding, invitations, recovery keys, messages, or saved data.
The original broad visual fingerprint includes newer non-Story files, so it
must be deliberately refreshed after reviewing the actual Story dependencies.
No database migration, deployment, unrelated infrastructure, or quality system.

## Baseline verification

Untouched dev: frontend 134/139 tests; renderer 9/9; backend 109/113.
Failures and final verification are recorded in the delivery report.

## Delivery record

Original files ported unchanged: BrowserStory.tsx, StoryFrame.tsx, storySpec.ts,
public Story assets; renderer composition.mjs, ffmpegRenderer.mjs,
generateAssets.mjs, renderCache.mjs, rendererSelection.mjs, vectorBundle.mjs,
vectorEntry.tsx, remotionEntry.tsx and original pinned renderer build dependencies.
BrowserRenderer retains the original implementation with SSR guards and
visibility/abort normalization. Current phoneStoryVideo keeps high PNG and
wraps that original encoder. Original sanitized composition actions were
adapted to existing rate policies; current owner job APIs were kept unchanged.

Not ported: old StoryShare, old guest UI, opaque /jobs routes and RenderQueue,
old snapshot handler and Compose resource infrastructure. They would replace
newer UI/resume/scale contracts or introduce an unused second scheduler. Only
the original mode/preset environment defaults and required renderer build/dev
asset steps are integrated into the existing configuration.

Review found and fixed ordinary Remotion cancellation errors triggering
fallback, and provisioned the newly required FFprobe verification dependency
in the local launcher (including portable FFMPEG_PATH). All changes stay on
the feature branch; the original dirty checkout is untouched.

See docs/benchmarks/story-port-2026-11-06.md and its JSON for measured server
results, actual browser/private renderer checks, baseline test failures and
unavailable real-device/live-session checks. Full-frame decoded output matched
the original branch (SSIM 1.000000 for both measured fixtures).
