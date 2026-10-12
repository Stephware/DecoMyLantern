# GitHub branch rules to configure manually

Private personal repository: branch rulesets require GitHub Pro or another eligible plan, otherwise permissions cannot be enforced. Personal private repositories offer Owner and Collaborator (write) access, not separate Read/Write/Maintain role assignments.

## Step 1 — invite developers
Settings -> Collaborators -> Add people -> invite their GitHub usernames. Collaborators can push feature branches and create/merge PRs, subject to repository branch rules.

## Step 2 — ruleset `dev-team-prs`
Settings -> Rules -> Rulesets -> New branch ruleset. Target only `dev`; Active; no bypass. Require pull request; require passing checks `frontend`, `backend`; block force pushes and deletions. Keep approvals at 0 if developers should merge their own PRs. **Do not enable Restrict updates on dev:** it would prevent their PR merges.

## Step 3 — ruleset `main-owner-updates`
Target only `main`; Active. Enable `Restrict updates`. Bypass only **Repository admins**, set to **For pull requests only** (not Always). Personal repository owner is the only admin; do not give admin permission through a third-party app.

## Step 4 — ruleset `main-release-quality`
Target only `main`; Active; no bypass. Require pull request; require checks `frontend` and `backend`; prevent force pushes and deletions. Set required approvals to 0 if you create your own release PR because authors cannot approve their own PR.

## Step 5 — verify
Test with a developer account: a passing `feature/* -> dev` PR can be merged, but direct push to `dev` fails, PR merge to `main` fails, and direct push to `main` fails. As owner, test `dev -> main` via passing PR.

Keep `main` as the default branch and `dev` for active development. No ruleset has been created for you by the app.
