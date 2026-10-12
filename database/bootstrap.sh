#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
project="src/backend/DecoMyLantern.Api"
dotnet tool restore
if ! find "$project/Models/Database/Migrations" -name '*_InitialCreate.cs' 2>/dev/null | grep -q .; then
  dotnet ef migrations add InitialCreate --project "$project" --startup-project "$project" --output-dir Models/Database/Migrations
fi
mkdir -p database
dotnet ef migrations script --idempotent --project "$project" --startup-project "$project" --output database/schema.sql
if [[ "${1:-}" == "--apply" ]]; then
  dotnet ef database update --project "$project" --startup-project "$project"
else
  echo "Migration and SQL script created. Run with --apply after configuring SQL Server connection to create tables."
fi
