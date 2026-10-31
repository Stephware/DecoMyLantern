# Hybrid Story rendering benchmark — 2026-11-01

## Method and environment

Linux 6.12.113+deb13-amd64, four logical host CPUs and 7.6 GiB host memory, with application and SQL Server services running. Server runs used isolated Docker containers limited to **2 CPUs and 2 GiB RAM**, with uncached synthetic designs. Wall time covers the render request through the full MP4 response. CPU time is the container cgroup usage difference. Peak memory is the container's cgroup `memory.peak`, including startup. The profiled image was `sha256:199b4baceb3d35e6ca544c5844e08909a0f5067655908da3b0450673bcc9a7d7`.

The simple design is a zero-friend Classic Gold owner parol. The complex design is a 50-friend Sampaguita rays guest parol with fifty saved slots and slot 49 highlighted. Baselines A and B are actual measurements from [the previous benchmark](story-renderer-2026-10-31.md), made on the same host and Docker limits with the prior 1080p source. C was measured with `scripts/benchmark-story-renderers.py` against the new image; two fresh runs showed some wall-time variance. D ran in Chrome Headless Shell 157.0.8080.0 on Linux using the Vite test page and WebCodecs. No Android, Firefox or iOS device was available.

| Design | Renderer | Output | Wall time | Server CPU time | Server peak RAM | MP4 size | Chromium captures |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| Simple | A. Original Remotion | 1080p/30 | 68.43 s | 134.59 s | 1,550 MiB | 1,033,462 B | 240 frames |
| Simple | B. Existing FFmpeg | 1080p/30 | 44.94 s | 78.45 s | 1,321 MiB | 745,874 B | 8 |
| Simple | C. Hybrid FFmpeg | 720p/24 | 15.58 s | 24.84 s | 829 MiB* | 367,356 B | 1 |
| Simple | D. Browser WebCodecs | 720p/24 | 20.93 s | 0 video encoding | — | 1,964,849 B | 0 server |
| Complex | A. Original Remotion | 1080p/30 | 120.24 s | 237.95 s | 1,550 MiB | 1,356,122 B | 240 frames |
| Complex | B. Existing FFmpeg | 1080p/30 | 52.56 s | 97.98 s | 1,321 MiB | 876,056 B | 8 |
| Complex | C. Hybrid FFmpeg | 720p/24 | 24.04 s | 36.97 s | 829 MiB* | 463,561 B | 1 |
| Complex | D. Browser WebCodecs | 720p/24 | 323.00 s | 0 video encoding | — | 1,827,200 B | 0 server |

\* 829 MiB was the peak across both C renders in one container. A second C run measured 896 MiB, 19.01 s and 23.91 s for simple and complex, respectively. D simple peaked at **335 MiB observed** Chrome container memory; D complex reached **at least 2.28 GiB** during sampling and is therefore excluded from normal browser selection. The production selection caps browser parols at twelve friends/slots on devices reporting at least 4 GiB of RAM, and six otherwise, with a 120-second timeout. This cap is conservative and has not been calibrated on physical phones.

Compared with B under the same container limits, C used **65.3% less wall time and 68.3% less CPU time** for simple, and **54.3% less wall time and 62.3% less CPU time** for complex. Peak container RAM was 37.3% lower in the profiled run. These comparisons include a lower-resolution output and changed SVG background/glow rendering; they are not an equal-quality encoder-only speedup claim.

## Pipeline timing (C, measured)

| Design | SVG rasterization (7 layers) | Chromium start | Chromium text still | FFmpeg composition/encode | Full render |
| --- | ---: | ---: | ---: | ---: | ---: |
| Simple | 1.004 s | 0.174 s | 0.686 s | 13.574 s | 15.568 s |
| Complex | 9.555 s | 0.164 s | 0.631 s | 13.555 s | 24.034 s |

Reusable background loading took 2 ms (202,007 bytes). The Remotion bundle took 3.255 s during startup, outside individual render requests. Complex vector rasterization is now the largest personalized preparation cost. The browser's 50-friend result demonstrates why simple browser capability detection alone is insufficient for memory safety.

## Media and visual checks

`ffprobe -count_frames` found **192 frames**, exactly **8.000 s**, H.264, 720 × 1280, 24/1 fps and no audio in both C files. C uses `yuv420p` and `+faststart`. D simple and complex files were also H.264 MP4 with 192 frames, 720 × 1280, 24/1 fps and no audio; Chromium encoded full-range `yuvj420p`, which remained playable. Browser simple was played back through an HTML video element after encoding.

At 1.1, 3.5 and 6.5 seconds, extracted frames were visually checked against the old Remotion output. The distinct parol growth geometry, flash sequence, highlighted light, zoom, typography reveal and border remain visible. Comparing the previous 1080p Remotion output after downsampling to 720p/24 against C at 24 fps yielded full-video SSIM **0.962291** for simple and **0.924100** for complex. This metric includes the intentional resolution change, new background/glow SVG, encoder differences and dense ornamental detail; it is not a pure FFmpeg compositor error score.

A matched 720p/24 Remotion control on the new visual source took 19.65 s simple and 49.44 s complex. C against that control scored SSIM **0.966446** simple and **0.928760** complex; the difference is concentrated in dense SVG antialiasing and warrants device review. D against that same control scored **0.993115** simple and **0.986463** complex, showing closer pixel fidelity at the cost of client memory and time. Normal browser selection remains restricted to smaller designs.

## Reproduce

```bash
docker build -f story-renderer/Dockerfile -t bemyparol-story-hybrid:test .
python3 scripts/benchmark-story-renderers.py --mode ffmpeg \
  --optimized bemyparol-story-hybrid:test --out /tmp/bemyparol-hybrid-benchmark
```

The script writes synthetic videos and a JSON report under `/tmp`, and prints per-stage metrics from the renderer log. [The previous benchmark](story-renderer-2026-10-31.md) has the A/B reproduction commands. Browser timing was recorded from `performance.now()` around `renderStoryInBrowser()` in the local Chrome test page; use the same fixture data and measure Chrome memory during the render. The test page and generated videos are not part of the repository or deployed site.
