# Planned API contracts

Initial API foundation:
- GET `/api/health`
- GET `/api/designs` returns enabled templates (no private information)
- GET `/api/growth-stages` returns milestones

Planned secured owner endpoints:
- Identity authentication routes (host account registration and login)
- Create/read the current owner's lantern; choose unlocked templates
- List sealed message metadata before unlock and bodies after unlock

Planned anonymous guest endpoints:
- Resolve a random invitation token, show public lantern preview
- Submit one guest contribution and an optional message (max 500 characters)
- Apply per-IP / per-invitation abuse controls, origin checks and idempotency protections

No unprotected mutation endpoint should be published before authorization and abuse protections are in place.
