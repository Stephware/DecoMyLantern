# Landing page: "Select your parol" marquee

This guide explains how the BeMyParol landing page was rebuilt, why each decision was made, and how to maintain it.

## What the page does

1. Shows the **BeMyParol logo** and the heading **"Select your parol"**.
2. Shows all six parol designs in an **infinite sideways marquee** (like a logo carousel). Nothing is selected when the page loads.
3. When a visitor taps a parol, a **popup** opens with the parol, its name and a **"Create my {name} parol ✦"** button.
4. Pressing that button creates the owner, shows the recovery key, then opens the dashboard with **that design already applied**, ready to share.
5. Below the marquee there is only **"Already have a parol? Recover it"** (plus the legacy transfer button when an old session exists).
6. The **"Create a growing parol to share with your friends"** section sits below the first screen and is only seen after scrolling.

## Files involved

| File | Role |
| --- | --- |
| `src/frontend/src/features/owner/WelcomePage.tsx` | The landing page: header, marquee, popup, recovery form, explainer section |
| `src/frontend/src/styles/index.css` | Marquee animation (`.parol-marquee*` rules) |
| `src/frontend/src/app/App.tsx` | Carries the chosen design through owner creation into the dashboard |
| `src/frontend/src/features/dashboard/HostDashboard.tsx` | Exports `ONBOARDING_PREFIX` so the first-time design picker can be skipped |
| `src/frontend/public/parols/*.webp` | Six pre-rendered parol images (800×853) |
| `scripts/export-landing-parols.py` | Regenerates those images from the renderer |
| `src/frontend/nginx.conf` | Browser caching for `/parols/` and Vite's `/assets/` |
| `src/frontend/tests/static-parol-scroll.test.mjs` | Guards the load and behaviour rules below |

## Step 1 – Decide where the parol pictures come from

The renderer endpoint `/api/designs/{key}/showcase` can draw any design, but it is expensive:

- it has **one render slot** (concurrent requests get `503` + `Retry-After`),
- it is rate limited to **36 requests per 10 minutes per IP**,
- there is no CDN in front of it.

Six live images per visitor would break down quickly with 100 visitors. So the landing page uses **pre-rendered static WebP files** that nginx serves like any other file. **Rule: the landing page never calls `/api/designs` or the renderer.** A test enforces this.

## Step 2 – Export the images

`scripts/export-landing-parols.py` does this for each design key (`classic`, `floral`, `festival`, `celestial`, `fiesta`, `sampaguita`):

1. `GET {API_BASE}/api/designs/{key}/showcase` (the full-grown 50-friend parol, 1200×1280).
2. If the renderer is busy (`503`), wait for `Retry-After` and retry.
3. Resize to **800px wide** (sharp on phones with 2–3× screens) and save as WebP quality 75 to `src/frontend/public/parols/{key}.webp`.

It sends a `User-Agent: bemyparol-export/1.0` header because Cloudflare blocks Python's default agent (`403`).

Run it whenever a design's artwork changes:

```powershell
pip install pillow
```

```powershell
python scripts/export-landing-parols.py https://bemyparol.site
```

Without an argument it uses `http://localhost:8080`. If a design is added, add its key to `KEYS` in the script (keep it in sync with `THEMES` in `src/frontend/src/features/customization/themes.ts`). A test fails if any theme is missing its image.

Result: six files, about 940 KB total.

## Step 3 – Build the marquee (swipeable, auto-scrolling)

In `WelcomePage.tsx` the parol list is rendered **twice** inside one track:

```tsx
<div ref={marqueeRef} className="parol-marquee" data-paused={selected !== null}>
  <div className="parol-marquee-track">
    <ul className="flex">{parolCards(false)}</ul>
    <ul className="parol-marquee-copy flex" aria-hidden="true">{parolCards(true)}</ul>
  </div>
</div>
```

`.parol-marquee` is a **real horizontal scroller** (`overflow-x: auto`, scrollbar hidden), so visitors can move it themselves:

- **Phones:** swipe sideways (native touch scrolling, with momentum).
- **Laptops:** two-finger trackpad swipe, or Shift + mouse wheel.
- **Mouse:** click and drag. A drag never opens the popup for the card it ends on.

A small `requestAnimationFrame` loop in `WelcomePage.tsx` moves `scrollLeft` forward a little every frame. One full loop takes **28s**, or **70s** with reduced motion on.

**Endless in both directions.** The strip starts **half a track in**, so there is a full copy to the left as well as the right. Every frame, whether the loop or the visitor moved it, it checks the position:

- near the right end, it jumps back by exactly half a track,
- near the left end, it jumps forward by half a track.

Both halves are identical, so the jump is invisible. Positions stay between `margin` and `half + margin`, where `margin = (half − visible width) / 2`, so every jump lands inside the scrollable range. During a mouse drag the drag's starting point shifts by the same amount, so the drag continues smoothly.

**When it moves and when it holds:**

- **Hover does not pause it.** It keeps moving under the mouse.
- **Pressing** (mouse down or finger down) holds it still, so a tap lands on the parol under the pointer and **that design is the one recorded** in the popup.
- **Any manual scroll** (swipe, trackpad, drag, keyboard focus) is detected because `scrollLeft` changed without the loop. The loop follows the new position, waits **0.5s** after the last movement or release (`HOLD_MS`), then carries on from there.
- It is **paused while the popup is open** (`data-paused="true"`) and while a card has keyboard focus (`:focus-visible`).

Details:

- **Faded edges:** a `mask-image` gradient fades the left and right edges.
- **Accessibility:** the copy is `aria-hidden` and its buttons have `tabIndex={-1}`, so screen readers and the Tab key see each parol once.
- **No lazy loading:** the images must **not** use `loading="lazy"`. The cards start off-screen in the moving strip, and the browser did not notice them coming into view, so lazy images stayed blank. All six are needed anyway.
- **Known limits:** the loop needs the screen narrower than one copy of the list (about 2500px); on wider screens it stops at the end (add a third copy of the list if that matters). On iPhones, jumping the scroll position mid-swipe may cut a very fast fling short; test on a real iPhone.

## Step 4 – Size the carousel safely for small phones

Each card's width is:

```text
clamp(190px, min(40svh, 70vw), 400px)
```

- **40svh** (40% of the *visible* screen height): on the smallest common phones (360×640 Android, iPhone SE) only about 553–560px is visible with browser bars. The logo and heading take about 220px, so 40svh is the largest parol that still fits whole with its name and the recover link.
- **70vw:** never wider than 70% of the screen, so the next parol peeks in and the row obviously scrolls.
- **190px–400px:** minimum and maximum.

Measured results:

| Screen                          | Parol width | Fits on first screen?         |
| ------------------------------- | ----------- | ----------------------------- |
| 360×560 visible (small Android) | 224px       | Yes, recover link at the edge |
| 375×553 visible (iPhone SE)     | 221px       | Parol whole, link at the edge |
| 390×664 visible (iPhone 14)     | 266px       | Yes                           |
| 1280×720 laptop                 | 288px       | Yes                           |
| 1920×1080 desktop               | 400px       | Yes                           |
| 320×470 (1st-gen iPhone SE)     | 190px       | Needs a small scroll          |

The first screen (header, heading, marquee, recover link) is wrapped in a `min-h-svh` flex column, so it always fills the screen and pushes the "Create a growing parol…" section below the fold.

## Step 5 – The create popup

Tapping a card sets `selected` to that theme. An effect then opens a native `<dialog>` with `showModal()`. Opening it after render means the dialog's first button, **Create**, gets keyboard focus.

The native dialog gives the following for free: the backdrop, focus trapping, and **Escape** to close. Clicking outside the panel also closes it. While creating (`busy`), Escape and outside clicks are ignored so the request is not interrupted. Errors from creation show inside the popup.

The popup is a deliberate **confirm step**. Owner creation is rate limited (6 per hour per IP) and a moving target is easy to mis-tap, so a single tap on the marquee never creates anything.

## Step 6 – Carry the chosen design into the dashboard

The backend always creates a new parol with the `classic` design. `App.tsx` remembers the pick and applies it:

1. `WelcomePage` calls `onCreate(designKey)`.
2. `App` runs `createOwner()`, stores the key in `pendingDesign`, and shows the recovery-key screen.
3. On **Continue**, `enterDashboard(owner, chosenDesign)` runs. When the owner has no parol yet (404), it calls `createWithDesign(designKey)`:
   - `createMyLantern()` creates the parol (classic),
   - `updateMyLantern(designKey, patternKey)` switches it to the chosen design if different,
   - `localStorage[ONBOARDING_PREFIX + id] = 'done'` so the dashboard's first-time design picker does not pop up again.
4. The owner lands on the dashboard with the chosen design and can share right away.

Cancelling on the recovery-key screen clears `pendingDesign`. Recovering an existing parol or transferring a legacy one is unchanged.

**Known limit:** `pendingDesign` is in React state. If the owner reloads on the recovery-key screen, the pick is lost and the normal dashboard picker appears instead. Move it to `sessionStorage` if that matters.

## Step 7 – Caching in nginx

`src/frontend/nginx.conf` adds:

```nginx
location /assets/ { expires 1y; add_header Cache-Control "public, immutable"; }  # Vite hashed bundles
location /parols/ { expires 7d; }                                                 # landing images
```

Return visitors download almost nothing. Remember that after re-exporting images, browsers may keep the old ones for up to 7 days.

## Load for 100 visitors

| Step    | Cost                                                                                                                                                     |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Landing | HTML, JS/CSS bundle, logo, 6 WebP files (~940 KB, cached), plus the existing `GET /api/owner` and legacy check. **No renderer or heavy database calls.** |
| Create  | The existing owner/lantern calls plus one extra `PUT` to set the design. Small database writes.                                                          |
|         |                                                                                                                                                          |

The heaviest part is the ~1 MB of images on a first visit, served by nginx as static files.

## Tests

`src/frontend/tests/static-parol-scroll.test.mjs` checks that:

- the page uses `/parols/{key}.webp` and never `/api/designs` or `showcase`,
- an image exists for every theme,
- the list is duplicated, the copy is hidden from screen readers and Tab,
- nothing is selected by default, tapping opens the popup, and the old inline create card is gone,
- the marquee is a real scroller advanced by `requestAnimationFrame`, never paused by hover, held while pressed, with the reduced-motion speed,
- images are not lazy loaded.

Run them:

```powershell
cd src/frontend
```

```powershell
node --test tests/*.test.mjs
```

At the time of writing, 11 tests fail for reasons unrelated to this page: a line-ending check on `downtime/index.html`, and 10 story renderer tests that break on Windows paths.

## Running it locally

Needs SQL Server running and the backend's user secrets set (see `docs/setup-guide.md`).

1. Terminal 1, backend:

   ```powershell
   cd src/backend/DecoMyLantern.Api
   ```

   ```powershell
   dotnet ef database update
   ```

   ```powershell
   dotnet run
   ```

   Wait for `Now listening on: http://localhost:5050`.

2. Terminal 2, frontend:

   ```powershell
   cd src/frontend
   ```

   ```powershell
   npm run dev
   ```

3. Open http://localhost:5173.

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| Some parols are blank | Images were lazy loaded. Remove `loading="lazy"` (see Step 3). |
| Marquee does not move | It holds for 0.5s after any swipe, drag or press, and stops while the popup is open or a card has keyboard focus. With reduce motion on it moves slowly (70s per loop). |
| `AggregateError [ECONNREFUSED]` in the Vite terminal | The backend on port 5050 is not running. Start it (see Running it locally). |
| `IndexOutOfRangeException` from `dotnet ef` | An option was left without a value (often a cut-off paste). Run `dotnet ef database update` from the API project folder with no options. |
| Old images still showing after re-export | Browser cache (7 days). Hard refresh, or rename the files and update the `src`. |
