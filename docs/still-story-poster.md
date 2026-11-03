# Phase 2 — Static sharing image matches the completed animated Story

## User-facing behavior

In **Share your parol → Static image**, **Prepare Story PNG** now exports an
**actual 1080 × 1920 (9:16) still image of the existing Story video's
completed frame**. It includes the same:

- Full-grown parol design, selected pattern and actual accepted light slots
- Dark navy festive background, gold decorative border and glow
- BeMyParol branding and “A light from every friend” heading
- Actual saved friend count and invitation call-to-action
- Bottom text reminding viewers to find the invitation in a Link sticker

The image is not animated. This is the existing `StoryFrame.tsx` at
**frame 200**, after the three-wave reveal has finished; no independent
artwork implementation is introduced. The static share preview uses the same
portrait frame even before the image is generated.

Users retain **Share image**, **Download PNG**, native device share selection
and **Copy invitation link**. The download is now `BeMyParol-Story.png`
rather than `BeMyParol-Parol.png`.

## Reuse and server work

- Frontend calls the existing protected `exportStoryMedia(kind, 'png', token)`
  helper, which POSTs to `/api/my/lantern/story` for owners or
  `/api/invitations/story` for previously contributing guests. The
  authentication, CSRF, guest contribution check, quotas, and payload
  sanitization are those of the existing Story export endpoint.
- The existing private `/render` Remotion renderer already uses
  `BeMyParolStory` and `renderStill({frame:200,imageFormat:'png'})`, with
  a 1080 × 1920 composition and the established on-disk media cache
  (up to 24 hours / 32 files). No additional renderer service or API
  endpoint is needed.
- A PNG render is requested **only when the user prepares the image**;
  opening the dialog merely shows the local React StoryFrame preview.
  The current retry logic handles temporary 503/504 errors; the UI
  refuses an unexpected image MIME type instead of passing through
  an invalid file.
- The old `exportParolImage` and authenticated `/image` endpoints are
  **not removed**. They still provide the transparent parol-only snapshot
  where needed internally; the actual owner/guest parol viewer continues
  its independent 1x/2x/3x WebP zoom image path.
- Phone-first video generation and the server queue (Phase 1) are unchanged.
  Changing the format or the saved parol state cannot expose media from an
  earlier owner, invitation, design, or contribution.

The static image includes instructional Link sticker text **but does not
contain a clickable sticker**. Users still copy their invitation URL and
add a sticker manually inside Instagram or Facebook when supported.

## Verification before production

Run at repository root:

```bash
(cd src/frontend && npm ci && npm test && npm run typecheck && npm run lint && npm run build)
(cd story-renderer && npm test)
dotnet test DecoMyLantern.slnx
bash scripts/verify-phase6.sh --skip-install
```

For real owner parols with 0, 10, and 50 friends:

1. Open sharing. Confirm both static and video previews use the **same 9:16
   Story composition** and do not display the old parol-only 15:16 art.
2. Prepare and download PNG. Verify its **1080 × 1920** dimensions and the
   same artwork, border, branding, count and text visible in the **completed
   frame** of a server-generated MP4.
3. Confirm the PNG is still, legible on a phone, and works through the
   native image share chooser and manual download.
4. Check failure and cancellation behavior with an unavailable/busy renderer:
   the dialog stays usable; retry/error states work; no stale PNG is exposed.
5. Confirm non-contributing guests remain unauthorized by the existing guest
   Story export route, and no private message, recovery key or guest name is
   burned into the image.
6. Recheck desktop, Android Chrome and iOS Safari previews; phone MP4
   generation, server queue resume, and the actual owner/guest 3x zoom viewer.

**Scope:** No changes to server controllers, Remotion art, database schema,
hosting setup, existing queue, or parol growth rules. End-to-end browser/media
comparisons are required to prove visual equality; source-level checks
alone do not establish that an image was successfully rendered.
