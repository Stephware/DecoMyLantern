# Balanced progressive parol growth

The parol retains the approved 15 decorative regions in `outerGrowth.ts`, all six
themes, 20 glass facets per structural wave, and 10 primary signature ornaments
per region. It starts as a complete, illuminated mini parol without any ribbons
or tails.

## Geometry (SVG units)

- Every accepted friend creates **three independently animated, filled growth
  layers**, and exactly **one completed outer contour**.
- The first friend's *complete three-layer band* has width **10.5**, not 10.5
  per single wave. Each later friend's total band grows by **0.06**.
- Band `f` has width `10.5 + 0.06(f-1)`; each wave is one third of that band.
- The structural radius after `f` friends is
  `164 + 10.5f + 0.03f(f-1)`.
- The structural radius is **164 / 271.7 / 444.5 / 762.5** after
  **0 / 10 / 25 / 50** friends, excluding the conservatively bounded scallops.
- Outlines remain strictly nested, including mid-contribution waves.
  The scene automatically fits the complete floral silhouette.

## Ornament hierarchy

- **Fine accents:** Small diamond/glass inlays on each layer. The horizontal
  scale grows with friends, while radial depth stays bounded by the
  individual wave, so they cannot obscure adjacent bands.
- **Ten large signature ornaments per region:** The motif type changes with
  the existing 15 region names and six color/design families. Their size
  increases approximately **1% per friend**, plus a **6% emphasis at each
  new major decorative region**.
- **Twenty finer capiz facets per layer:** Kept independently from the ten
  signature ornaments so the parol remains intricate without making the
  large ornaments crowded.
- Signature ornament geometry is clipped within its region's current
  contributed panels; a partially unlocked region grows as its next
  waves appear without painting over the previous region.
- Earlier completed band outlines remain visible on top of regional motifs.

## Integration

`ProceduralOuterShell` and `outerGrowth.ts` are shared by the owner and
guest previews and by `StoryFrame`, which Remotion renders for MP4/PNG.
No database schema or invitation behavior changes. The three-wave timings
and design unlock milestones are unchanged.

## Verification

Run from `src/frontend`:

```bash
npm test
npm run typecheck
npm run build
```

The tests include numerical milestones, all 15 boundaries, motif size
progression, nonintersecting outlines, viewport fit, and reuse by Story.
Visually check the six themes at 0, 3, 10, 25 and 50 friends using the
existing non-persistent **Add test friend** controls, then the MP4 and PNG
exports after the Story renderer is running.
