# Public welcome parol: 20-friend Classic Gold with gentle shimmer

## Scope

Only the **welcome page** uses a 20-friend showcase. The six onboarding
design-gallery cards still default to their original **50-friend previews**.
Real owner and guest parols, their contribution counts, design choices,
1x/2x/3x zoom, mobile Explore, message reveals, and PNG/MP4 sharing are
unchanged.

## Showcase image and caching

- Welcome uses `/api/designs/classic/showcase?friends=20&v=v2`, rendered
  with the approved Classic Gold / default pattern and the **20 synthetic
  slots 0–19**. It is still a **non-draggable, non-zoomable HTML img**.
- The existing public `GET /api/designs/{designKey}/showcase` defaults to
  **50 friends** for all the design-picker cards, as before. Its optional
  `friends` query is restricted to exactly **20 or 50**; unsupported
  values are rejected. It never reads or mutates real owner contributions.
- The same `BeMyParolSnapshot` Remotion render and content-addressed
  private cache are used for both counts. The synthetic count and slots
  are included in the cache identity, keeping 20 and 50 distinct.
  `Cache-Control: public, max-age=86400` remains; the URL version
  changed for the welcome page so old 50-friend browser caches cannot
  masquerade as the 20-friend welcome image.
- If the optional showcase render fails, the committed standalone
  `/parol-classic-preview.svg` fallback still appears. The downtime
  page is not modified.

## Visual effects

- The **actual image** gently varies in brightness/saturation and casts
  a very subtle warm drop-shadow; its position, silhouette and scale
  never move.
- **Eight tiny, staggered glints** sit over the parol ornament rings,
  making the lights feel alive; **only two small stars** sit in the dark
  space outside. A subdued radial halo supports the effect without
  washing out the artwork.
- All decorative overlays are `aria-hidden` and
  `pointer-events-none`. No listeners capture touch, wheel, drag or
  pinch, so users can scroll normally over the welcome picture.
- Under `prefers-reduced-motion: reduce`, animations stop and light
  effects become static. No canvas, JS animation loop, video playback,
  additional backend renderer or new dependency is introduced.

## Verification

1. On desktop and mobile, verify the public landing page shows the 20-friend
   image and that its internal ornaments, not just its surroundings,
   visibly twinkle. The image must **never** pan or zoom, and finger swipes
   across it must scroll the page.
2. In DevTools verify `GET /api/designs/classic/showcase?friends=20&v=v2`
   responds with `image/webp` and HTTP caching; reloading should reuse
   cached media. Unsupported `friends=35` should return 400.
3. Open the design selection gallery and verify its original
   `/api/designs/{designKey}/showcase?v=v1` URLs still return **50**
   friend illustrations.
4. Test `prefers-reduced-motion` and intentionally stop the renderer:
   the fallback still displays without a broken image or scrolling trap.
5. Check saved owner/guest parols, 2x/3x zoom, admin lab, Christmas reveal,
   Story PNG and phone/server MP4 for regressions.
6. Run `(cd src/frontend && npm ci && npm test && npm run typecheck &&
   npm run lint && npm run build)`, plus the repository's existing
   ASP.NET test suite.

**Limitations:** A cold 20-friend image still relies on the existing
server renderer, not an offline-committed image. Exact glint alignment
and mobile visual performance need an actual browser review; source
checks alone cannot prove pixel-perfect appearance.
