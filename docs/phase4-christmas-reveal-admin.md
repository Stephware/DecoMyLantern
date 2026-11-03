# Phase 4 — Christmas message reveal and optimized admin testing

## Real owner experience

An owner who opens their saved parol on or after **December 25 at
12:00 AM Philippine time** receives a short Christmas celebration:

1. Warm gold glow and small CSS sparkles, with a **Merry Christmas** greeting
2. The **actual number of saved Christmas messages** from the owner's inbox
3. A prompt, **Unwrap my Christmas messages**, which scrolls to the inbox
4. Private letters shown as individually expandable cards with their
   contributors' names and dates, 12 initially with **Show more letters**

When there are no saved messages, the animation presents a gentle greeting
instead of claiming messages were received. **Skip animation**, **Maybe
later** and **Replay Christmas surprise** remain available. The animation is
brief and respects `prefers-reduced-motion`. It is CSS-only: no new SVG
parol geometry, MP4 story render, WebP export, third-party library, or heavy
canvas. Real saved parols continue using the existing 1x/2x/3x cached WebP
viewer with the current growth animation.

The reveal automatically plays **once per parol per season per browser**,
tracked using a scoped localStorage flag. If storage is blocked, it plays
once per component mount. The inbox stays accessible on subsequent visits;
no messages are removed by the reveal.

## Security: actual Christmas versus admin early access

The current backend already stores `UnlockAtUtc` and only returns letter
bodies for eligible owners. Phase 4 adds the read-only response property
`christmasDayReached` derived from **the server's UTC clock** and the
saved season's unlock timestamp. This is **different** from `unlocked`:
an admin test parol may have `unlocked = true` before Christmas, but
`christmasDayReached = false`.

- **Normal owner before Christmas:** the existing authenticated inbox
  returns locked letters with `body = null`. The UI shows a sealed note,
  **not** the letters, their names, or their count.
- **Normal owner on or after Christmas:** only a server-confirmed
  `christmasDayReached = true` and `unlocked = true` can show the
  automatic surprise and letter bodies.
- **Admin parol before Christmas:** its existing `IsAdmin` flag allows
  it to read **its own** saved test letters early. The **Admin testing lab**
  offers **Preview Christmas message reveal** to run the identical overlay
  manually. It cannot activate the reveal for regular owners.
- **Admin parol after Christmas:** sees the normal automatic reveal once,
  and retains manual replay in the inbox.
- No debug query param, arbitrary clock override, public admin login,
  message seeding, invitation-link bypass, or database migration is added.

The count is `inbox.messages.length` (saved, active message records),
**not** accepted-friend count. The saved admin parol shows zero if it has
no messages; no synthetic private letters are inserted.

The client refreshes the inbox when friend count changes, after returning
to a visible tab, and on a bounded schedule when waiting for Christmas.
Client clock changes only influence *when to recheck* the server; they
cannot authorize message bodies or trigger the automatic reveal.

## Optimized admin Design Lab

The saved admin parol **already** uses the same cached image viewer as
regular owners. The remaining heavy path was the **unsaved, procedural
SVG Design Lab** for test counts.

Phase 4 replaces that test renderer with a lazy-loaded
`AdminCachedParolPreview` that reuses `CachedParolScene`:

- Its **new admin-only POST** `/api/my/lantern/admin-preview/image`
  requires the signed-in owner, CSRF, the saved parol's `IsAdmin` flag,
  and the existing owner image rate limit. The caller cannot supply
  message bodies, private names, or arbitrary light slots.
- It accepts only the six approved visual design keys, **0–60**
  synthetic friends, WebP and scales 1/2/3. The backend generates sample
  slots from the validated count and retains the admin parol's
  saved pattern. **No changes are persisted.**
- Existing private `/render-parol` uses the **same versioned,
  content-addressed 1x/2x/3x cache**, image quality, 24-hour expiry,
  128-image total cap, 32-image 2x cap, 12-image 3x cap, single
  cold-render worker and 12 MB API response limit.
- Rapidly changing counts/styles is debounced by **300 ms** before a
  preview request. The viewer retains decoding, aborts, busy-retry,
  2x at 1.75 zoom, and 3x at 3 zoom. Entering and leaving Explore on
  a phone uses the same scroll-safe interaction as a normal parol.

The existing procedural `LegacyLanternPreview` is retained for the
separate first-time/development artwork preview; only the **admin test
lab's synthetic scene** switches to cached rendering.

## Verification checklist

From repo root:

```bash
(cd src/frontend && npm ci && npm test && npm run typecheck && npm run lint && npm run build)
(cd story-renderer && npm test)
dotnet test DecoMyLantern.slnx
bash scripts/verify-phase6.sh --skip-install
```

For the already saved admin testing parol:

1. Restore its owner session using the existing recovery key. Confirm
   `IsAdmin = true` on that saved parol. Open **Admin testing lab →
   Preview Christmas message reveal** before Christmas. See the complete
   greeting, **real count**, skip, unwrap and inbox. A zero-message parol
   must show the zero-message greeting honestly.
2. Reload and replay. Test 0, 3, 10, 20, 35, 50, 60 synthetic friends
   in the Design Lab. They should use one **WebP** per selected state,
   with no procedural heavy SVG or DB writes. Inspect `X-Parol-Cache`
   on repeated requests. Zoom to request 2x/3x and verify fallback.
3. Confirm a regular owner's dashboard **cannot access** the admin lab
   endpoint, early message bodies or preview button.
4. Test normal owner with a saved letter before Dec 25: the API returns
   `body:null`, `unlocked:false`, `christmasDayReached:false`. No
   early celebration, even if the phone date is advanced.
5. At or after the actual date (using an isolated test server clock /
   controlled backend fixture, not the public production clock), the API
   returns `christmasDayReached:true` and the reveal plays once.
   Relaunch to verify replay and persisted flag.
6. Validate count, 12-card incremental rendering, letter name/body,
   zero-message state, text overflow/long messages, viewport scrolling,
   keyboard trap, Escape, skip and reduced-motion mode.
7. Confirm existing static Story PNG, phone-first MP4 + server queue,
   mobile Explore, saved parol image caching and recovery/invitation
   workflows are unchanged.

**Full browser/device, image performance, and time-bound end-to-end checks
are not proven by source inspection.** Keep the feature in `dev` until
those checks pass.
