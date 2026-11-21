# Hybrid Story rendering (original implementation port)

This ports `feature/video-parsing-optimization` at `47f872a` onto dev `fa88739`.
See [the audit](rendering-port-audit.md) for provenance and compatibility decisions,
and [the measured results](benchmarks/story-port-2026-11-06.md) for verification.
The original standard preset is 720×1280, 24 fps, 192 frames, eight silent seconds.
The original high server preset remains 1080×1920, 30 fps, 240 frames. PNG and
sharing preview remain 1080×1920 at completed high-preset frame 200.

## Actual flow

The current PNG/MP4 dialog and user-selected Share and Download actions remain.
Local generation first reads the saved sanitized composition from the original
owner or invitation composition endpoint. These POSTs validate CSRF and current
owner authentication or invitation plus the visitor's existing contribution;
only public visual fields are returned, with no-store headers. No message,
recovery key, invitation token or renderer secret enters rendering assets.

MP4 capability detection uses the original `@remotion/web-renderer` 4.0.537
H.264 runtime probe. Devices with unknown/<4 GiB memory are capped at six
friends/slots, and devices reporting ≥4 GiB at twelve. Large parols bypass
encoding. The original manifest, version, dimensions, timing and SHA-256
background checks run before rendering. Browser output is verified for MP4
MIME/size, decodability, dimensions and eight-second duration before publication.
The generated video stays in browser memory and is never uploaded. The original
Remotion dependency sends usage metadata to its licensing endpoint; that
request contains no rendered media.

The original BrowserStory/StoryFrame renders all frames through Remotion
WebCodecs. Progress, cancellation and the 120-second deadline are retained.
A hidden page cancels; Remotion's ordinary cancellation errors are normalized
to AbortError so hiding, closing, cancelling or changing saved state cannot
start a fallback render. A genuine failure/timeout may fall back. Authorization
failures stop the operation. Existing PNG generation remains device-first with
the current self-contained high-resolution Canvas capture and PNG validation;
unsupported captures use the authenticated PNG endpoint.

Owner fallback and explicit background generation keep the current
`/api/my/lantern/story/video/job` start/status/file protocol. Accepted work
survives tab closure and can be found from current saved state after reopening.
The private queue still permits one active render and twelve pending jobs.
Its pending jobs are in-memory; a renderer restart loses pending work but can
reuse a completed matching output on its existing filesystem for 24 hours.
Guest binary fallback remains `/api/invitations/story`, with its current auth.
The guest page continues to show its existing Create my own parol action.

## Original server optimization

The image build creates the original reusable background MP4. Per distinct
export, the original vector bundle serializes StoryFrame's four parol growth
stages and three flash stages; Sharp rasterizes these without Chromium. One
Chromium still preserves personalized typography. FFmpeg overlays the original
camera/fade/flash/text timeline with two encoding and two filter threads, H.264
yuv420p, no audio and faststart. Standard/high preset definitions, artwork,
three waves and all canonical timing are taken from the source branch.
The original SVG backdrop/glow intentionally replaces dev's CSS backdrop/blur
because the browser renderer needs SVG effects. It is not a pixel-identical
promise against the previous CSS rendering.

Original FFmpeg failures retry via Remotion unless cancelled. Missing or invalid
assets, an unreviewed visual fingerprint, or unavailable vector bundle select
Remotion. High uses Remotion. Every server MP4, including Remotion output, is
FFprobe-verified before atomic cache publication. Direct requests deduplicate;
when their last waiting response disconnects, rendering is cancelled. Accepted
owner jobs deliberately continue. A shared busy lock prevents direct exports,
owner jobs and parol snapshot capture from overlapping.

Cache keys include saved composition/order, preset, template, source, assets
and renderer. Owner and direct exports use the same identity; changing a design,
source or preset cannot reuse an older video. Original cleanup bounds Story
exports to 32 completed files/24 hours and safely handles temporary job folders.
Current 1x/2x/3x standalone parol snapshot caching stays separate and unchanged.

## Configuration and local use

Compose defaults `STORY_RENDERER_MODE=ffmpeg` and
`STORY_RENDERER_PRESET=standard`; `remotion` is the original rollback mode.
Standalone `npm start` keeps the original remotion default. The original
`STORY_RENDERER_TIMEOUT_MS` defaults to 240000 and is clamped to 10–600 seconds.
There is no second queue, generic /jobs contract, database migration or new
quality selection system.

Both server modes require FFmpeg/FFprobe for output verification. Docker
installs them. On macOS/Linux local development, install FFmpeg with the
platform's package manager and ensure `ffmpeg` and `ffprobe` are on PATH.
`scripts/dev-with-stories.sh` checks prerequisites, resolves FFMPEG_PATH,
prepares vectors/background and defaults to optimized mode. For manual start,
set `FFMPEG_PATH` to the absolute ffmpeg executable path when outside
`/usr/bin` (ffprobe must be alongside it), run `npm ci`, `npm run vectors` and
`npm run assets` in story-renderer. The private secret remains mandatory.
Do not use the Linux default `/usr/bin/ffmpeg` on a host where it is absent.

No merge or deployment is part of this port. Device/native-sharing and live
owner/guest database checks still require their real environments.
