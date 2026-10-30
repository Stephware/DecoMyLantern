# Phase 1 — BeMyParol public UI cleanup

This phase only changes the React frontend. It does **not** change ASP.NET
endpoints, SQL, recovery-key behavior, invited-friend restrictions, parol
geometry, cached image generation, Story export, Cloudflare, advertising,
Docker, or deployment configuration.

## Simplified screens

- **Owner dashboard:** focuses on the real saved parol, accepted friend count,
  progress toward the 50-friend celebration, invitations, design choices, and
  the sealed-message notice. Removes duplicate growth-layer counters, repeated
  page subtitles, a duplicate journey card, and technical camera instructions.
- **Parol canvas:** removes on-screen diagnostic growth counts, selected slot
  numbers and the verbose step-by-step narration. Fit / zoom / lights, loading,
  error, retry, and screen-reader status announcements remain functional.
- **Welcome parol illustration:** hides simulated test-friend/outer-band
  counters and mechanical animation descriptions. Underlying parol SVG,
  animation and zoom are untouched.
- **Guest contribution screen:** removes implementation-related descriptions
  while keeping Share your light, the one-light-per-browser notice, and the
  sealed-until-Christmas message privacy notice.
- **Design picker:** removes repeated 50-friend badges and secondary captions,
  but clearly says that the gallery shows a 50-friend preview. The gallery
  continues rendering the same six synthetic completed parols.
- **Invitation and Story entry:** removes redundant headings and technical
  video-resolution copy; Copy invitation link, Story export, Download MP4
  and Save PNG remain. A full themed sharing-modal redesign is **Phase 2**.
- **Recovery screens:** removes repeated section labels but retains recovery
  secrecy, expiry and loss-of-access warnings, code copying and the
  explicit replacement confirmation.

## Developer-only test controls

The current dashboard Development Testing Lab is rendered only when
`import.meta.env.DEV` is true. On production Vite builds it is unavailable
in the public UI. In local `npm run dev`, the lab remains accessible for
unsaved 0/1/50-friend design simulations.

This is not an authentication boundary or a substitute for a protected staging
admin lab. No simulation values are written to the backend by these controls.

## Validate

From `src/frontend`:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

Recommended manual browser checks:

1. With a saved parol, verify only two concise dashboard stat cards remain:
   friend count and progress toward 50 friends; invitations/design picker work.
2. With a first-time parol, verify the sample welcome parol no longer shows
   "test friends" or growth-layer diagnostics.
3. In a production build (`npm run build && npm run preview`), verify the
   Development Testing Lab **does not appear**. In local Vite development,
   verify it is still available and cannot change real friend counts.
4. On phone, expand and collapse the design drawer; browse all six designs,
   save one, and verify actual friend data remains unchanged.
5. Open guest invitation as a fresh visitor and confirm copy, contribution,
   privacy notes, and one-light-per-browser behavior.
6. Verify recovery key copy, leave confirmation, and old-key replacement warning.
7. Trigger an image loading error to verify useful status/Retry remains visible.
8. Verify the parol artwork and three-wave animation are unchanged at 0, 11,
   and 50 friends.

No backend migration is needed for Phase 1.
