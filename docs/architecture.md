# Application architecture

The backend follows the MVC-style organization of `Stephware/InventoryOrderingSystem`:

```text
React + TypeScript (browser)
  -> ASP.NET Core API Controllers
  -> Services (business rules)
  -> Repository (EF Core queries)
  -> Models/Database (Entities + ApplicationDbContext + Configurations)
  -> SQL Server
```

`Models/DTOs` contains API contracts. The frontend owns the views, so the API intentionally does not have Razor `Views/` files. ASP.NET Core Identity provides the registered host's `/api/auth/*` routes; guests do not log in.

Growth thresholds (0, 5, 15, 30) unlock structural parol layers, with one stable decoration slot per accepted guest. Curated SVG designs share a compatible five-pointed structure.

Messages remain owner-only and sealed until December 25, midnight Philippine Standard Time (UTC+8). The API never returns message text early. Real guest submission endpoints and a completed host dashboard are **not implemented yet**.
