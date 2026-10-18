# Living parol: deterministic, ever-evolving outer artwork

The outer parol is **not one circle or ring per friend**. Every accepted contribution triggers a recomposition of its ornamental silhouette. The same friend count and selected design always generate the same geometry on every browser and reload.

## Rules

- **Zero friends still looks complete**: a five-pointed illuminated star is framed by five capiz-glass beams, five motif windows, embossed metal edging, gold latticework, 40 bulbs, 30 scallop trims, and 25 small puntetas. No blank circular outlines.
- **Every +1 friend changes the artwork**: the scalloped shell, pointed tips and petal geometry recompose. Each friend also contributes exactly five additional tiny glass inlays (one in each of the five sectors) through 50 friends. Bead trim, diamond tessellation and little star jewels become more intricate as the parol grows; fivefold symmetry prevents stray ornaments.
- **The outer form may rearrange**: it does not permanently assign outer petals/rays to individual people.
- **Friend identity is stable**: each accepted contribution keeps its immutable SQL `SlotIndex` and the corresponding inner-star light. The owner may highlight the light by name. Public guest previews still hide real contributor names and sealed messages.
- **No arbitrary growth cap**: 50 is the *last design unlock*, not the final friend. Outer radius continues gently beyond 50 and the SVG camera adjusts automatically.
- **Design family is chosen by the owner**. Classic Gold (facets), Floral Bloom (petals), Festival Lights (burst), Celestial Lace (lace), Radiant Fiesta (sunburst), and Sampaguita Glow (jasmine) each have a distinct recipe.
- **Unlock thresholds**: 0, 3, 10, 23, 40 and 50 respectively. A previously selected design is grandfathered, and historically reached unlocks stay available when a guest light is later removed. A direct API PUT cannot bypass a locked design.
- **No unsaved preview changes are persisted**. The owner's `+ Add test friend`, `−1 friend`, reset and milestone buttons work only in memory, up to 60 sample friends.

## Implementation

| Concern | Source |
|---|---|
| Pure radial grammar, geometry and camera fit | `src/frontend/src/features/lantern/growth/outerGrowth.ts` |
| Capiz beams, floral/jewel motif windows, siku-siku lattice, palimbun, puntetas, inlays and bulbs | `src/frontend/src/features/lantern/renderer/ProceduralOuterShell.tsx` |
| Central star and persistent identity lights | `ParolArtwork.tsx`, `LanternScene.tsx`, `lightPositions.ts` |
| Preview-only +1 friend controls | `HostDashboard.tsx` |
| Unlocks, ownership and progression metadata | `GrowthPolicy.cs`, `LanternService.cs`, `DesignDto.cs` |
| New six-design seed data | `20261017230000_LivingParolDesigns.cs` |

No new contribution tables are required. Existing `OwnerCredentials`, `Lanterns`, `Contributions`, `Messages`, and `ShareLinks` remain intact. The migration changes only the `ParolDesigns` and `GrowthStages` seed rows, preserving the three previous design IDs.

## Local verification and data safety

1. Check that the API's `ConnectionStrings:DefaultConnection` points at **DecoMyLanternDb**, not SQL Server's `master`. Confirm the server instance and back up any data you need.
2. From the solution root run `dotnet tool restore`, `dotnet ef migrations list --project src/backend/DecoMyLantern.Api --startup-project src/backend/DecoMyLantern.Api`, and review the pending migration.
3. Apply only to a backed-up **development** DB with `dotnet ef database update --project src/backend/DecoMyLantern.Api --startup-project src/backend/DecoMyLantern.Api`. Do not use `EnsureCreated`, drop existing tables or apply scripts to `master`.
4. Check `__EFMigrationsHistory` contains `20261017230000_LivingParolDesigns`. Check six catalog rows and each required-friend count.
5. From `src/frontend` run `npm ci && npm test && npm run lint && npm run typecheck && npm run build`. From root run `dotnet build DecoMyLantern.slnx && dotnet test DecoMyLantern.slnx`.
6. Manually test 0, 1, 2, 3, 9, 10, 22, 23, 39, 40, 49, 50, 51 and 60 friends on desktop and mobile. Verify all six family silhouettes, smooth auto-fit and persistent selected friend lights, and that clicking test controls doesn't save anything.
7. Test direct API requests for locked designs (409), 3/10/23/40/50 successful unlocks, revocation/guest privacy and existing owner recovery behavior.

**Verification status:** Frontend pure-geometry calculations were evaluated during development. Full .NET, npm, real SQL Server, and on-device tests were *not available* in the development environment and must pass before this PR merges or is released.
