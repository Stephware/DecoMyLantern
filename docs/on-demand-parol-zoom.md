# On-demand 2x parol snapshots for zoom

## Problem
Actual saved owner/guest parols are rasterized once as 1200x1280 WebP (quality
86). The UI supports up to 4x zoom but currently magnifies that fixed bitmap,
which softens the fine geometry in the approved SVG ornament.

## Implemented behavior
- **Default remains unchanged:** 1200x1280 WebP, quality 86, the same
  authenticated POST `/api/my/lantern/image` and `/api/invitations/image`.
- **Only when zoom >= 1.75x:** After a 400ms debounce, request the same parol
  at `scale:2`; the backend always retrieves authoritative owner or invitation
  state, never accepts client-supplied designs or light slots.
- The private Remotion renderer calls `renderStill({scale:2})` on the exact same
  `BeMyParolSnapshot` composition, yielding **2400x2560 real rendered pixels**
  rather than enlarging a 1x bitmap. Sharp still encodes WebP quality 86.
- The 2x output has a **distinct SHA-256 cache key**. Standard-scale requests
  retain their previous digest and reuse existing cached files. Owner and
  invited guests accessing the same saved state and scale share the same
  renderer disk cache.
- Existing renderer cache remains **up to 24 hours / 128 images total**,
  including **at most 32 high-resolution WebPs**, with at most
  one cold render active at a time. Cache hits reuse the file. Cold 2x misses
  during another render respond 503. The browser makes at most three requests
  with short backoff after 503; other errors don't retry automatically.
- The current standard WebP remains visible and zoomable while 2x loads and
  decodes; the viewer swaps a single image URL after success. Abort/cancel,
  object URL cleanup, state-key guard and fallback to the standard image
  prevent stale images or blank displays. Zoom out and back in allows a
  previously failed upgrade to retry; loaded 2x remains reused in the current
  view.
- **Unchanged:** SVG artwork, growth rules, actual owner/guest pan/zoom/fit,
  friend-light highlight/selection, three-wave growth animation, public static
  welcome image, PNG sharing and MP4 Story rendering.

## Performance and limits
A 2x render processes **4x the pixels** of a standard snapshot. This cost is
incurred only on a cold 2x cache miss following deliberate user zoom; standard
visitors never request it. A short debounce and deduplication of the cached
SHA-256 output prevent unnecessary repeat rendering. The renderer remains
single-render CPU bounded with the existing 503 and retry behavior.

The API still enforces its **12 MB image-response limit**. Oversized high-res
files cannot be served through it, so the browser retains standard quality.
The 128-file cache cap applies across both scales, with an additional
32-file limit for the 2x variants so normal snapshots keep priority; 2x files
occupy more disk space and retention may be less than 24 hours under heavy use. Persistent
cloud/shared storage and multiple-renderer deduplication are **not included**.

## Verification
Run from the repository root:

```bash
bash scripts/verify-phase6.sh --skip-install
cd story-renderer && npm test
cd ../src/frontend && npm test && npm run typecheck && npm run lint && npm run build
```

Manual checks:
1. Open actual saved owner and invited-guest parols. At zoom 1x, inspect the
   network request body: it contains only `format:'webp'` (plus guest token),
   no scale field.
2. Zoom past 1.75x and hold for >400ms; the additional authorized WebP POST
   includes `scale:2`. Decode/image pixel dimensions should be 2400x2560.
3. At the same zoom, reopen/re-request identical parol data: renderer
   `X-Parol-Cache` should report `HIT`, without a second cold Remotion render.
   Zooming repeatedly in one mount should not cause additional image requests.
4. Compare 1x and 2x at 2-4x zoom on a real phone/desktop: ornament edges and
   fine decoration should be measurably clearer, with unchanged geometry.
5. Simulate 503, a 12MB image rejection, delayed network, a rapidly changing
   friend count and zooming out during the fetch. The standard image must
   remain usable; outdated or aborted high-res results must not be displayed.
6. Verify pan, Fit, selecting light labels, and a newly accepted friend's
   three-wave growth reveal, with no extra high-res render until the wave
   ends and zoom remains above the threshold.
7. Verify PNG export still sends only `format:'png'`, the Story MP4 is
   unaffected, and the public welcome page remains static.

No database migrations, Cloudflare/server-host configuration, new
infrastructure dependencies or parol design changes are required. Full
end-to-end Remotion and real-device checks remain necessary before release.
