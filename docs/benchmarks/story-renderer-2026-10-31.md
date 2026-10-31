# BeMyParol Story renderer benchmark — 2026-10-31

## Environment and method

- Linux 6.12.113+deb13-amd64, 4 logical CPUs, 7.6 GiB host memory; SQL Server
  was running during the measurements.
- Docker 26.1.5. Each renderer container had a **2 vCPU quota and 2 GiB memory
  limit**. Both modes used the same image and frontend source:
  `sha256:110b4b05426b8a2648febd8ca8582b5a1551b7eeda6494845f0003cd444a4604`.
- The baseline set `STORY_RENDERER_MODE=remotion`; the optimized run set
  `STORY_RENDERER_MODE=ffmpeg`. Neither run had a cached output. Wall time is
  from POST to full response. CPU time is the container's cgroup `usage_usec`
  difference. Peak memory is the container's `memory.peak`, including startup.
- Simple input: owner, Classic Gold, default pattern, zero friends/lights.
  Complex input: friend, Sampaguita, rays pattern, 50 friends and 50 saved
  light slots, with slot 49 highlighted.

| Design | Renderer | Wall time | CPU time | Peak memory | MP4 size |
| --- | --- | ---: | ---: | ---: | ---: |
| Simple | Remotion | 68.43 s | 134.59 s | 1,550 MiB | 1,033,462 bytes |
| Simple | FFmpeg | 44.94 s | 78.45 s | 1,321 MiB | 745,874 bytes |
| Complex | Remotion | 120.24 s | 237.95 s | 1,550 MiB | 1,356,122 bytes |
| Complex | FFmpeg | 52.56 s | 97.98 s | 1,321 MiB | 876,056 bytes |

The FFmpeg path reduced wall time by **34.3%** for the simple design and
**56.3%** for the complex one. CPU time fell **41.7%** and **58.8%**;
peak container memory fell **14.8%**. Output files were **27.8%** and
**35.4%** smaller. These are measured results for this environment and these
two designs; they are not a throughput guarantee for all designs.

## Output and visual checks

`ffprobe` reported a single H.264 `yuv420p` video stream for every output,
1080 × 1920 at 30/1 fps for exactly 8.000 seconds. All four files had no
audio stream, matching the current silent Story contract. The FFmpeg path
also sets `+faststart`; both optimized files place the `moov` atom before
`mdat` (byte 36 versus bytes 3,796 and 3,772).

Contact sheets sampling every half second and full-size frames at frame 200
were inspected for both designs. The growth stages, zoom, text reveal,
layout and highlighted light remained visible in the same sequence.
FFmpeg's SSIM against Remotion at one frame per second was **0.98152**
for simple and **0.965619** for complex. Rasterizing the parol at four stages
and rescaling the PNGs introduces small pixel/color differences, especially
in the dense 50-friend design. The original renderer remains available for
exact Remotion output or visual changes the optimized path has not reviewed.

## Concurrent requests and cache

In a separate FFmpeg run, two simultaneous identical uncached requests both
returned HTTP 200 with identical bytes. A different uncached request while
that job ran received HTTP 503, confirming bounded admission. Repeating the
completed request returned HTTP 200, `X-Story-Cache: HIT`, and identical bytes.
Peak memory in that run was 1,478 MiB. This check used the final image after
media validation and cache changes, under the same two-vCPU/two-GiB limits.

## Reproduce

```bash
docker build -f story-renderer/Dockerfile -t bemyparol-story-optimized:full .
python3 scripts/benchmark-story-renderers.py \
  --baseline bemyparol-story-optimized:full \
  --optimized bemyparol-story-optimized:full
python3 scripts/benchmark-story-renderers.py --mode ffmpeg \
  --optimized bemyparol-story-optimized:full --concurrency-only
```

The benchmark writes synthetic output videos and JSON measurements under a
temporary directory. Generated videos and user content are not committed.
