# Phase 3 — Actual parol PNG + animated Story MP4 sharing

This phase finishes the unified Share your parol interface established in Phase 2. **Frontend-only.** No ASP.NET, private renderer, SQL/database, Cloudflare, HostHatch, ads or deployment changes.

## User-visible results

- **Static image:** an actual saved **1200 × 1280 transparent parol PNG**, from the existing protected owner or invited-guest image endpoint. No frame from the Story animation, Story text or simulated friends.
- **Animated Story:** the existing **8-second, 1080 × 1920 MP4** with the original Story rendering and three-wave animation.
- **Sharing:** native device app picker, where file sharing is supported, for both image and video. No Instagram/Facebook login or forced destination.
- **Downloads:** BeMyParol-Parol.png and BeMyParol-Story.mp4.
- **Invitation:** existing Copy invitation link and manual selection fallback. Story apps may require the user to add the link using a Link sticker.

The image preview uses the parol's 15:16 aspect ratio and a dark backdrop to display its transparent PNG. Users choose **Prepare parol PNG** to request the real saved image. Animated Story previews remain 9:16. No export request is sent merely by toggling formats. Image and video blobs are reused for the current saved state.

## Endpoint and privacy contract

Owner PNG: POST /api/my/lantern/image with body format=png, authenticated owner cookie and owner CSRF.

Guest PNG: POST /api/invitations/image with body format=png and the existing invitation token plus guest CSRF.

The existing image renderer already supports both png and webp with a content-addressed private cache; no API/controller or rendering changes were required. The frontend verifies the MIME type and does not expose private tokens in image URLs.

The backend determines the actual accepted friend count, design, pattern and slot positions from saved state. Names, recovery keys and sealed messages are not sent into the image. The owner/guest WebP viewer continues requesting WebP by default.

A media identity key includes owner/guest kind, invitation token and URL, saved design, pattern, count, sorted contribution slots and guest Story highlight. Requests that resolve after a change are discarded; old blobs are not available through sharing buttons or preview during a state transition. Blob URLs are revoked when replaced/unmounted.

## Validation

From src/frontend run: npm ci; npm run typecheck; npm run lint; npm test; npm run build.

Run the existing private local renderer with bash scripts/dev-with-stories.sh from repository root when necessary.

Manual checks:

1. For saved owner parols at 0, 11 and 50 friends, prepare, download and inspect PNG art, transparency and 1200 × 1280 dimensions.
2. Repeat on a guest invitation after contributing, then verify owner and guest previews match the same real saved growth.
3. Open a different invitation or receive a new friend while a prior image is loading; ensure stale media never appears for download/sharing.
4. Prepare and play the MP4; check the original 8-second three-wave Story, download and mobile sharing.
5. On a supported phone, use native Share image and Share video; on unsupported devices, check download and invitation copy fallback.
6. Check renderer HTTP 503/retry, clipboard denial, narrow screens, modal Escape/Tab focus, and automatic recovery from export errors.
7. Recheck owner recovery, design selection, invitation restrictions, live WebP Fit/zoom, and artwork at 0/11/50 friends.

GitHub source checks alone cannot confirm npm compile/lint/test, actual rendering, native mobile sharing or browser visual quality. Perform those before production deployment.