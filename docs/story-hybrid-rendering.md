# Hybrid Story rendering

The default animated Story is an eight-second silent H.264 MP4 at **720 × 1280, 24 fps (192 frames)**. The static Story PNG remains 1080 × 1920. `STORY_RENDERER_PRESET=high` retains a 1080 × 1920, 30 fps server MP4 path through Remotion.

## Export flow and trust boundary

1. The frontend requests saved composition data from `POST /api/my/lantern/story/composition` or `POST /api/invitations/story/composition`. The backend checks the owner session or the invitation plus existing guest contribution, validates CSRF, and returns only design, pattern, count, numeric light slots and optional highlighted slot. It never sends messages, recovery keys or renderer credentials.
2. For small designs, a secure browser with a tested H.264 encoder uses Remotion WebCodecs to render locally. The browser checks the versioned public SVG asset manifest and the completed MP4 metadata before sharing or downloading. It does not upload the generated video.
3. If local encoding is unavailable, fails, exceeds the time limit or exceeds the conservative design limit, the frontend starts a private server job. It polls status and retrieves the finished MP4 through the same authorized backend. The backend resolves the saved design again for every operation, so a job ID alone cannot access media.
4. The legacy `POST /api/my/lantern/story` and `POST /api/invitations/story` binary endpoints remain for older clients and PNG exports.

The browser design limit is twelve friends/slots when `navigator.deviceMemory` reports at least 4 GiB, and six when memory is lower or unknown. This follows an observed 2.28 GiB Chrome container footprint and 323-second render for the 50-friend fixture. A local render is cancelled after 120 seconds and then offered the server fallback. Browser capabilities are checked at runtime; no browser family is presumed compatible.

## Composition and assets

- `storySpec.ts` and `composition.mjs` define the same eight-second timeline in seconds. Stage changes remain at 0, 1, 2 and 3 seconds, with the original fade, flash, zoom and text reveal times. Presets only change frame sampling and raster size.
- `StoryFrame.tsx` remains the visual source for Remotion, local browser output and SVG stage rasterization. The four growth stages retain their different geometry. Sharp rasterizes four stage SVGs and three flash SVGs from this React tree without Chromium. One personalized text layer still uses Chromium to preserve the current typography. The previous FFmpeg path needed eight Chromium captures; the new path needs **one**.
- `generateAssets.mjs` builds the reusable background MP4 once during the renderer image build. `assets/generated/standard/manifest.json` records the version, dimensions, timing, source hash, asset hash and compatibility requirements. The browser uses the public `story-assets/story-night-v2.svg` and its manifest. No personalized image is published as a static file.
- FFmpeg composites the cached background with the stage images, flash effects and text. It uses argument arrays, two encoding threads, H.264 `yuv420p`, no audio and `+faststart`. Output is validated with `ffprobe` before it is atomically published.

The SVG glow and radial background replace CSS effects that the browser canvas renderer could not reproduce faithfully. Representative 0-friend and 50-friend frames were compared with the previous Remotion output. The 50-friend browser path completed in testing but is disabled for normal use because of its measured memory and time cost.

## Jobs, cache and rollback

`RenderQueue` permits one active server job and three pending jobs by default. Duplicate compositions share one render while each caller gets an independent opaque handle. Cancelling the last handle aborts the render. Job status includes queued, rendering, completed, failed and cancelled, plus queue position and coarse progress. The queue is in memory; a restart loses pending jobs and clients should retry.

Completed files use a SHA-256 digest of the authorized composition, source, asset hashes, output preset and renderer. Outputs are written in per-job temporary directories and published atomically; failed work is not cached. The cache keeps at most 32 completed files for 24 hours and removes abandoned job directories on startup. Files live inside the private renderer container, and public routes never expose digest paths.

`STORY_RENDERER_MODE=remotion` selects the compatibility renderer. If the optimized FFmpeg path fails after admission, the server retries that job through Remotion unless it was cancelled. The visual-source fingerprint prevents FFmpeg from flattening a newly added animation without review. The high preset uses Remotion while the cached background is only built for the default preset.

## Configuration and deployment preparation

The renderer Dockerfile installs FFmpeg and Chrome Headless Shell, builds the SVG raster bundle and reusable assets, then starts the private Node service. Compose limits the service to two CPUs, 2 GiB RAM and 256 processes. The required existing secret remains `STORY_RENDERER_SECRET`; new optional settings are:

| Setting | Default | Purpose |
| --- | --- | --- |
| `STORY_RENDERER_MODE` | `ffmpeg` in Compose | `ffmpeg` or `remotion` rollback |
| `STORY_RENDERER_PRESET` | `standard` | `standard` 720p/24 or `high` 1080p/30 server output |
| `STORY_RENDERER_MAX_PENDING` | `3` | Pending server jobs, 0–32 |
| `STORY_RENDERER_TIMEOUT_MS` | `240000` | Per-job deadline, clamped to 10–600 seconds |

Build and test without deployment:

```bash
docker build -f story-renderer/Dockerfile -t bemyparol-story-hybrid:test .
docker compose -f compose.yaml config
```

When release approval is given, the ordinary Compose rebuild is:

```bash
docker compose -f compose.yaml up -d --build story-renderer backend frontend caddy
```

This task does not run that release command or merge into `dev`.

## Verification and limits

Run `npm test` in `story-renderer`, and `npm run typecheck && npm run lint && npm test && npm run build` in `src/frontend`. Run `dotnet build` or `dotnet test` for the backend. `scripts/benchmark-story-renderers.py` measures isolated 2-vCPU/2-GiB server renders. The benchmark record is in [the hybrid benchmark report](benchmarks/story-hybrid-2026-11-01.md).

Chrome Headless Shell 157 on Linux was tested for browser MP4. Firefox, Android Chrome and iOS Safari were not available in this environment and need device checks before compatibility claims. WebCodecs' H.264 output was reported by `ffprobe` as full-range `yuvj420p`; the server FFmpeg output is `yuv420p`. Both decoded as 4:2:0 H.264 in Chromium. The browser encoder also produced larger files than FFmpeg for the simple fixture.

Final local checks on 2026-11-01: frontend typecheck, lint, build and 106 tests passed; renderer tests passed 16/16; the two new backend Story contract tests passed. An isolated renderer container completed a queued 720p MP4, deduplicated two handles, cancelled one caller and a pending job, enforced the private key and saved-design binding, and reused the completed cache. `ffprobe` confirmed H.264, `yuv420p`, 720 × 1280, 24 fps, 192 frames and eight seconds. The full backend suite passed 88/90; its two failures are existing `OwnerRecoveryCipherTests` assertions that expect exactly `CryptographicException` while the .NET 10 runtime throws its derived `AuthenticationTagMismatchException`. The unrelated cipher and tests were left unchanged.
