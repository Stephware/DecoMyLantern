# BeMyParol — one ornate star layer for every friend

## The corrected product requirement

The earlier procedural design was incorrect: it surrounded a small central parol with one oversized, nearly circular shell. Friend count modified that shell's detail, rather than adding an actual structural layer.

**New rule: friend count = outer layer count, exactly.** The star is already complete at zero contributions. Each accepted contribution adds another complete decorated five-pointed STAR layer, outward from the previous layer. Fifty accepted friends create fifty filled star-shaped bands. There are no empty circular halos or missing spaces between the layers.

The outermost band always defines the external five-pointed silhouette, so it looks like one large, ornate Filipino parol instead of a tiny star trapped inside a frame. Every layer uses capiz-inspired translucent panels, gold ribs, enamel color, tip jewels and notch jewels. Every fifth layer also adds five decorative capiz rosettes. The five hanging ribbons and cord attach to the OUTERMOST star so they move as the parol grows.

## Friend identity versus decorative layer

Each accepted friend has two simultaneous representations:

- The **new outer structural layer**, in chronological arrival order (friend #1 adds layer #1). Each complete band uses a deterministic color and ornament pattern from the selected design family.
- The existing **personal light inside the core star**, anchored only by their immutable database `SlotIndex`. Owners can select it to identify the contributor; public invitation views do not reveal contributor names or sealed messages.

Outer layers are derived from the accepted contribution **count**, not from positions of any individual contribution. If a guest contribution is removed, the shell recomposes to match the updated count, but other contributors' individual light positions do not shift.

## Unlocks are separate from layering

The owner chooses among six collections:
- Classic Gold — unlocked at 0 friends (gold faceted gems)
- Floral Bloom — 3 friends (rose petals)
- Festival Lights — 10 friends (multicolored fans)
- Celestial Lace — 23 friends (small stars)
- Radiant Fiesta — 40 friends (sun accents)
- Sampaguita Glow — 50 friends (white jasmine ornaments)

The last design milestone is 50, **not a contribution limit**. At 51 friends the parol has 51 layers; at 120 it has 120 layers. Design permission is enforced by the API, not by unsaved preview counts.

## Implementation map

| Component | Responsibility |
|---|---|
| `src/frontend/src/features/lantern/growth/outerGrowth.ts` | Pure math: one layer per friend; ten-point star polygons, filled star-shaped bands, ten capiz facets, tip/notch geometry, outer camera fit, moving tassel anchors |
| `src/frontend/src/features/lantern/renderer/ProceduralOuterShell.tsx` | Draws each structural band plus stained glass, gold edging, five matching jewels, flower medallions at every fifth layer, external cord and five silk ribbons |
| `src/frontend/src/features/lantern/renderer/ParolArtwork.tsx` | Draws the complete zero-friend star core; no fixed center-attached tassels |
| `src/frontend/src/features/lantern/renderer/LanternScene.tsx` | Auto-fit animation, independent friend identity lights, manual pan and zoom |
| `src/frontend/src/features/dashboard/HostDashboard.tsx` | Safe testing panel: +1 friend, −1 friend, reset, milestone shortcuts |
| Backend design services + `20261017230000_LivingParolDesigns` | Six design unlock requirements; no changes to contributor schema |

## Verification

A source-level geometry evaluation verified 0/1/10/23/50/120 friend counts, count-to-layer equality, connected adjacent shells, a finite ten-vertex five-pointed star outline, moved tassel attachment points, and auto-fitting at full size.

Before merging PR #17, run the full frontend and backend tests and visually inspect **0, 1, 2, 3, 10, 23, 40, 50 and 60** layers in a browser on a phone and desktop. Check that 50 friends visibly produce 50 FULL star bands (not a large outlined circle), that the silk ribbons are attached to the last star, that zoom and pan work, and that clicking the preview buttons never adds a real contribution.

The existing data-only EF migration adds the extra design families and unlock thresholds, not an outer-layer table. Do not apply migrations to SQL Server `master`. Back up and confirm the API targets the intended `DecoMyLanternDb` first. The visual fix itself requires **no further migration**.

**PR remains draft** pending the full npm, TypeScript, .NET, SQL Server, and browser checks.
