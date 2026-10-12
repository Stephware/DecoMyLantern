# MVP SQL Server schema

EF Core Code First and migrations are the **source of truth**. See `Domain/Entities`, `ApplicationDbContext` and `Configurations`.

| Entity | Purpose |
|---|---|
| ApplicationUser / Identity tables | Registered lantern creators |
| Lantern | One per owner per season, selected design, theme and UTC unlock |
| ParolDesign | Curated SVG theme keys and required friend counts |
| GrowthStage | Configuration for structural unlock milestones |
| ShareLink | Revocable invitation token hash, never store raw invitation tokens |
| GuestVisitor | Random browser pseudonym token hash (no login / email) |
| Contribution | Active accepted guest, slot index, display name, lantern and link |
| Message | Optional private sealed message associated with a contribution |
| MessageReport | Owner report of abusive message content |

Indexes: unique (OwnerUserId, SeasonYear), unique DesignKey, unique StageKey and RequiredFriends, unique share link TokenHash, unique guest TokenHash, unique (LanternId, GuestVisitorId), unique (LanternId, SlotIndex), unique Message.ContributionId.

A browser cookie identifies a browser, not a real person. Supplement with rate limiting and optional challenge mechanisms before launch.
