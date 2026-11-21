# Phase 3 — Scroll-first parol on phones

The actual, saved **owner and guest** parol was intercepting normal phone swipes
because its entire SVG used `touch-action: none` and pointer capture.

## New mobile interaction

On a primary **coarse-pointer** (touch) device:

1. The parol on the normal page is an image-first, **scroll-safe** view. One
   finger swipes over its surface scroll the **webpage**, including toward the
   message/contribution area below the parol. Tapping an existing friend light
   still highlights the closest contributor; the browser handles ordinary
   touch gestures.
2. A visible **Explore parol** control opens an accessible, screen-filling
   viewer. Only here does the parol capture pointer gestures. Users can drag to
   pan, pinch to zoom, use +/- and Fit, and cycle through friend lights.
3. **Done exploring** (or the Escape key) closes the viewer, restores body
   scrolling and focus to the opener, and fits the embedded image again so it
   never remains stuck on a zoomed crop with hidden controls.

The Explore viewer is **portaled to `document.body`**, outside the owner's
and guest's existing overflow-hidden card layout. It includes a focus trap,
an accessible title and help text, and a visible exit button. The underlying
page is locked only while the full-screen viewer is open. The selected friend's
display name is visible inside Explore.

## What did not change

- Desktop/fine-pointer users retain their existing draggable, zoomable parol
  and controls without needing an Explore button. A real mouse on a
  touch-capable tablet still allows mouse dragging.
- Both owner and guest use the **same `CachedParolScene`**, backed by the
  existing authorized saved image API and one WebP scene, not a separate SVG
  implementation or an additional rendering request on opening Explore.
- Zoom still ranges from 0.5x to 4x; on-demand **2x WebP at 1.75x**, and
  **3x at 3x**, keep their existing debounce/caching/abort/fallback behavior.
- Friend-light selection, 750/850/1100ms three-wave growth reveals, image
  retries, all approved parol designs, the owner admin Design Lab and the
  phone-first/video/static Story sharing flow are untouched.
- Desktop and public welcome page are unchanged; there are no backend,
  database, cache, hosting, or third-party dependency changes.

## Verification

From the repository root:

```bash
(cd src/frontend && npm ci && npm test && npm run typecheck && npm run lint && npm run build)
bash scripts/verify-phase6.sh --skip-install
```

Real-device acceptance criteria:

1. Open the **owner dashboard** on a phone (iOS Safari and Android Chrome).
   Swipe vertically **starting over the parol**, without pressing anything:
   the page must scroll to the next section. The parol must not drift.
2. Repeat on the **guest invitation** page; scroll across the image down to
   the **Share your light** form. Test after the guest has contributed, too.
3. Tap an individual friend light in the embedded view; its name should
   still appear. Scrolling should not accidentally select a light.
4. Tap **Explore parol**: the viewer fills the mobile screen outside the
   clipped card. Drag the parol, pinch to zoom, use Fit and highlight lights.
   Zoom to 2x and 4x, verifying the existing 2x and 3x WebP requests.
5. Press **Done exploring** or Escape. The original scroll position and
   normal page scrolling are restored; the embedded parol fits the viewport.
   Reopening Explore should not trigger an unnecessary 1x image request.
6. Check narrow portrait, phone landscape and tablet viewport; confirm
   dialogs don't clip the exit control or let the page scroll underneath.
7. On desktop and mouse/trackpad, confirm original direct drag/pan and
   zoom/Fit without Explore mode. Test mouse use on a touchscreen laptop.
8. Verify growth wave effects and in-flight image/zoom cancellation, media
   sharing, and the separate unsaved Design Lab remain unchanged.

The new pure `canPanParol` policy has Node unit checks and the regression
tests assert the DOM/CSS wiring. **Actual touch behavior and viewport
accessibility still require physical-device/browser testing** before a
production release.
