# Phase 4 — Frontend media performance

**Scope:** Improve the existing BeMyParol static PNG and animated MP4 sharing flow. No backend, database, infrastructure, deployment, ads, or parol-art changes.

## Changes

- **No double exports:** A synchronous ref guard ensures rapid double-taps or repeated calls from one mounted sharing dialog produce only one active export request.
- **Reuse:** Prepared PNG and MP4 blobs are retained in component memory when users switch formats, close/reopen the modal, or owner polling refreshes unchanged data. No repeat request until the saved parol changes; no localStorage, IndexedDB or persistent media cache.
- **Invalidate:** Owner/guest kind, invitation token/link, design, pattern, accepted friend count, sorted light slots, and optional guest Story highlight are included in the media identity. Changing this identity immediately prevents old media from being shared while old responses are aborted/discarded. Object URLs are still revoked when replaced/unmounted.
- **Cancel:** An AbortSignal reaches both CSRF fetch and the media POST. Closing the modal, navigating away, or pressing Cancel preparation aborts the current **browser request**, preventing obsolete response handling. Cancellation of the browser request does **not** guarantee cancellation of a render that already began on the private service.
- **Transient retry:** Only HTTP **503/504** can auto-retry, twice, after short abortable waits (1.5s/3s). Authorization and rate-limited responses (401/403/429 etc.) do **not** auto-retry. Errors remain visible and an explicit Try again control is offered.
- **Status:** Users see preparation and retrying states without invented percentages or queue positions. The existing native share picker, PNG/MP4 downloads, copy-link action, owner/guest restrictions and 9:16 / 15:16 previews are preserved.

The secure existing endpoints remain POST /api/my/lantern/image, POST /api/invitations/image, POST /api/my/lantern/story and POST /api/invitations/story; no public media URLs or secret-bearing query parameters.

## Future asynchronous renderer compatibility

The sharing component now calls one abort-aware preparation helper instead of embedding retry logic in the UI. A future backend asynchronous job API could be integrated behind that helper without redesigning the share/download controls. **No server-side queue, remote renderer move, polling protocol, callback webhook or concurrency improvement is claimed in this phase.** These are infrastructure/backend matters and are intentionally excluded.

## Validation

Run from src/frontend:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

Manual browser checks:

1. Open owner and guest sharing on unchanged parols; prepare PNG and MP4, close/reopen, switch formats and confirm no duplicate exports.
2. Double-tap Prepare rapidly and verify one network media request.
3. With slow network/renderer, press Cancel preparation or close the dialog; confirm the UI stops waiting. Verify the private service may still finish existing render.
4. Change saved design or accept a friend during export; ensure no old blob appears in share/download for the updated state.
5. Force HTTP 503 and 504 temporarily and inspect two bounded retries. Force 429/401/403 and verify no automatic retry.
6. After a permanent error, press Try again; verify media can be prepared successfully.
7. Verify native share picker, PNG and MP4 download, link copy, transparency, animation, mobile layout, guest restrictions and keyboard Esc/Tab remain unchanged.
8. Recheck viewer WebP requests, 0/11/50-friend artwork, three-wave growth, owner recovery and invitation security.

Regression tests include executable helper tests for retry limits, cancellation during backoff, and abort-before-use, plus source-level UI checks.

**Tests, build, and actual browser/mobile QA still must run in the project environment before a production release.** Static GitHub review alone does not prove them.