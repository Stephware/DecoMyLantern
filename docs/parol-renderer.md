# BeMyParol — 50 friends, 50 actual five-pointed star layers

## Growth

The central parol is complete at **zero friends**. It uses a five-point star with an outer tip radius of 158 SVG units and notch radius 74. Every accepted friend contributes one connected decorative five-point star band, spaced 14 SVG units outward. Band N is defined by the difference between star polygons N and N − 1, and divided into ten capiz-glass facet panels. Therefore **50 friends create precisely 50 filled outer star layers**, not a single expanding circle and not fifty disconnected ornaments.

New bands have metallic edges, alternating capiz colors, tip and notch jewels, and full fivefold symmetry; every fifth band also carries capiz-style floral medallions. As the structure grows, the hanging cord and five ribbons follow the outermost star instead of the fixed center. The zoom calculation fits the entire star and moving tassels within the 600 × 640 SVG viewBox.

## Contributor identity

- The decoration's band count comes from the actual accepted contributions or, explicitly, a non-saving test count.
- A real friend's **separate light** inside the original star is positioned only by their immutable `Contribution.SlotIndex`. Removed contributions leave gaps in slot indices and never reposition another person's light.
- Guest invitation previews display only generic contributor labels, not other guests' real names or private messages.
- The owner preview buttons simulate 0–60 friends in React state without API calls; real contributions still require the invitation workflow.

## Design collections

| Design | Unlock count | Per-layer ornament |
|---|---:|---|
| Classic Gold | 0 | Faceted gold diamonds |
| Floral Bloom | 3 | Rose petals |
| Festival Lights | 10 | Colorful glass fans |
| Celestial Lace | 23 | Celestial star inlays |
| Radiant Fiesta | 40 | Warm sun motifs |
| Sampaguita Glow | 50 | Jasmine flowers |

Every collection uses the **same count-to-layer invariant**. Design unlocks are handled by the backend and remain separate from ring/band geometry. Friend count continues beyond 50.

## Local checks

```bash
# repo root
dotnet tool restore
dotnet build DecoMyLantern.slnx
dotnet test DecoMyLantern.slnx
dotnet ef migrations has-pending-model-changes --project src/backend/DecoMyLantern.Api --startup-project src/backend/DecoMyLantern.Api

cd src/frontend
npm ci
npm test
npm run lint
npm run typecheck
npm run build
```

In the design studio, test +1 friend sequentially and jump to 50; zoom into individual bands and validate the parol's star silhouette, fivefold symmetry, light selection and moving tassels. Review a narrow mobile viewport as well as desktop. Full local builds, browser screenshots and live SQL verification must pass before merging the draft PR.

See [living parol architecture](living-parol-design.md).
