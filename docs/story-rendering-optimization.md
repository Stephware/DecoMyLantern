# Story rendering: FFmpeg composition

## Existing export contract

The frontend asks the ASP.NET API for `POST /api/my/lantern/story` or
`POST /api/invitations/story`. The API checks authentication, CSRF and rate
limits, reads the saved parol, and sends only the kind, design, pattern, friend
count, saved light slots and optional highlighted slot to the private Node
renderer. It streams back an attachment. MP4s are 1080 × 1920, 30 fps,
240 frames (8 seconds), H.264 and silent. PNGs use frame 200. No messages,
names, invitation tokens or recovery keys enter the renderer.

The original renderer uses Remotion and Chromium for every MP4 frame. The
Story SVG changes its outer growth and visible lights at frames 0, 30, 60 and
90. A stage flash fades during the next 25 frames. The camera zooms from
1.12 to 1 between frames 96 and 151. The parol and headline fade in; the
glow pulses. The border, backdrop and header are shared across exports. The
headline wording and friend count depend on the export. There is no audio.

## Optimized path

`npm run assets` in `story-renderer` generates one 8-second background MP4,
including its animated header and glow, from the same Story component. The
Dockerfile runs this step at image build. Generated assets are ignored by Git.

For each distinct export, Chromium rasterizes four transparent parol stages,
three transparent flash stages and one transparent text layer. FFmpeg loops
those eight images, applies the camera curve, reveal timing and fades, and
encodes an H.264 MP4 with `yuv420p` and `+faststart`. The Story component
continues to render every frame in Remotion when `STORY_RENDERER_MODE=remotion`.
PNG export and standalone parol image snapshots retain their existing renderer.

`composition.mjs` describes the template, design, layers, stage timing, output
and audio independently of FFmpeg. A future browser renderer can consume that
contract and the same template assets. No browser video encoder or UI has been
added.

## Resource and cache behavior

The private service admits one active render. Identical requests join the
same in-progress job; different uncached requests receive HTTP 503 and may
retry via the existing frontend policy. FFmpeg uses two encoding and two
filter threads. The renderer has a four-minute job deadline by default.
When every waiting client disconnects, it cancels remaining Remotion work or
the FFmpeg process. Each job has a unique temporary directory. The service
renames a verified output into the cache only after rendering succeeds, and
removes the directory afterward. Startup removes abandoned directories; a
24-hour cleanup retains at most 32 completed exports.

Cache names are SHA-256 digests of the canonical design, template/version,
render-affecting frontend source, background asset bytes, output settings and
renderer choice. Files stay inside the private container filesystem and are
not served by Caddy. Cache files are never placed in the frontend's public
directory.

The optimized mode checks a reviewed fingerprint of the Story and parol
visual sources. If those sources change, it uses Remotion until the layer
behavior is checked again and the fingerprint is deliberately updated. This
prevents a newly added per-frame artwork animation from being flattened
without review.

## Deployment and rollback

Build the renderer image with `docker compose build story-renderer`, then
start it with `docker compose up -d story-renderer`. The Dockerfile installs
the full Debian FFmpeg package and Chromium dependencies, then pre-generates
the background asset. On a non-Docker Linux host, install FFmpeg with the
distribution package manager (for Debian/Ubuntu, `sudo apt-get install ffmpeg`)
and set `FFMPEG_PATH` if it is not at `/usr/bin/ffmpeg`. The FFmpeg build must
include `overlay`, `scale`, `fade` and `libx264`. No database migration is required.

Compose defaults to `STORY_RENDERER_MODE=ffmpeg` for MP4s. Set
`STORY_RENDERER_MODE=remotion` in the ignored root `.env` and recreate the
renderer container to restore the previous MP4 path. Standalone `npm start`
defaults to Remotion until this variable is set explicitly.
`STORY_RENDERER_TIMEOUT_MS` adjusts the
render deadline (clamped to 10–600 seconds); keep it below the API's five
minute HTTP timeout. The renderer fails back to Remotion if the generated
background asset is missing or its hash/version does not match.

Benchmark reproducibly with:

```bash
python3 scripts/benchmark-story-renderers.py \
  --baseline bemyparol-story-optimized:full \
  --optimized bemyparol-story-optimized:full
```

The script runs each image with a two-vCPU and 2-GiB Docker limit, renders a
simple and a complex design, and reports wall time, cgroup CPU time, cgroup
peak memory, and file size. Benchmark reports must state the image versions
and environment. Visual and audio checks are required before enabling the
optimized mode for production.
