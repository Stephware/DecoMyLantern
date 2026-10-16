# Contributing

1. Update your local `dev`: `git switch dev && git pull origin dev`.
2. Create a branch: `git switch -c feature/short-description`.
3. Implement and test changes. Do not commit credentials, personal data, or actual SQL Server database files.
4. Run manual checks before opening a pull request **to `dev`**, not `main`: frontend `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`; backend `dotnet restore`, `dotnet build`, and `dotnet test` on `DecoMyLantern.slnx`. For model/configuration changes, run `dotnet tool restore` and `dotnet ef migrations has-pending-model-changes --project src/backend/DecoMyLantern.Api --startup-project src/backend/DecoMyLantern.Api`.
5. In the PR description, record which checks you actually ran and the results. Review the diff. Developers must use **Create a merge commit** for manually verified feature PRs into `dev`; never use **Squash and merge** or **Rebase and merge**. Avoid direct pushes to `dev`. No automated GitHub Actions CI/CD runs.
6. Only the repository owner promotes tested changes from `dev` to `main` through a release PR.

**Database changes:** Include the C# entities, EF Core configuration, migration and (if applicable) documentation in one PR. Migrations are version controlled and should not be silently rewritten after merging.

**Frontend:** Keep the parol layout modular. New themes must maintain stable decoration slot identities so messages and contributions do not move when the owner changes themes.
