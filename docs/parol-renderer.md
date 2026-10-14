# Phase 2 — Parol renderer

## Overview

Deco My Lantern now renders three **different SVG collections**, with a shared five-point silhouette, glass-like capiz panels, decorative details, hanging filament and tassels:

- **Classic Gold** (unlocked at 0 friends): golden woven shapes and geometric capiz accents
- **Floral Bloom** (unlocked at 5 accepted friends): petals and floral vines
- **Festival Lights** (unlocked at 15 accepted friends): decorative multicolor geometric festival patterns

All designs use the same normalized **600 × 640 SVG coordinate system**. Their motif and colors change, but accepted contribution positions are stable.

## Growth stages

Growth is based only on the number of **accepted, non-removed** contributions returned from SQL Server.

| Accepted friends | Stage | New SVG layer |
| --- | --- | --- |
| 0–4 | First Light (`base`) | Core five-point capiz parol with silk tails and center rosette |
| 5–14 | Glowing Star (`enhanced`) | Outer luminous bead ring with ten diamond ornament points |
| 15–29 | Radiant Parol (`radiant`) | Second sculpted halo with 20 leaf/flame ornaments |
| 30+ | Grand Parol (`grand`) | Final radial crown and outer ring of 24 lantern accents |

Stages **add** independent decorative elements instead of replacing the core. Growth uses milestone thresholds; it does not resize a bitmap or use the Fibonacci snowflake formula.

## Stable lights

The authenticated `GET /api/my/lantern` and `PUT /api/my/lantern` endpoints return a `lights` array. Every member has `id`, `slotIndex`, and `displayName`.

- `SlotIndex` is allocated and persisted by the backend when contributions are accepted (guest contribution submission is implemented in Phase 3).
- `lightPosition(slotIndex)` computes a deterministic coordinate from the index **alone**. It never depends on theme, contribution array position, friend count, or stage.
- Do **not** compact slots when a contribution is removed; leave gaps. The SQL constraint on `(LanternId, SlotIndex)` protects uniqueness.
- After styling, the scene displays one visible glow per active contribution, keyed by its persisted ID, with its display name in the accessible SVG title.
- The owner API omits removed contributions. The accepted count and growth stage derive from the same list of active contributions; no simulated friends are used in the dashboard's **My lantern** mode.

## Mobile interactions

`LanternScene` supports one-finger/mouse drag, two-finger pinch, zoom in/out, and Fit to restore the centered full-lantern view. Buttons provide accessible text labels and 44px touch targets. Pointer movements are limited to a bounded range so the parol is easy to recover with Fit. Only the parol canvas disables native touch panning, so the rest of the page can still scroll.

Animations honor the operating system's `prefers-reduced-motion` preference.

## Visual previews versus persisted data

Until Phase 3 is built, the owner has zero accepted friend contributions. To inspect all stages now, the dashboard has a clearly labeled **Design studio** preview selector for 0, 5, 15 and 30 sample lights. Preview data is never sent to the backend and does **not unlock** restricted collections. A locked collection can be previewed but cannot be saved. **My lantern** switches back to real persisted lights immediately.

Do not reuse `previewCount` for a public lantern or as an authorization signal.

## Testing

From `src/frontend`:

```bash
npm ci
npm run test
npm run lint
npm run typecheck
npm run build
```

The renderer tests exercise stage boundaries, deterministic coordinates, sparse slots, finite bounds and invalid indices. Backend tests also verify that returned slot values remain unchanged, including gaps. GitHub CI now runs these alongside existing backend tests and EF migration validation.

## Future phases

Phase 3 must write/return real guest contributions with transactional slot allocation and duplicate protection. Phase 4 implements the full server-protected Christmas inbox. No database schema change was required for Phase 2.
