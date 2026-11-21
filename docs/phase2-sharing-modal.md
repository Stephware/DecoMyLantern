# Phase 2 — Unified sharing interface

This phase redesigns only the React sharing experience on the owner dashboard
and the contributed guest view. It reuses the existing secure export requests
and keeps each device's native share picker rather than adding direct
Instagram/Facebook integrations.

## UX

- The **Share your parol** entry opens an ivory, burgundy, forest-green and gold
  dialog, with a responsive 9:16 preview.
- Two selectable formats: **Static image** (existing still PNG Story poster)
  and **Animated Story** (existing MP4 Story).
- The poster preview is shown before generation. Once media is ready the
  dialog shows its generated PNG or playable MP4, with native **Share image /
  Share video** and **Download PNG / Download MP4** actions.
- The existing invitation URL has its own Copy button and selectable text
  fallback. The Story Link sticker guidance is preserved.
- If file sharing is unsupported, the user can download the generated file
  and upload it in their preferred app. No Meta account or direct platform
  authorization is requested.
- Dialog behavior includes Escape, Tab focus containment, focus restoration,
  scroll locking, error/working announcements and phone-width scaling.

## Exact scope

**This phase does not implement the standalone parol-only static export.**
The PNG option uses the existing backend Story poster image. Phase 3 will
connect this same interface to a true parol-only PNG/static export and
finalize static-image sharing. This phase also **does not** change backend
endpoints, video concurrency, Story rendering, parol growth, invitations,
database, server, Cloudflare, ads or deployment.

The dialog continues using secure owner/friend media export authorization.
Generated blobs are reused while their current saved parol is unchanged,
invalidated if the relevant saved parol data changes, and their object URLs
are revoked when replaced/unmounted.

## Validate locally

From the frontend:

```bash
cd src/frontend
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

Manual browser checks:

1. On an owner parol, open sharing; toggle static PNG/animated MP4 and verify
   that the still preview is appropriately labeled.
2. Generate the PNG and MP4; preview each; download each and check the files.
3. On a supported mobile device, try both native share actions; on an unsupported
   desktop/browser, verify that download fallback is explained.
4. Contribute via a guest invitation and verify that the same dialog works and
   still uses friend-specific Story export.
5. Copy the invitation link; verify fallback after clipboard permission denial.
6. Change the saved parol or receive another real friend; verify previous media
   cannot be shared as the new saved parol.
7. Test a narrow phone, Escape/Tab focus, reduced-motion settings, scroll lock,
   slow requests, HTTP export failure and successful retry.
8. Verify ordinary invitation, recovery, design selection and 0/11/50-friend
   parol growth remain unchanged.

**GitHub code inspection alone does not run npm builds or mobile visual tests.**
Do not release without those checks.
