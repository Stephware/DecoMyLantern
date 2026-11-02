# Public welcome parol: full-grown, still image

## Scope

Only the **public welcome/landing page's displayed illustration** changes.
The interactive, saved owner/guest parols, approved geometry, friendship growth,
three-wave reveals, zoom/pan, light selection, sharing and admin Design Lab
are not modified by this change.

## Welcome image

- The welcome page displays an ordinary non-draggable HTML `<img>` with
  `pointer-events-none`, allowing normal page scrolling on mobile and
  desktop. There are no SVG pointer handlers, pan/zoom buttons, or JS
  reconstruction of the artwork.
- Its main image source is the existing, public
  `/api/designs/classic/showcase?v=v1` endpoint. The endpoint creates the
  **approved Classic Gold parol at exactly 50 synthetic friends**,
  `patternKey = "default"`, and 50 ordered light slots via the same
  server-side `BeMyParolSnapshot` composition used in the design selector.
- This is a **fixed raster image in the browser**, not a procedural or
  movable viewer. The first uncached request may cause one background
  Remotion image render; subsequent requests reuse the renderer's
  content-addressed 24-hour disk cache and the API's
  `Cache-Control: public, max-age=86400` browser cache.
- If the optional showcase renderer is offline or busy, the welcome
  illustration falls back to the already committed standalone zero-friend
  `/parol-classic-preview.svg`, which exactly matches the approved
  Classic Gold image in `downtime/index.html`.
- The zero-friend SVG remains committed for the fallback. The downtime
  screen stays fully standalone and is not changed.

## Verification

1. Open the unauthenticated welcome page on phone and desktop. It should
   show **Classic Gold at 50 friends** and never capture drag/swipe
   gestures; scrolling over the image should move the page.
2. In DevTools Network, confirm `GET /api/designs/classic/showcase?v=v1`
   responds with `image/webp` and browser cache headers. Reload to see
   the cached copy. A cold request may take longer while Remotion renders.
3. Compare the welcome image with the **Classic Gold 50-friend** card
   inside the onboarding design picker: same actual ornament/artwork and
   full-bloom decorative regions.
4. Stop the renderer and reload without a cached response: the welcome
   image should gracefully fall back to the old local Classic Gold SVG,
   not a broken image or draggable parol.
5. Verify owner/guest parol interactions, PNG/MP4 sharing and the
   separate admin Design Lab are unchanged.
6. Run `bash scripts/verify-phase6.sh --skip-install` at repository root.

**Limitation:** The 50-friend graphic is an HTTP-cached server-rendered
WebP, not an offline-bundled `public` file. A cold visit relies on the
existing showcase renderer; this reuses its cache and does not create a new
rendering endpoint. Real-device and end-to-end testing remain required.
