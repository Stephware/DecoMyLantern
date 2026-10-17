# Friend identity and ring-growth preview (design experiment)

This branch adds an **opt-in, non-saving visual test** to the owner's design studio. It does **not** alter production parol growth, friend submissions, database schema, API, design permissions, or live contribution counts.

## Product questions to settle

1. Every accepted friend contributes exactly one new **complete concentric outer ring**. New rings appear outside existing rings; the parol camera automatically zooms out. At 50 friends there are 50 rings, and contributions may continue past 50.
2. How should each friend be identifiable?
   - **Friend on ring** — one highlighted marker for the friend on their own ring; no inner individual light
   - **Friend in star** — a full ring per friend plus their distinct inner parol light
   - **Both** — the same identity linked to its ring marker and inner star light; recommended for comparison
3. Designs are **proposed** to unlock at 0, 3, 10, 23, 40 and 50 accepted friends. The existing catalog still contains three designs and existing access rules are unchanged until the design mappings are approved.

## How to try the preview

1. Run backend and frontend from the latest feature branch, and open an owner's already-created parol.
2. In **Your growing lantern**, click **Test +1 friend rings & identity →**.
3. Click **+ Add test friend** repeatedly and watch a complete new ring appear on every click, while the preview automatically fits outward.
4. Use **−1 friend**, **Reset**, and **0 / 3 / 10 / 23 / 40 / 50** shortcut controls; the preview supports up to 60 for beyond-50 behavior.
5. Toggle **Friend on ring**, **Friend in star**, and **Both (recommended)**.
6. Choose a test friend with **Highlight** or select their ring/star marker to inspect the identity linkage.
7. Click **Return to my parol** to show saved contributions and the existing production renderer.

All preview friends are placeholders. This feature makes **no API requests and no database updates**.

## Technical boundaries

- `FriendIdentityPreview.tsx` is an isolated renderer using the current `ParolArtwork` with `friendCount={0}`, plus experimental ring geometry.
- `friendRingGeometry.ts` handles stable slot-derived radii, auto-fit and milestone descriptions; it never determines real authorization.
- The current `LanternScene.tsx` and backend `GrowthPolicy` remain unchanged.
- No migrations. No changes to `main`.
- Do **not** merge this prototype as the finalized architecture; review the density of 23–50 rings, visual identity, animation and usability first.

## Verification

From `src/frontend`:

```bash
npm ci
npm test
npm run lint
npm run typecheck
npm run build
```

Manually check mobile viewport, 0/1/2/3/10/23/40/50/60 friends, and all three identity modes. Check that the live accepted friend count and saved design remain unchanged after using the test controls and refreshing.
