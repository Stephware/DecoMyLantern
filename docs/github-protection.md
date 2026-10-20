# GitHub branch rules to configure manually

Private personal repository: branch rulesets require GitHub Pro or another eligible plan, otherwise permissions cannot be enforced. Personal private repositories offer Owner and Collaborator (write) access, not separate Read/Write/Maintain role assignments.

## Step 1 — invite developers
Settings -> Collaborators -> Add people -> invite their GitHub usernames. Collaborators can push feature branches and create/merge PRs, subject to repository branch rules.

## Step 2 — ruleset `dev-team-prs`
Settings -> Rules -> Rulesets -> New branch ruleset. Target only `dev`; Active; no bypass. Require pull request; **do not require status checks**, because GitHub Actions is disabled. Block force pushes and deletions. Keep approvals at 0 if developers should merge their own PRs. **Do not enable Restrict updates on dev:** it would prevent their PR merges.

## Step 3 — ruleset `main-owner-updates`
Target only `main`; Active. Enable `Restrict updates`. Bypass only **Repository admins**, set to **For pull requests only** (not Always). Personal repository owner is the only admin; do not give admin permission through a third-party app.

## Step 4 — ruleset `main-release-quality`
Target only `main`; Active; no bypass. Require pull request; **do not require status checks**, because GitHub Actions is disabled. Prevent force pushes and deletions. Set required approvals to 0 if you create your own release PR because authors cannot approve their own PR.

## Step 5 — verify
Test with a developer account: a manually reviewed `feature/* -> dev` PR can be merged without GitHub Actions checks, but direct push to `dev` fails, PR merge to `main` fails for collaborators, and direct push to `main` fails. As owner, test `dev -> main` via a manually verified PR.

## Repository merge method (merge commits only)

In **Settings → General → Pull Requests**, keep **Allow merge commits** enabled and **disable both Allow squash merging and Allow rebase merging**. For every approved, manually tested PR into `dev` or `main`, use **Merge pull request / Create a merge commit**, retaining the feature branch's commit history. Rulesets and this Markdown file do not change GitHub's repository-level merge-method settings; a repository administrator must save these options in GitHub Settings. Do not use the squash/rebase options, even if they're available in the UI.

## Important manual settings change for Task 5

Removing `.github/workflows/ci.yml` does **not** automatically remove existing GitHub branch-protection/ruleset requirements. In the GitHub repository, visit **Settings → Rules → Rulesets** (and **Settings → Branches** if legacy protection rules are in use). Edit rules targeting `dev` and `main` and remove required `frontend` and `backend` status checks. Otherwise, PR merges may remain blocked waiting for checks that will no longer run. **Keep pull-request requirements and protections against force pushes/deletions.**

These settings must be updated by a repository administrator in GitHub; modifying this document does not change the live settings. Manual lint, test, build, and EF model checks remain required by the team process, although GitHub will no longer enforce them automatically.

Keep `main` as the default branch and `dev` for active development.
