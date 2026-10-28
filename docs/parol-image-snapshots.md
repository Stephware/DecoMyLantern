# Phase 2 — Server-generated parol image snapshots

**Purpose:** Flatten the already-approved, complete BeMyParol artwork into one
optimized image. **This phase does not change** `LanternScene`, the approved
15-region SVG geometry, three-wave animation, guest flow, or logo.

## Design

- A new `BeMyParolSnapshot` still composition (1200 × 1280) reuses the same
  `ProceduralOuterShell`, `ParolArtwork`, `outerFitZoom`, themes, patterns
  and saved light positions as the existing live parol. It has a transparent
  background for flexible use in Phase 3.
- The existing private Remotion service now supports `POST /render-parol`;
  the existing `POST /render` Story MP4/PNG path is unchanged.
- The renderer rasterizes a **PNG** with Remotion. For web delivery, it converts
  the PNG to **WebP at quality 86** using Sharp. Both output formats are supported.
- Images are content-addressed by rendering-version, design, pattern, accepted
  friend count, canonical sorted slots, and format. This avoids regenerating
  the same parol on every visit; adding/removing a friend or saving new
  customization changes the cache key automatically.
- Files are stored on the **private renderer's disk** under the OS temp
  directory, retained for up to 24 hours and limited to 128 images. Owner
  and invited viewers of the same parol reuse the same file. A renderer
  restart or redeployment may clear this cache (regeneration is safe).
- A single render operation runs at a time to bound CPU/memory. A cold miss
  during another render responds HTTP 503 with Retry-After: 2; a cached
  image can be served immediately. No rendering is performed while writing a
  new contribution to the database. Phase 3 should handle 503 with a retry
  or retained previous image.

## Public API (authentication, not public media URLs)

| Method | Path | Access | Request |
| --- | --- | --- | --- |
| POST | `/api/my/lantern/image` | Owner token + CSRF | `{"format":"webp"}` |
| POST | `/api/invitations/image` | Valid invitation + guest CSRF | `{"token":"16-char-token","format":"webp"}` |

`format` accepts `webp` (default) or `png`. Response is an image binary
with the corresponding MIME type and `X-Parol-Cache: HIT|MISS` for local
diagnosis. Returned image responses use `Cache-Control: private, no-store`
because these APIs require an owner session or valid invitation. **The server
disk is the cache**, not the browser or a public CDN.

The ASP.NET API queries its own database for the design, pattern, actual
accepted friend count and occupied light slots. It sends only those fields to
the private renderer via the existing secret-authenticated backend-to-renderer
connection. Guests never receive owner IDs, names, recovery codes or sealed
messages. Tokens stay inside POST bodies; no image token is exposed in a URL.

Rate limits are 60 image requests per 10 minutes per owner / observed guest
IP (per API instance). The renderer currently accepts at most 500 light slots
per image, consistent with the existing Story renderer input safety bound.
Large real parols can need higher operational limits after load testing.

## Local checks

The existing launcher now prepares Sharp as well as Remotion:

```bash
git switch dev
git pull origin dev
bash scripts/dev-with-stories.sh
```

Stop old services using 5050, 5173 and 7070 before running the launcher.
No new environment variable or database migration is required; the
renderer uses the already configured `STORY_RENDERER_SECRET`.

In another terminal, check:

```bash
cd story-renderer
npm test
cd ../src/frontend
npm test
npm run typecheck
npm run build
cd ../..
dotnet test DecoMyLantern.slnx
```

To exercise the protected owner image endpoint from the *same authenticated
browser session*, use browser DevTools after opening the owner dashboard:

```js
const {token} = await fetch('/api/owner/csrf',
  {credentials:'same-origin'}).then(r => r.json());
const response = await fetch('/api/my/lantern/image', {
  method:'POST', credentials:'same-origin',
  headers:{'Content-Type':'application/json','X-CSRF-TOKEN':token},
  body:JSON.stringify({format:'webp'})
});
console.log(response.status, response.headers.get('content-type'),
  response.headers.get('x-parol-cache'));
if (response.ok) {
  const image = URL.createObjectURL(await response.blob());
  window.open(image);
}
```

Call it again to confirm `HIT`. Add one actual friend or change the
selected parol design, then call again and confirm `MISS`. Verify the
image is visually identical to the currently approved live parol at
0, 10, 20, 35 and 50 friends. Test PNG as well.

## Phase 3 — Display the cached parol image in the frontend

The owner's saved parol and an invited guest's real parol now display the
**same 1200 × 1280 server-generated WebP** as a single `<image>` element in a
small SVG viewport. The frontend no longer mounts `ProceduralOuterShell` or
thousands of vector facets for these real parol views.

- `LanternScene` routes **saved states** into `CachedParolScene`. The existing
  original SVG implementation is preserved as `LegacyLanternPreview` for the
  **unsaved Design Lab** until the separate production-control cleanup phase.
- Only the actual, persisted owner state or valid invitation token is sent to
  the Phase 2 snapshot endpoints. The frontend does not send simulation counts,
  custom geometry, private messages, names or arbitrary design keys.
- The viewer creates a temporary local object URL from the authenticated WebP
  Blob; URLs are revoked on replacement or unmount. A canonical state key
  (current lantern/invitation, saved design and pattern, friend count, sorted
  slots) avoids redundant requests during the dashboard's 12-second polling.
- When the saved parol changes, the previous image remains visible while the
  updated image is requested. HTTP 503 busy failures are retried twice with
  short backoff; a Retry button appears if generation still fails. Outdated
  responses are aborted/ignored, so a slow older state cannot replace newer
  content.
- Drag, pinch, zoom controls and Fit work on the **single image**. Lightweight
  selection of existing light positions remains available without mounting
  the full procedural SVG. The snapshot is already fitted, so its initial zoom
  is 1 rather than applying the original geometric Fit transform again.
- Owner customizations are previewed as the saved image **after Save**, not as
  unsaved server images. The dashboard explicitly notes this when a draft
  is awaiting Save.
- The approved procedural artwork and its original animation logic are not
  changed. Live three-wave image transitions will be implemented separately
  in **Phase 4**. Synthetic Design Lab previews still use the old live SVG
  because they are not persisted, and Phase 5 will remove development controls
  from the public UI.

### Phase 3 smoke checks

After `bash scripts/dev-with-stories.sh`, check the owner dashboard and a
valid guest invitation at 0, 1, 11, 20 and 50 friends. Verify:

1. Only one flattened image is visible in a real parol view; browser DevTools
   shows the API `POST /api/.../image` (WebP) and no thousands of live SVG
   ornaments.
2. A repeated 12-second owner poll without changes produces **no further
   image request**.
3. An accepted contribution or saved design/pattern change replaces the image,
   showing the updated true state. Rapid changes don't overwrite the newest
   result with an older one.
4. Zoom/Fit/pan and the light highlighting controls work on mobile and desktop.
5. Stopping the private renderer shows an error and a Retry control, without
   crashing the page. Restart it and Retry.
6. The Story MP4/PNG exporter and synthetic Design Lab preview remain unchanged.
   No owner session or invitation secret is exposed in an image URL.

Run `npm test && npm run lint && npm run typecheck && npm run build` in
`src/frontend`, `npm test` in `story-renderer`, and
`dotnet test DecoMyLantern.slnx` from the repository root.

## Phase 4 — Three-wave animation of a single cached image

The real owner dashboard and invited-guest view now animate **one newly
accepted friend** using only the old and new, already-completed WebP images.
The browser never mounts the procedural SVG to animate a real contribution.

1. The Phase 3 request waits for and decodes the newly cached WebP. The
   previously displayed image stays visible until the new image is ready.
2. The updated image is revealed with three progressively larger circular
   masks and a brief illuminated ring on each wave:
   **750 ms → 850 ms → 1100 ms**, matching the original wave durations.
3. After 2.7 seconds, the completed WebP replaces the previous image;
   the old temporary object URL is revoked. Zoom, pan and Fit remain
   available, and existing contributor selection works after completion.

These are **three image reveal effects**, not the former three separately
rendered geometry frames. This saves CPU and network traffic because one
final server snapshot is reused; the approved complete parol appearance
stays identical to Phase 2. No new backend endpoints or additional images
per contribution are needed.

The three-wave effect is deliberately skipped on initial load, after
simultaneous/multiple contributions, when switching owner/invitation or
design/pattern, during rapid back-to-back changes, and when a page is
hidden or has just returned from a background tab. Users requesting
reduced motion always see the completed snapshot immediately. An
interrupted animation finishes on tab hide; an interrupted image request
is aborted, and a renderer failure retains the last available image.

### Phase 4 checks

- Owner watching a parol at 10 friends: accept one real friend and verify
  three light-reveal waves, then a **single** final image at 11 friends.
- Guest opens a valid invitation: add one light and verify the same effect,
  with no additional server snapshot calls for each animation wave.
- Submit two or more contributions before an owner poll; ensure the
  display skips the old replay and shows the newest complete image.
- Change a design/pattern; it must update instantly, not pretend a new
  friend joined.
- Reload at 20/35/50 friends, background and return to the tab, or enable
  reduced motion: do not replay animation.
- Verify mobile pinch, pan, Fit, and saved light highlighting while the
  same approved parol remains crisp and correctly fitted.
- Stop the renderer and confirm retry/error behavior remains functional.

**Phase 5:** Remove the remaining Design Lab and admin/test controls from the
public UI.
