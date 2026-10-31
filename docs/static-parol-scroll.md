# Static parol presentation and native scrolling

## Reason
On touch phones, swiping across a draggable SVG parol captured the gesture and
moved the parol rather than scrolling the page. Desktop visitors could also drag
the scene unintentionally.

## Implementation

- **Public welcome/landing page:** replaces the old interactive `previewCount={5}`
  procedural SVG with a fixed `/parol-classic-preview.svg` image. It is the
  exact approved **zero-friend Classic Gold** parol SVG already shipped in
  `downtime/index.html` (so it is not a new/invented artwork), extracted as
  a local `src/frontend/public` asset. The browser can cache it. No API call
  or SVG renderer is needed merely to display the landing art.
- **Owner and invitation guest parol:** keeps the real saved-state protected
  flattened WebP and the three-wave arrival/reveal animation, but displays
  it as a non-draggable `<img>`. The incoming image is another non-draggable
  overlay with the same circular mask/glint, not a separate rendered parol.
- Removes drag, pan, pinch-capture and zoom/Fit controls from the normal
  owner/guest view. Native vertical scrolling and browser gestures are
  available over the image on phones and on desktop.
- The owner/guest image still refreshes when actual saved friend count,
  contribution slots, design or pattern changes; stale images, abort/retry,
  image URL cleanup and permission checks remain intact.
- The **admin-only Design Lab** is unchanged and still offers its interactive
  synthetic preview. PNG/MP4 sharing is unchanged.

## Manual verification

1. On a phone-sized window (320px/375px) and a real phone, open the public
   welcome page. Swipe vertically **on top of the parol**: the entire page
   should scroll, and the parol must not move within its card.
2. Sign in as an owner and visit a guest invitation: repeat the swipe on both
   saved-parol images. On desktop, mouse dragging should not pan the art.
3. Verify no floating zoom buttons appear on the owner/guest parol.
4. Add a light as a guest while the owner dashboard is open. The saved parol
   should refresh and reveal new decoration in three waves, **without**
   changing the image position or preventing scroll.
5. Open the admin-only Design Lab and confirm its synthetic preview is still
   available. Test sharing PNG/MP4, recovery and invitation link separately.
6. Run `bash scripts/verify-phase6.sh --skip-install` from the repo root
   after pulling the branch to validate all frontend, renderer and .NET checks.

This change is frontend-only and requires no backend, schema, Cloudflare,
HostHatch or production infrastructure changes. Browser/mobile behavior still
needs real-device QA before release.
