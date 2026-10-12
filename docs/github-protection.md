# GitHub branch rules (owner setup required)

Repository: private personal GitHub repository. Strict rules on private repos require a supporting plan (e.g. GitHub Pro); do not assume they are active until configured and verified.

## dev
- Require pull requests before merging.
- Require passing CI checks: `frontend`, `backend` (after the first successful run).
- Block branch deletion and force pushes.
- Developers with Write permission may merge passing feature PRs.
- Block direct pushes using an appropriate ruleset, but do not accidentally prevent developers from merging their PRs.

## main
- Require pull requests and passing CI.
- Restrict updates to the repository owner/admin; allow pull-request-only bypass of the update restriction for the owner.
- Forbid direct pushes, force pushes and deletion.
- Developers may read main, but must not be able to push, change files or merge into main.

Use a separate developer account to verify that merging to `dev` succeeds and merging or pushing to `main` fails. This connector cannot assume branch rules were saved. The owner must verify repository settings on GitHub.
