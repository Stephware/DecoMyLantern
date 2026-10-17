# BeMyParol — living procedural outer design

## Final visual behavior

The ring experiment informed the growth mechanics, but the **production artwork is not an expanding set of circles**. Each accepted friend triggers a new, balanced radial composition of the outer parol. A zero-friend parol is complete. Every subsequent count from 1 through 50 and beyond changes its outer contour, scale and repeating motifs.

Six owner-selectable families have independent design grammars:

| Design | Unlock requirement | Outer structure |
|---|---:|---|
| Classic Gold | 0 friends | Faceted diamonds and warm gold points |
| Floral Bloom | 3 friends | Rounded petals and flowing floral arcs |
| Festival Lights | 10 friends | Layered festival fans and bursts |
| Celestial Lace | 23 friends | Fine celestial lace/star points |
| Radiant Fiesta | 40 friends | Bright symmetrical sunbursts |
| Sampaguita Glow | 50 friends | Jasmine petals and soft luminous layers |

The unlock milestone is not a limit on contributions. Growth continues after 50 friends, with logarithmic radius expansion to avoid unbounded viewport size.

## Identity and camera

- Every accepted `Contribution` keeps its original immutable `SlotIndex` and a corresponding **individual inner-star light**. Outer petals/rays are not themselves permanent friend identities, so the shell is free to recompose.
- Selecting a light highlights it and displays its saved guest name to the owner. In anonymous guest previews, this is a generic label and never reveals names or sealed Christmas messages.
- `LanternScene` computes a fit zoom from the outer extent, including the fixed silk tassels, and re-centers when the friend count changes. Manual drag/pinch/zoom and Fit continue working.
- `ParolArtwork` draws the fixed core. `ProceduralOuterShell` draws the living outside. `outerGrowth.ts` is the deterministic style/geometry engine.
- Preview buttons on the owner's dashboard simulate 0–60 friends in memory. **They do not write to SQL Server** and do not unlock any design or submit a guest contribution.

## Database and compatibility

`20261017230000_LivingParolDesigns` updates only design and growth-stage seed rows. Existing three design GUIDs are unchanged; their currently saved lantern selections remain valid. No SQL table is dropped. Both new saves and direct API calls enforce `RequiredFriends`; `NextSlotIndex` retains historical friend progress when an individual contribution is removed.

Before applying the migration, compare `ConnectionStrings:DefaultConnection` with the SQL client instance and verify **DecoMyLanternDb**, not `master`. Prefer `dotnet ef database update` after backup rather than manually re-running the entire SQL script.

## Verification checklist

From the frontend directory: `npm ci && npm run test && npm run lint && npm run typecheck && npm run build`.

From solution root: `dotnet build DecoMyLantern.slnx && dotnet test DecoMyLantern.slnx`; then `dotnet ef migrations has-pending-model-changes --project src/backend/DecoMyLantern.Api --startup-project src/backend/DecoMyLantern.Api`.

Review desktop/mobile at 0, 1, 2, 3, 10, 23, 40, 50 and 60 friends; all six designs, explicit locked/unlocked gallery states and the +1 friend preview. Verify previously saved parols retain their selected designs, guest names remain private, and manual fit/zoom stays functional.

See [living parol design architecture](living-parol-design.md).
