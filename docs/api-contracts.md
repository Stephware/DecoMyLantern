# API contracts (current)

- GET `/api/health` — liveness
- GET `/api/designs` — enabled parol designs
- GET `/api/growth-stages` — structural milestones
- POST `/api/auth/register`, POST `/api/auth/login` and other built-in Identity endpoints — registered host access
- GET `/api/my/lanterns/{lanternId}/messages` — requires host authentication; only owner gets messages, bodies redacted until unlock

Still to implement: creating a host's seasonal lantern, share link management, anonymous guest light/message submissions (no login), anti-abuse safeguards, design selection, owner reports.

Do not expose public mutation endpoints without invitation validation, duplicate protection, rate limiting, and transactional slot assignment.
