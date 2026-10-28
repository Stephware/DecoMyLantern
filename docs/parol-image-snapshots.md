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

**Phase 3** will replace the expensive live public `LanternScene` with the
cached image. **Phase 4** will adapt the growth animation using snapshots.
Neither change is included here.
