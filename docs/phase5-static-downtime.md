# Phase 5 — Standalone downtime page

A **single static HTML file**, located at `downtime/index.html`, is ready to be published separately when the website is unavailable.

This phase provides **the page artifact only**. No production routing, maintenance mode, Cloudflare changes, backend/API, Docker, HostHatch, DNS, uptime monitoring, or advertising setup is included.

## Page behavior

- Displays a festive BeMyParol design in the project's ivory, burgundy, forest-green and gold palette.
- Embeds a faithful static version of the **approved Classic Gold zero-friend parol** directly as inline SVG (no image, font, animation, or external network requests).
- Preserves the real scalloped perimeter, 20 dyed capiz floral windows, ten siku-siku diamonds, ten fan panels, 20-ray starflower tambor, and canonical Classic Gold theme colors.
- Shows **“Salamat sa pasensya ✦”** beneath the manual retry action.
- Explains that BeMyParol is temporarily unavailable without speculating about cause, restoration time or user data.
- Provides an ordinary **Try again** link pointing at the site root; no automatic requests or polling occur.
- Works at narrow phone widths, is keyboard accessible, includes descriptive SVG text, and is marked `noindex, nofollow`.
- Contains **no React, Vite runtime, CSS build step, third-party ads, JavaScript, API call, or database dependency**.

### Artwork provenance and maintenance

The page uses the actual **zero-friend, default-pattern Classic Gold** composition from:
- `src/frontend/src/features/lantern/renderer/ParolArtwork.tsx`
- `src/frontend/src/features/lantern/renderer/ProceduralOuterShell.tsx`
- `src/frontend/src/features/lantern/growth/outerGrowth.ts`
- `src/frontend/src/features/customization/themes.ts`

The static copy includes the real canonical 200-sample scalloped outline, the Classic Gold theme colors, core capiz/diamond/fan motifs and tambor. The same perimeter path is referenced inside the SVG to keep the HTML reasonably small. The illustration is **not** a rendering of a specific owner's saved parol and does not invent guest contributions. It does not require React, the Remotion renderer, ASP.NET, database or an active invitation.

**When approved artwork changes**, recheck the static SVG against the source components and update this copy explicitly; it does not synchronize automatically during an outage. No application parol geometry, growth rules, or animation source files were modified.

## Preview without the app

Open `downtime/index.html` directly in a browser. For an HTTP preview where **Try again** points to a valid page, start a static server from the repository root:

```bash
python3 -m http.server 8088 --directory downtime
```

Then visit `http://localhost:8088/`. Stop the preview with Ctrl+C. This does not start the frontend, .NET API, SQL Server or Story renderer.

## Verification

The frontend's existing `npm test` command includes `src/frontend/tests/phase5-downtime-static.test.mjs`, which checks independence, markup, responsive CSS, accessibility, canonical Classic Gold base-art motifs/colors, the Filipino gratitude text, retry link, internal-only SVG paint definitions, lack of automatic requests and absence of private or infrastructure details.

```bash
cd src/frontend
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

Manual checks: inspect the HTML at 320 px / 375 px / desktop width, try keyboard Tab and Enter on the retry link, confirm all artwork loads with DevTools Network set to Offline, and verify no resource URLs other than the page itself are requested.

## Deployment handoff (separate infrastructure work)

A server or edge operator may later serve this file from a reliably available **static host**, independently of the down application. During a real outage, the operator should select suitable routing and ideally an HTTP **503 Service Unavailable** response (and a sensible Retry-After if known); serving this HTML alone does **not** activate downtime handling, switch traffic, guarantee 503 status, or keep a failing host online.

Do not publish, redirect to, or activate the downtime page as part of this development-only phase. Production routing belongs to whoever manages the server/edge infrastructure.
