# Original rendering port verification — 2026-11-06

## Environment and method

Measured on Darwin 25.3.0 with Docker Desktop Linux arm64, Node22 containers
and Chrome Headless Shell157. Each measured renderer had a two-vCPU quota
and 2 GiB memory limit. Containers ran sequentially with synthetic fixtures;
these are single runs, not a statistical throughput or physical-phone claim.
Wall time covers POST to the full binary response; CPU is cgroup usage_usec
difference; memory is the cgroup peak across the two fixtures including startup.
The FFmpeg peak also includes the extra duplicate/cache concurrency check.

Current baseline source is dev `fa88739`; original optimization source is
`47f872a`. Initial measured port image ID is
`sha256:e381d417947da16efd79e5c1b505135bd06a7b00fde82e346dc7f69bd213bda4`.
The browser cancellation fix and API/helper test changes after that image
snapshot do not change the measured server composition/encoder.
Simple is owner Classic/default/zero friends; complex is guest Sampaguita/rays,
50 saved slots and slot49 highlighted. The complex fixture is intentionally
excluded from normal local browser selection.

## Server measurements

| Fixture | Renderer | Preset | Wall s | CPU s | Container peak MiB | Bytes |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| Simple | Current dev Remotion | 1080p30 | 18.14 | 35.89 | 2048 | 1,047,543 |
| Complex | Current dev Remotion | 1080p30 | 33.00 | 65.56 | 2048 | 1,370,108 |
| Simple | Port Remotion control | 720p24 | 5.70 | 10.87 | 1228 | 488,730 |
| Complex | Port Remotion control | 720p24 | 10.39 | 20.71 | 1228 | 711,176 |
| Simple | Port original FFmpeg | 720p24 | 4.71 | 8.90 | 1062 | 376,016 |
| Complex | Port original FFmpeg | 720p24 | 7.63 | 12.72 | 1062 | 464,232 |

At identical 720p24 settings, FFmpeg reduced CPU 18.1%/38.6%, wall 17.4%/26.6%
and file size 23.1%/34.7% for simple/complex. The observed container peak was
13.5% lower. The current 1080p30 → port 720p24 change reduces CPU 75.2%/80.6%, but
includes lower resolution/frame sampling and the original SVG effects; it is
not an encoder-only improvement. The dev container reached its 2 GiB memory
limit while still returning both outputs; that peak is constrained by the cap.

Logs confirmed seven vector rasters and exactly one Chromium capture for each
FFmpeg render. Simple: 237 ms raster,64ms browser init,208ms text capture,4112ms
FFmpeg. Complex: 2539 ms raster,41ms browser init,220ms text,4736ms FFmpeg.

## Direct comparison with the original branch

The original branch image was also built from `47f872a` and rendered both
fixtures. Full-video FFmpeg SSIM against this port was **1.000000 for both**:
the decoded optimized frames match the original implementation exactly in
these fixtures. Those extra renders were for fidelity, not performance claims.

## Output and visual inspection

FFprobe counted 192 frames, 720×1280, 24 fps, H.264, yuv420p, exactly 8 seconds and no
audio for both optimized fixtures. At 1.1, 3.5, 6.5 seconds, contact sheets against
current dev and the matched Remotion control were visually inspected: growth,
flash sequence, camera shrink, typography, highlighted light and final CTA
remain. Fine dense ornament antialiasing, raster-rescaled flash shape and the
original SVG glow differ visibly; pixel identity is not claimed. Matched-control
SSIM sampled at 1 fps is 0.969059 (simple) and 0.936390 (complex), similar to the
original report's known dense-raster difference.

Actual headless Chromium local simple MP4 completed in 5.03 seconds, 2,341,410 bytes.
FFprobe confirmed 192 frames, 720×1280, 24 fps, H.264, yuvj420p, 8 seconds, no audio.
Runtime H.264 capability detection returned supported. The 50-friend request
was rejected by the production resource guard before encoding. Canvas PNG
capture was tainted in this browser and correctly rejected, requiring server
fallback. This is not evidence that local PNG works in Chromium or on phones.

## Reproduction

Build unchanged dev and the feature worktree independently, then:

```sh
python3 scripts/benchmark-story-renderers.py --mode remotion \
  --baseline bemyparol-story-dev:fa88739 --out /tmp/bemyparol-benchmark-current
python3 scripts/benchmark-story-renderers.py --mode both \
  --baseline bemyparol-story-hybrid:port --optimized bemyparol-story-hybrid:port \
  --concurrency --out /tmp/bemyparol-benchmark-matched
```

Original historical results are in the source branch's
`docs/benchmarks/story-hybrid-2026-11-01.md` and
`docs/benchmarks/story-renderer-2026-10-31.md`; they were read during audit and
are not substituted for this port's measurements. Temporary synthetic videos,
JSON, test harnesses and contact sheets remain under `/tmp/bemyparol-*` and
are not committed as user media.

## Automated checks and limits

Frontend typecheck/build pass. Frontend tests 152/155; renderer 21/21;
backend 116/120. All new targeted tests pass. Remaining frontend failures were
present on untouched dev: cached-parol-display's stale request-body string,
and the two growth-ui admin/owner-summary assertions. Full ESLint retains
three no-useless-escape errors in unchanged zoom-parol-image.test.mjs:115 and
one existing CachedParolScene warning. Touched-file lint is clean.
Backend baseline failures remain DesignShowcaseContractTests route assertion,
ParolImageContractTests payload assertion (newer Scale), and two
OwnerRecoveryCipherTests exact-exception assertions on .NET 10. Existing
System.Security.Cryptography.Pkcs 9.0.4 advisory warnings also remain.

No Android/iOS/Firefox device, OS native-share chooser, live guest contribution
with SQL data, or production deployment was tested. Browser API stubs and
private synthetic renderer integration are distinguished below from real
backend action authorization tests. No merge or deployment was performed.


## Integration evidence

An isolated private renderer passed authorization denial on five private routes,
method/payload validation, owner work surviving response closure, queued work
while busy, changed-snapshot isolation, owner/direct byte-identical cache reuse,
and reconstruction of ready media after process restart. Both owner and friend
PNG output was 1080×1920. Disconnecting the last direct response killed work,
left no published file and removed its temporary directory. Missing/corrupt
backgrounds and corruption after startup all exercised verified Remotion
fallback; the high Remotion preset produced 240 frames at 1080p30.

A real React StoryShare with the actual Remotion library/native VideoEncoder
was exercised in headless Chromium, with API responses and visibility events
simulated. A completed local MP4 encoded 192 frames, exposed Share video and
Download MP4 and made no server-job or binary-export call. Manifest failure
encoded zero frames and queued exactly one owner job. Hidden-page, explicit
Cancel and changed-data scenarios each interrupted after four native encode
calls, exposed no media and queued no job. The original Remotion dependency
sent a usage-metadata POST to its licensing endpoint; it sent no video bytes.
This distinguishes local media processing from a claim of no outbound requests.

Backend action tests separately verified invalid CSRF rejection, missing owner
session/guest cookie rejection, and saved owner composition without private
light names. The live session/database/guest contribution flow and native OS
sharing chooser remain untested. Machine-readable synthetic results are in
[the adjacent JSON report](story-port-2026-11-06.json).


The final source image (`sha256:deb61a34cf696360b563cf510385ddbc5e6900fa1b6e4daff20f6ed3b2f1f405`)
was rebuilt and smoke-tested after implementation froze. Full 50-friend owner
and small guest MP4s passed the standard media contract; both selected FFmpeg
with one Chromium capture and no fallback. Owner and friend PNGs at both zero
and fifty friends all measured 1080×1920. Compose configuration and launcher
shell syntax were validated without starting application services.
