# BeMyParol — continuous per-friend growth

## Design principle

**A user with zero friends still has a complete, beautiful parol.** Every accepted guest contribution adds a real, individually positioned light. A larger friend circle makes the parol increasingly elaborate, but no parol design, color collection, or pattern is locked behind contribution counts.

All three SVG collections — **Classic Gold**, **Floral Bloom**, and **Festival Lights** — remain selectable with **zero** accepted friends. They use the same 600 × 640 coordinate system and stable light positions.

## Five descriptive visual ranges

| Accepted friends | Stage key | Appearance |
| --- | --- | --- |
| 0 | `base` | Complete five-point capiz star, tails, motifs and luminous center |
| 1–5 | `lights` | Each friend adds their own luminous light |
| 6–15 | `details` | Each new friend adds a light **plus one** detail-ring diamond (up to 10) |
| 16–30 | `fuller` | Each new friend adds a light **plus one** fuller-layer petal (up to 15) |
| 31–50 | `grand` | Each new friend adds a light **plus one** crown ornament (up to 20) |

These ranges are descriptions, **not unlock thresholds**. In particular, going from 5 to 6, 15 to 16, and 30 to 31 adds **one ornament**, not a whole completed ring at once. The base star remains untouched.

**50 is a design target, not a backend contribution cap.** Task 3's geometry tests cover 0–50 and 51+ coordinates; Task 4 now provides the real guest submission API and a local database smoke script. Actual mobile visual testing and concurrent database testing remain to be run.

The backend computes `growthStage` using `GrowthPolicy.StageFor(acceptedFriends)`. The frontend's `stageForFriends` mirrors its five ranges for display. `decorationCounts` derives accent counts from the **number of accepted, non-removed contributions**; no sample or client-supplied friend count can change saved owner data.

## Individual contributor lights remain stable

`GET /api/my/lantern` and `PUT /api/my/lantern` include `lights: [{ id, slotIndex, displayName }]`.

- `SlotIndex` is persisted for each accepted contribution. Task 4 implements guest submissions with serializable transactions and stable slot allocation.
- `lightPosition(slotIndex)` computes coordinates from **only** the stable slot index, not from the current number of contributions, their order, the design, or the visual range.
- Removed contributions leave gaps in the sequence, without moving others. The database enforces uniqueness on `(LanternId, SlotIndex)`.
- `LanternScene` uses real `contributions` for the owner view; `previewCount` explicitly creates **sample lights only** and never mutates the backend or unlocks content.

## Mobile interactions

`LanternScene` supports drag, pinch-to-zoom, Zoom In, Zoom Out and Fit. The SVG viewBox is 600 × 640 with enough room for the designed outer crown and tails. Animations respect `prefers-reduced-motion`.

**Note:** Container-measured dynamic auto-fit scaling is a *separate requested frontend enhancement* and is **not** claimed as implemented by Task 1. Its implementation belongs to the later frontend work, not this backend growth task.

## Database migration

`20261016160000_ProgressiveParolGrowth` is a **seed-data-only EF Core migration**. It changes legacy `ParolDesigns.RequiredFriends` values to zero, replaces the old four descriptive `GrowthStages` seed rows with five updated ones, and preserves IDs and all existing lantern/contribution data.

Update your local database after pulling `dev`:

```bash
dotnet tool restore
dotnet ef database update --project src/backend/DecoMyLantern.Api --startup-project src/backend/DecoMyLantern.Api
```

## Manual validation

From `src/frontend` run `npm ci`, `npm run test`, `npm run lint`, `npm run typecheck`, and `npm run build`.

From the root run `dotnet restore DecoMyLantern.slnx`, `dotnet build DecoMyLantern.slnx --configuration Release`, `dotnet test DecoMyLantern.slnx --configuration Release`, and `dotnet ef migrations has-pending-model-changes --project src/backend/DecoMyLantern.Api --startup-project src/backend/DecoMyLantern.Api` after `dotnet tool restore`.

Manually preview **0, 3, 10, 23, 40, 50** sample lights for each design on both desktop and phone. With zero real contributions, verify that Classic, Floral, and Festival can each be saved and restored after a page reload. Task 2 owner-token access has merged, and Task 4 adds invitation and guest submission handling. Real SQL Server 50-friend and concurrent request tests remain pending. See [Task 4](task4-friend-invitations.md).
