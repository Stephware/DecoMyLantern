# Deco My Lantern

A mobile-first Filipino Christmas parol that grows through anonymous guest lights and private Christmas letters.

## Stack
- React + TypeScript + Vite + Tailwind CSS
- ASP.NET Core Web API (.NET 10), organized like a familiar MVC project: `Controllers → Services → Repository → Models/Database`
- SQL Server + EF Core Code First
- Layered SVG parol renderer

## Development
`main` is owner-only production. Developers use `feature/*` branches based on `dev`, then create passing PRs into `dev`. Only the owner merges `dev` into `main`.

Start with [setup guide](docs/setup-guide.md); database entities and the schema-generation/bootstrap command are documented in [database-schema](docs/database-schema.md). Configure GitHub rulesets using [GitHub protection](docs/github-protection.md).

**Status:** The UI is a preview. Guest contribution writes, creator flows and production security checks are not yet complete. Do not treat demo friends as real accepted contributions.
