# Responsive BeMyParol UI and first-time design picker

## Scope

The approved parol geometry, live design recipe, cached WebP display, image
reveal animation, private Story exports, owner cookie, recovery keys, and
friend-contribution safeguards are unchanged.

The owner UI now uses a warm ivory, forest-green, burgundy and gold palette.
The **actual cached parol image remains the focal point**. Invitations are
immediately available beside the viewer on desktop. On mobile, the design
gallery is not another long section below the page: it lives in an always
reachable, collapsed sheet at the bottom with an up/down arrow handle.

## New owner's journey

1. Create a parol with the existing passwordless flow.
2. Save the one-year recovery key and acknowledge it as before.
3. The owner dashboard opens a **one-time selection popup** if there are no
   accepted friends and this browser has not already dismissed the selection.
4. The six enabled family thumbnails are generated **from the exact approved
   parol renderer**, each at **50 synthetic friends = 150 growth layers**.
   These are showcase illustrations only; selecting one never creates,
   imports, or simulates actual accepted contributions.
5. Pick any family and click **Choose this parol**. The owner-authenticated
   `PUT /api/my/lantern` persists the family and keeps real friend progress.
6. The selected family's actual parol appears at the real accepted-friend
   count. The owner may change the design and decorative pattern later.

The popup dismissal flag is localStorage-only and keyed to the seasonal
lantern ID. It is not a login mechanism, not an invitation or recovery code,
and never controls authorization. A returning owner can always reopen the
gallery on desktop or through the mobile sheet.

The previous 0/3/10/23/40/50 milestones remain **visual growth stage** labels.
All six **enabled** designs are now selectable even at zero friends. Disabled
or unknown designs are still rejected by the backend. No migration is needed.

## Full-bloom previews

`GET /api/designs/{designKey}/showcase?v=v1` returns a public WebP illustration
of the requested *enabled* design at 50 synthetic friends, generated using
the already available private Remotion snapshot server.

- The ASP.NET endpoint controls the design, friend count (50), slot indexes
  (0–49), pattern (default) and format (WebP).
- The browser never sends owner IDs, friend counts or slots for previews.
- No real owner or guest data is fetched. The preview contains no private
  messages, names, recovery secrets or invitation tokens.
- The private renderer caches each fixed image by its canonical content. The
  browser can cache the public generic image for 24 hours.
- The gallery requests images **sequentially** to avoid flooding the single
  rendering worker, retries temporary 503s, and offers Retry if images fail.
- Only the popup / expanded design drawer downloads gallery images.
  The saved real parol still uses its existing authenticated snapshot endpoint.

## Mobile design drawer

- Tap the up arrow or swipe **up on the grab handle** to open.
- Scroll within the drawer to see the six 50-friend previews and three pattern
  choices without scrolling the entire parol page.
- Select a card, then tap **Save my design**. The original friend count and
  messages are untouched.
- Swipe down on the handle, tap the down arrow, or tap the backdrop to close.
  Escape also closes it when using a keyboard.
- A synthesized click following a swipe is suppressed to avoid immediate
  re-closing.

The Development Testing Lab is still present but collapsed for now.
Production/staging separation and new logo assets are intentionally **not**
part of this change.

## Local verification

Start all services:

```bash
git switch dev
git pull origin dev
bash scripts/dev-with-stories.sh
```

From a second terminal:

```bash
cd src/frontend
npm test
npm run lint
npm run typecheck
npm run build
cd ../..
dotnet test tests/DecoMyLantern.Api.Tests/DecoMyLantern.Api.Tests.csproj
```

Manual smoke tests:

- Create a **new** owner. Save the recovery key, then confirm the first-time
  design picker appears. All six approved parol images must show the
  **50-friend completed appearance** (some cold previews may take time).
- Select Sampaguita or another previously locked family with **0 real friends**.
  Confirm saved design changes, but friend count and growth points remain zero.
- Change design again from the desktop modal and from the mobile drawer. Confirm
  the image refreshes only **after Save**.
- On an actual phone, swipe up/down **on the drawer handle**, tap the arrows,
  scroll within the drawer, and test zoom/pan/Fit behind the collapsed handle.
- Invite a guest through the original share link; contribute, test the
  three-wave image reveal, and verify the letter stays sealed.
- Test the owner recovery key in a separate browser. Its access rights
  and permanent invitation link must be unchanged.
- Turn off the private Remotion renderer. The galleries show placeholders /
  retry instead of crashing; the real viewer retains its prior-image fallback.
- Inspect 0-, 11-, 35-, and 50-friend saved parols to confirm all original
  geometry, flower regions and patterns are unchanged.
