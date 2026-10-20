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

`Models/DTOs` contains API contracts. The frontend owns the views, so the API intentionally does not have Razor `Views/` files. ASP.NET Core Identity tables remain as internal owner foreign-key records, but the registration/login API and login page have been removed. New owners receive an opaque 256-bit random cookie bearer secret; only its SHA-256 hash exists in the `OwnerCredentials` table. `OwnerTokenHandler` authenticates against SQL Server for each protected request, deriving the internal owner ID claim used by the existing lantern and sealed-message authorization. A private recovery key can rotate the bearer token; the owner can rotate the recovery key while signed in. Old Identity cookies are supported only for a one-time upgrade. `IMemoryCache` caches public design/growth catalogs, not owner authorization or messages.

No designs are locked by friend counts. A complete base parol is visible at zero contributions; every accepted friend adds a stable-position light. Friend counts 6–50 each add an additional outer ornament while those contributions remain accepted. The five descriptive visual ranges are 0, 1–5, 6–15, 16–30, and 31–50. Curated SVG designs share a compatible five-pointed structure.

Messages remain owner-only and sealed until December 25, midnight Philippine Standard Time (UTC+8). The API never returns message text early. Task 4 adds hashed, expiring/revocable share-link tokens and HTTP-only guest cookies. Guest preview exposes only artwork and light positions. Guest contributions are saved with optional sealed notes in SQL transactions, with a row lock on the lantern to allocate stable slots and uniqueness constraints to deter duplicates. Owner and guest permissions remain separate.
