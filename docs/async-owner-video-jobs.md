# Asynchronous MP4 Story rendering — owner workflow

## Goal

This original background queue is **retained** for owners choosing **Generate in background instead**, for unsupported devices, and as the automatic fallback if phone-side MP4 encoding fails. The separate phone-first implementation is documented in [phone-first-story-video.md](phone-first-story-video.md).

The owner can click **Generate in background instead** (or the server fallback action), close the share dialog or page,
and come back later while the private renderer continues working. Reopening
**Share your parol → Animated Story** checks the job and loads the completed
video automatically. PNG preparation stays immediate; friend-side sharing
remains removed.

## Flow

1. The authenticated owner sends POST `/api/my/lantern/story/video/job`
   with CSRF and no user-provided design, IDs or file paths.
2. ASP.NET reads the saved parol, derives its canonical `StoryRenderPayload`
   (`kind=owner`, selected design/pattern, accepted friend count, light slots),
   and forwards it with the renderer shared secret to private POST
   `/story-video/start`.
3. The Remotion service deduplicates identical jobs by a SHA-256 content digest,
   adds a bounded job to a **single-worker in-memory queue**, immediately
   responds `queued` or `rendering`, and independently writes the MP4 to
   a temporary file before atomically renaming it.
4. Reopening the sharing modal calls authenticated GET
   `/api/my/lantern/story/video/job`, whose backend recomputes the owner's
   saved parol and calls private `/story-video/status`. While open and
   running, the UI checks every three seconds; it does not poll when closed.
5. On `ready`, the frontend calls protected GET
   `/api/my/lantern/story/video/job/file`. The backend calls private
   `/story-video/file` using the verified snapshot and streams the completed
   MP4 to the owner. The original native share chooser, download option and
   MP4 preview work as before.

There is **no public access to the renderer**, no guessable job/file path
accepted by the public API, no plaintext recovery key or Christmas message in
the render payload, and no database migration. The existing PNG endpoint is
unchanged. The owner-only MP4 start route reuses existing rendering quotas,
while status/file reads have their own limits.

## Important deployment limitations

This is an **application-level asynchronous implementation**, not a durable
distributed rendering service:

- Pending/active jobs live in the **renderer process memory**. Browser logout
  or closing the tab does not cancel accepted work, but a **service restart or crash
  interrupts pending work**. The owner can requeue if needed.
- Finished MP4 files are retained on the **same renderer's temporary disk**
  for **up to 24 hours**, subject to its existing 32-file cache cap; files
  may disappear sooner under heavy traffic or if temporary storage is erased.
  A new renderer instance or separate machine cannot access another
  instance's queue or files without shared storage.
- **The job identity follows the current saved parol.** If more friends join,
  the selected design changes, or the saved parol otherwise changes, reopening
  sharing checks the *new* state. A previous-state render may finish in the
  renderer but is no longer selected by the owner UI; request a new video.
- The private renderer still renders **one media job at a time**; the queue
  is bounded at 12 queued jobs. An image-render request may see a temporary
  503 while an MP4 is rendering. Existing bounded image retry still applies.
- For guaranteed multi-server durability, crashes/restarts and long-term video
  retrieval, a **persistent job database/queue and shared object storage**
  (with expiration and access controls) must be added by the server operator.
  This change makes **no** HostHatch, Cloudflare, external API, storage,
  container/volume, infrastructure or background-deployment configuration
  changes. Do not call it restart-proof or production-durable.

## Verification

Run from the repository root:

```bash
node --test story-renderer/tests/story-video-jobs.test.mjs
bash scripts/verify-phase6.sh --skip-install
```

With the existing local API, SQL Server and private renderer running:

1. Sign in as a parol owner, open sharing, choose **Animated Story** and
   click **Generate animated MP4**. It should promptly show a background
   queue/running state without waiting for the full video.
2. Close the share dialog or browser tab while rendering, then reopen
   the same owner's parol and open Animated Story. It should still be
   `queued`/`rendering`, or show the ready video.
3. After completion, confirm preview, **Download MP4** and device share
   all work. Double click Generate should not start two renders.
4. Reopen on another authenticated device (same owner) while the same
   renderer instance and snapshot are still available; the ready file
   should be retrieved with no new rendering.
5. Verify a guest cannot access the owner job endpoint, and the friend
   post-contribution page **still only offers Create my own parol**.
6. Test a renderer failure, queue saturation and restart: the UI should
   explain the failure or allow retry, not claim guaranteed completion.
7. Test a new friend joining during a queued job and confirm the new saved
   parol does not incorrectly display the earlier video.
8. Verify PNG, unchanged 15-region parol artwork/growth, copied invitation,
   keyboard focus, phone/desktop layout and all existing code paths.

Full browser, renderer, .NET and load testing must pass before production
release. Source-level inspection does not prove end-to-end execution.
