# Architecture

- `src/frontend`: React + TypeScript + Vite, Tailwind CSS and SVG renderer. Public preview and guest link entry points are mobile-first.
- `src/backend/DecoMyLantern.Api`: ASP.NET Core Web API with feature modules, Domain entities and EF Core persistence.
- `tests/DecoMyLantern.Api.Tests`: backend business-rule tests.

Owner accounts use ASP.NET Core Identity. Guests need no account; a pseudonymous, randomly generated browser identifier can discourage repeat participation, but does not prove unique humans. Authentication, rate limits and guest-contribution endpoints require thorough testing before public deployment.

New friend contributions should occupy stable slots. Stage geometry changes only at 0, 5, 15 and 30 accepted friends (configurable), while each accepted contribution illuminates a light. Themes share a compatible five-pointed parol layout.

Christmas message bodies are never returned by the server to the owner before `UnlockAtUtc`. For the 2026 Philippine Christmas season, unlock is 2026-12-24T16:00:00Z.
