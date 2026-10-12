# Deco My Lantern

A mobile-first Filipino parol that grows as friends contribute lights and Christmas messages.

**Stack:** React + TypeScript + Vite + Tailwind CSS; ASP.NET Core Web API (.NET 10); SQL Server + EF Core 10; layered SVG.

## Branches
- `main`: release branch; repository owner only.
- `dev`: integration branch; developers merge passing feature PRs.
- `feature/*`: short-lived branches created from `dev`.

## Getting started
See [docs/setup-guide.md](docs/setup-guide.md). The frontend includes a **preview-only** lantern renderer; invitation submission and registered-owner flows require the backend modules to be completed and tested. Never treat preview friend counts as real contributions.

## Project status
Initial project foundation. Do not deploy for public contributions until authentication, rate limits, guest abuse defenses, and Christmas message privacy tests are complete.
