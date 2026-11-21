# Adaptive parol zoom images (1x, 2x, 3x)

The actual owner/guest parol uses the **same approved vector SVG artwork**
and always starts with the existing 1200x1280 WebP at quality 86.
Only deliberate zooming requests additional resolution:

| Viewer zoom | Requested scale | Rendered pixels | Delay |
| --- | --- | --- | --- |
| Below 1.75x | 1x | 1200x1280 | Normal page load |
| 1.75x to below 3x | 2x | 2400x2560 | 400 ms |
| 3x to 4x (maximum) | 3x | 3600x3840 | 800 ms |

The page requests **only the desired higher-resolution tier**. Jumping
directly from normal view to 4x zoom therefore does not initiate a 2x
request as well. Existing 2x images remain available as a fallback while
a 3x image loads. The same zoom, pan, Fit and clickable friend lights work.

## Caching and load control

- Both authorized POST image endpoints continue to read canonical saved owner
  or guest state. Browser requests include only `format:'webp'` and, for
  on-demand upgrades, `scale:2` or `scale:3` (plus invitation token for
  guests). **No private messages, names or arbitrary artwork payloads**.
- The private Remotion renderer rasterizes the exact same
  `BeMyParolSnapshot` SVG using `renderStill({scale})`; Sharp still encodes
  WebP with quality 86. Static PNG exports and animated MP4 Stories are
  unchanged.
- Cache keys are based on approved design, pattern, actual friend count,
  sorted light slots and resolution. **1x and 2x digests and filenames remain
  compatible with the previous version**. 3x has a distinct digest and
  `-3x.webp` suffix. Identical owner/guest snapshots share renderer cache
  files without being exposed through public URLs.
- Renderer cache bounds: **128 total images**, **at most 32 at 2x** and
  **at most 12 at 3x**, retained for **up to 24 hours**. Recently requested
  images have priority on cleanup. No extra server or storage service is
  required.
- At most **one renderer job** runs at a time. Cold misses return 503 while
  busy, with existing bounded retries; completed cache hits return quickly.
  The browser uses a debounce and cancels requests on a zoom-tier change,
  new parol state or unmount, avoiding repetitive upgrades.
- If the requested image fails, exceeds the existing **12 MB API response
  limit**, or the server is busy, the viewer keeps its already-loaded 2x
  or 1x image. It never blanks the parol. A later deliberate zoom change
  can retry.
- The browser reuses decoded 2x and 3x images within the same parol view,
  and object URLs are cleaned up when the saved state changes or the
  component unmounts.

**Important:** A 3x render processes **9 times the pixels of 1x** and **2.25
times those of 2x**. The small cache and on-demand threshold reduce load,
but a first-time render may still be CPU- and RAM-intensive on the renderer.
The server operator should verify peak memory and latency with large
50-friend parols before production. Cache retention can end earlier than
24 hours under heavy use; caching is local to each renderer instance, not
distributed across multiple hosts.

## Validation

From repository root:

```bash
bash scripts/verify-phase6.sh --skip-install
(cd story-renderer && npm test)
(cd src/frontend && npm test && npm run typecheck && npm run lint && npm run build)
dotnet test DecoMyLantern.slnx
```

Manual checks with Chrome DevTools Network > Fetch/XHR:

1. At normal zoom, the owner/guest image POST contains no `scale`; the
   default 1200x1280 WebP is used.
2. At about 2x zoom, after 400ms, inspect `scale:2` and a 2400x2560
   image. A repeated identical request reports `X-Parol-Cache: HIT`.
3. At 3x or 4x zoom, after 800ms, inspect `scale:3` and a 3600x3840
   image. On a cache miss, the renderer generates it once; on a hit
   it returns the prior file. Verify no simultaneous 2x request when
   jumping directly to 4x.
4. Simulate slow network, busy 503, 12MB rejection, zooming out during
   load and changing the friend count: parol stays visible with the best
   available image and never shows a stale state.
5. Confirm owner/guest drag, pinch, zoom, Fit, friend-light selection,
   three-wave growth reveals, PNG/MP4 sharing, and public static welcome
   parol remain unchanged.

There is no EF Core migration, hosting configuration change, external
rendering service or change to the approved artwork. Full browser/rendering
and peak-load tests are required before production release.
