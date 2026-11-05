# Device-first Story media and approved BeMyParol mark

> Rendering implementation updated 2026-11-06: see [the original hybrid port](story-hybrid-rendering.md) for current presets, device encoder, fallback and verification. Earlier implementation notes below are historical where they conflict.

## Audit (before implementation)

The archived `feature/video-parsing-optimization` branch contains a browser
renderer based on Remotion WebCodecs and a privacy-conscious server fallback,
but was 150 commits behind `dev` when reviewed (and 3 commits ahead).
Merging it wholesale would overwrite newer asynchronous owner video jobs, media
invalidation, static share, frontend performance work, and Christmas features.
The current `dev` branch already used `mediabunny@1.65.0` for a subset of
phone/owner MP4 exports, but PNG always used the server and desktop/guest MP4
could not use the device. The older branch's measured 50-friend browser case
reached ~2.28 GiB and ~323 seconds, so arbitrary device rendering is unsafe.

## New execution path

- **Story PNG, owner and guest:** On Prepare/Generate, render the *same*
  deterministic `StoryFrame` at completed frame 200 (1080 × 1920) to
  a browser Canvas. Verify two different frames are actually painted, then
  export an actual PNG with a valid signature. Retain existing authenticated
  server POST as a fallback when SVG `foreignObject` or PNG Canvas capture
  is unsupported, or when local painting fails.
- **Story MP4, owner and guest:** Probe secure-context WebCodecs H.264
  encode support through the existing pinned Mediabunny encoder. Render
  240 frames at 30 fps and 1080 × 1920 on the device, verify nonblank and
  varying artwork, validate MP4 container, and keep the file in the browser
  for native share/download. No MP4 data is uploaded.
- **Memory guard:** Unknown-memory devices cap at 6 friends; browsers
  reporting at least 4 GiB cap at 12. Larger parols continue through the
  private server path. The historical 50-friend benchmark is why local
  rendering is not forced on all phones.
- **Server fallback:** Existing owner async queue remains resumable when
  the tab closes; guest MP4 uses its existing protected export. Cancellation
  or tab hiding of a local operation does **not** automatically queue a
  background render. Older export endpoints remain available and unchanged.

## Data/privacy safeguards

The authenticated saved parol remains authoritative in the existing React
app and backend. Only the existing design key, pattern, friend count, numeric
slots, and optional highlighted slot participate in rendering. Neither the
recovery key nor secret Christmas messages enter the generated Story.
`dataKey` invalidation and abort signals prevent an old finished file from
appearing on another owner's parol or after a new friend joins. The existing
user-selected share/download buttons remain unchanged.

## Logo

The approved symbol-only green, burgundy and gold parol image has been prepared
as an optimized transparent 160×160 PNG at
`src/frontend/public/bemyparol-logo.png`. It is displayed in the welcome,
owner, guest, recovery and loading screens, and used for the website favicon.
The wordmark stays as separate accessible text, not baked into the icon.

## Verification and release

Run these in `src/frontend` on the proposed merge commit:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

Manually verify PNG/MP4 results on desktop Chrome/Edge, Android Chrome and iOS
Safari, including 0, 6, 12, 20 and 50 friend parols, supported/unsupported
WebCodecs, foreground-to-background transitions, cancellations, changing
saved state during export, and offline or overloaded fallback handling.
Verify PNG decoding and MP4 playback in the OS native share target, plus
the new favicon and header icons at mobile and desktop widths.

The GitHub connector can perform file/commit and source-contract checks but
cannot prove actual WebCodecs / Canvas support on a physical device, nor run
the complete local build. Do not represent those device checks as passed.
