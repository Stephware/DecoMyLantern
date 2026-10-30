#!/usr/bin/env bash
# BeMyParol Phase 6: local automated release gates (no production changes).
# Run from any directory: bash scripts/verify-phase6.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND="$ROOT/src/frontend"
RENDERER="$ROOT/story-renderer"
SKIP_INSTALL=false

case "${1:-}" in
  "") ;;
  --skip-install) SKIP_INSTALL=true ;;
  -h|--help)
    echo "Usage: bash scripts/verify-phase6.sh [--skip-install]"
    echo "Runs frontend typecheck/lint/tests/build, renderer tests, and .NET tests."
    echo "--skip-install uses existing local node_modules instead of npm ci."
    exit 0 ;;
  *) echo "Unknown argument: $1" >&2; exit 2 ;;
esac

for cmd in node npm dotnet; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "FAIL: $cmd is required. No release checks were skipped." >&2
    exit 1
  fi
done

NODE_MAJOR="$(node -p "Number(process.versions.node.split('.')[0])")"
if (( NODE_MAJOR < 22 )); then
  echo "FAIL: Node.js 22+ required (found $(node --version))." >&2
  exit 1
fi

DOTNET_VERSION="$(dotnet --version)"
if [[ "${DOTNET_VERSION%%.*}" -lt 10 ]]; then
  echo "FAIL: .NET SDK 10+ required (found $DOTNET_VERSION)." >&2
  exit 1
fi

for path in "$ROOT/DecoMyLantern.slnx" "$FRONTEND/package-lock.json" \
  "$RENDERER/package.json" "$ROOT/downtime/index.html"; do
  if [[ ! -f "$path" ]]; then
    echo "FAIL: missing file $path. Pull the latest dev branch first." >&2
    exit 1
  fi
done

run_step() {
  local label="$1"
  shift
  echo ""
  echo "==> $label"
  if "$@"; then
    echo "PASS: $label"
  else
    local code=$?
    echo "FAIL: $label (exit code $code). Release NOT approved." >&2
    exit "$code"
  fi
}

echo "BeMyParol Phase 6 local automated verification"
echo "Root: $ROOT"
echo "Node: $(node --version) | npm: $(npm --version) | dotnet: $DOTNET_VERSION"

if ! $SKIP_INSTALL; then
  run_step "Install locked frontend dependencies" npm --prefix "$FRONTEND" ci --no-audit --no-fund
  if [[ -f "$RENDERER/package-lock.json" ]]; then
    run_step "Install locked renderer dependencies" npm --prefix "$RENDERER" ci --no-audit --no-fund
  else
    echo "NOTICE: Renderer has no committed lockfile; its dependency tree is not fully reproducible."
    run_step "Install renderer dependencies (no lockfile)" npm --prefix "$RENDERER" install --package-lock=false --no-audit --no-fund
  fi
else
  echo "NOTICE: Using existing dependencies (--skip-install); this is not a clean-install verification."
fi

run_step "Frontend TypeScript typecheck" npm --prefix "$FRONTEND" run typecheck
run_step "Frontend ESLint" npm --prefix "$FRONTEND" run lint
run_step "Frontend automated tests (including Phases 1–6)" npm --prefix "$FRONTEND" test
run_step "Frontend production build" npm --prefix "$FRONTEND" run build
run_step "Private parol / Story renderer unit tests" npm --prefix "$RENDERER" test
run_step "ASP.NET Core solution tests" dotnet test "$ROOT/DecoMyLantern.slnx" --nologo

echo ""
echo "PASS: all local automated release gates finished."
echo "PENDING: run the manual owner/guest, image, video, mobile and downtime"
echo "browser matrix in docs/phase6-release-verification.md before releasing."
echo "No files were merged or deployed by this script."
