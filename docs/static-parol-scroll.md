# Welcome page static parol and natural scrolling

## Scope

**Only the public welcome/landing page is changed.** The real saved parol
used by signed-in owners and invitation guests must keep its original
interaction, artwork, growth animation, and rendering behavior.

## Welcome page change

- Replaces the former interactive `previewCount={5}` sample with a
  non-draggable, local `/parol-classic-preview.svg` image.
- Reuses the approved Classic Gold **zero-friend** parol illustration from
  `downtime/index.html` as a standalone static file, rather than introducing
  a new design.
- The image is non-interactive (`pointer-events-none` and
  `draggable={false}`), so swiping over it doesn't intercept normal page
  scrolling on a phone. No remote API request or procedural renderer is
  required for this welcome preview.

## Deliberately unchanged

- `CachedParolScene.tsx` restored **exactly** from the pre-PR-#57
  implementation, preserving the actual owner and guest parol with original
  drag/pan/pinch/zoom/Fit controls, clickable friend lights, secured WebP
  rendering, saved-state refresh and three-wave animation.
- Original owner/guest snapshot tests restored to match the real viewer.
- The admin Design Lab, approved procedural parol artwork, growth rules,
  image/video sharing, recovery flow, API, database and server infrastructure
  remain unchanged.

## Verify

1. Open the **public welcome page** on a phone. Swipe vertically starting
   directly over the parol: the **page** should scroll, and the preview image
   should not drag or pan inside its card.
2. Open an existing **owner** parol and a **guest** invitation. Their original
   interactive viewer (zoom/Fit, touch gestures and saved-state growth
   reveal) should behave as it did before PR #57.
3. On desktop, confirm the welcome illustration is not draggable.
4. Run `bash scripts/verify-phase6.sh --skip-install` from the repository
   root after pulling the updated branch.

Real-device and full build verification must be completed locally; source
checks alone do not prove mobile browser behavior.
