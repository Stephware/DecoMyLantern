# Living festival parol — BeMyParol visual specification

## Approved direction implemented for testing

A miniature but complete **San Fernando Giant Lantern Festival-inspired parol** is visible at **zero friends**. Its overall silhouette is roughly round/floral, not a traditional five-pointed hanging star. The zero-friend artwork contains a hybrid starburst/floral *tambor*, twenty translucent capiz-style windows, interlocking siku-siku diamond panels, smaller flower/fan motifs, embedded lights and finished exterior trim. **There are no dangling tails, ribbons, fringes, or hanging cords anywhere in the renderer.**

Every accepted friend adds exactly ONE connected, outward ornamental structural layer. Every layer is filled with 20 stained-glass facets and ten repeating motif inlays, physically touching its predecessor. The layers are NOT identical concentric circles, empty outlines, or five-pointed star copies.

At 50 accepted friends, the parol has precisely **50 structural layers** that together form a grand, densely decorated floral/circular lantern. Each region uses different patterns that connect across adjacent layers:

| Structural friend layers | Artistic region | Motifs |
|---|---|---|
| 1–10 | Siku-siku | Diamonds, angular interlacing, faceted capiz |
| 11–20 | Capiz mosaic transition | Curved glass windows, jewels, floral transitions |
| 21–35 | Palimbun-inspired decoration | Repeating flower petals and large fan windows |
| 36–45 | Ceremonial lights | Strong fan shapes, sunbursts and gold highlights |
| 46–50 | Puntetas-inspired edge | Small pointed lacework, medallions and illuminated scalloped perimeter |

Each region's ten large motif panels grow only as far as the current accepted contribution count; these large connected panels prevent the design from looking like a collection of thin circles. Every fifth band receives five luminous capiz-flower medallions. The exterior remains richly decorated at 0, 10, and 50 friends.

At counts beyond 50, each new friend still adds a new structural layer using the puntetas ornamental grammar. The six selectable design themes and friend requirements at **0, 3, 10, 23, 40 and 50** remain separate from the 50-layer artwork progression.

## Friend identity and interactivity

- The outer **layer count** comes from the number of accepted contributions, or a specifically marked test count. It does not depend on design unlock thresholds.
- Existing individual friend lights inside the tambor keep their immutable `Contribution.SlotIndex` mapping. Clicking a light lets an owner identify its guest contributor.
- The owner dashboard retains a non-saving **+ Add test friend**, **−1 friend**, **Reset to 0**, and milestone shortcuts for 0/3/10/23/40/50. The maximum simulated count is 60.
- The camera auto-fits the expanding floral silhouette, still supporting manual pan, pinch, zoom and Fit.
- No new SQL table or migration is required for the visual renderer. PR #17 contains an older **data-only** migration to seed the six design families, which requires a confirmed development `DecoMyLanternDb` connection and a backup before applying.

## Relevant frontend files

- `src/frontend/src/features/lantern/growth/outerGrowth.ts` — deterministic circular/floral perimeter, one 20-facet band per friend, five decorative zones and safe auto-fit.
- `src/frontend/src/features/lantern/renderer/ParolArtwork.tsx` — fully decorated mini festival parol at zero friends, no tails.
- `src/frontend/src/features/lantern/renderer/ProceduralOuterShell.tsx` — five uniquely ornamented growth regions, mosaics, diamonds, floral petals, fans and edge jewels.
- `src/frontend/src/features/lantern/renderer/LanternScene.tsx` — persistent individual lights, auto-fit and interaction.
- `src/frontend/src/features/dashboard/HostDashboard.tsx` — friend-by-friend visual simulation.

## Local test plan

From the solution root:

```bash
git fetch origin
git switch feature/procedural-parol-evolution
git pull --ff-only origin feature/procedural-parol-evolution

cd src/frontend
npm ci
npm test
npm run lint
npm run typecheck
npm run build
npm run dev
```

With the backend running, open the owner's parol studio. Test **0, 1, 2, 3, 10, 20, 23, 35, 40, 45, 50 and 60** sample friends, comparing all available styles. Check that 0 is already a miniature festival lantern, all intermediate counts look complete, there are no empty ring voids, at 50 there are 50 actual interconnected bands in five distinct regions, and there are NO tails/fringes. Zoom into the drawing and test keyboard selection of individual friend lights. Test at a narrow mobile width.

**Validation status:** Focused pure-geometry checks verified the per-friend band invariant, connected/nested boundaries, filled panels, five zone mappings and auto-fit up to 120 friends. Static source checks verified the no-tail core, 20 glass facets per layer, isolated preview and six recipes. Full React TypeScript build, npm test suite, .NET build, SQL migration and actual desktop/mobile screenshots must still be checked locally before merging this draft PR.
