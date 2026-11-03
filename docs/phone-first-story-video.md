# Phase 1 — Phone-first animated MP4 with existing server queue fallback

## Scope

Only **animated Story MP4 generation** changes. The transparent PNG sharing
flow, approved `StoryFrame` artwork and three-wave animation, owner/guest
parol, 1x/2x/3x image snapshots, Christmas inbox, existing private Remotion
renderer, and owner queue stay in place.

## User experience

1. The existing sharing dialog checks **phone** encoding support only after
   the owner opens **Animated Story**; the MP4 browser module is lazy-loaded.
2. If supported, the default action is **Generate on this phone**.
   **Generate in background instead** remains available as an explicit
   alternative so users can close the tab and return to their MP4 later.
3. If unsupported, the default remains the existing **Generate animated MP4**
   action, using the private owner queue.
4. The phone path uses the original `StoryFrame.tsx` at each of 240 frames,
   30fps, 1080 × 1920, and encodes H.264/AVC into MP4 using the browser's
   WebCodecs encoder with Mediabunny as the MP4 muxer. No media or private
   messages are uploaded to a new service.
5. If the browser refuses to rasterize the approved artwork or the phone
   encoder fails (including resource/latency errors), the same request
   **automatically falls back to the existing server queue**.
6. The original preview, download and native share-file chooser work for
   either output. No Facebook/Instagram account connection is needed.

## Device safeguards

- The phone path is considered only for narrow, touch-capable screens,
  secure contexts, and browsers supporting the *requested* AVC codec,
  resolution and framerate. Other devices retain the server workflow.
- The phone must stay on this page while encoding. Closing the dialog,
  leaving the page, aborting, or hiding the browser cancels local work; it
  **does not** create a background phone task.
- Local work is capped at **120 seconds** and yields frequently to keep
  touch/cancel/progress responsive. It validates SVG canvas readback, probes
  that the frame actually changes, verifies output is nonempty MP4, and
  releases canvas/temporary URLs on completion or error.
- If local rendering fails unexpectedly, the fallback queue is bounded to
  12 jobs on the existing single-worker private Remotion instance. Its
  existing resume-on-return behavior and up-to-24-hour temporary MP4 cache
  remain intact. No second renderer is launched in parallel.
- A saved parol change (new friend/design) cancels the in-progress client
  task and prevents stale media from being offered; the owner queue still
  derives current state server-side.

## Important technical limitations

- `StoryFrame` is composed of HTML/CSS and inline SVG. Client-side capture
  uses an SVG `foreignObject` image rendered into a canvas. Some Safari
  versions and embedded browsers will not paint this reliably, even if they
  support WebCodecs. Such phones must use the existing queue.
- 240 full-size canvas captures can be expensive, particularly with many
  ornament layers. A successful codec check does **not** guarantee a smooth
  render; the browser can reject the capture, refuse encoding, or run out
  of resources. The automatic fallback covers handled failures but cannot
  recover if the browser process itself crashes. Test on real low-memory
  phones before enabling broadly in production.
- The local MP4 is kept in browser memory only while the sharing component
  remains mounted. It is **not** saved to a persistent cross-session queue.
  For leave-and-return, choose **Generate in background instead**.
- The existing fallback server queue is **not restart-durable**; it survives
  closing a browser tab but not renderer process restarts. Its bounded
  temporary cache remains as before.
- No new DB migrations, worker hosts, Cloudflare rules, or other deployment
  changes are required. `mediabunny` is pinned to 1.65.0 and loaded only
  for the phone path.

## Local verification

From the repository root:

```bash
(cd src/frontend && npm ci && npm test && npm run typecheck && npm run lint && npm run build)
(cd story-renderer && npm test)
dotnet test DecoMyLantern.slnx
bash scripts/verify-phase6.sh --skip-install
```

Manual test matrix:

1. **Android Chrome and iOS Safari**: test actual 0-, 10-, and 50-friend
   parols; if the phone capability is supported, generate local video and
   inspect all **three waves**, final ornament, branding and CTA. It must
   play as an 8-second 1080 × 1920 H.264 MP4, and share/download correctly.
2. **Unsupported phone or browser**: no local action should appear. The
   existing background queue must still generate and retrieve the video.
3. **Supported phone, manual background choice**: should queue immediately;
   close/reopen sharing to see `queued`, `rendering`, or `ready`, and
   download without starting another render.
4. **Simulated phone-side failure**: local error automatically queues one
   server job; no duplicate render occurs. Cancel or close *before* server
   submission must not launch a fallback job.
5. **Cancel, close, hide tab, and change saved parol state while encoding**:
   no stale video becomes sharable; local work stops and cleans up.
6. Verify the PNG export remains transparent and unchanged (Phase 2 will
   separately change static PNG styling); guest success still only offers
   **Create my own parol**.
7. Compare selected frames between browser and Remotion results on real
   devices. If foreignObject capture or output quality differs, treat that
   browser as incompatible and prefer the server queue.

The full device, visual, performance and end-to-end checks require an
actual browser/renderer environment; static source inspection is insufficient.
