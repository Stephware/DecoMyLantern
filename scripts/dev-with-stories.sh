#!/usr/bin/env bash
# Start the complete BeMyParol local development stack with working Story exports.
# No changes to owner/recovery/invitation secrets or to the SQL database.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RENDERER_DIR="$ROOT/story-renderer"
RENDERER_LOG="$RENDERER_DIR/.dev-renderer.log"
RENDER_PID=""
API_PID=""
WEB_PID=""

cleanup() {
  trap - EXIT INT TERM
  for pid in "$WEB_PID" "$API_PID" "$RENDER_PID"; do
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  for pid in "$WEB_PID" "$API_PID" "$RENDER_PID"; do
    if [[ -n "$pid" ]]; then wait "$pid" 2>/dev/null || true; fi
  done
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

for command_name in node npm dotnet openssl curl; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing $command_name. Install it before starting BeMyParol." >&2
    exit 1
  fi
done

# Do not race with a second dev API, Vite instance or renderer.
if command -v lsof >/dev/null 2>&1; then
  for port in 5050 5173 7070; do
    if lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null | grep -q .; then
      echo "Port $port is in use. Stop the existing dev server before using this script." >&2
      exit 1
    fi
  done
fi

# Only this run needs this shared secret. Both processes get the SAME value.
# Never rotate or overwrite the separately configured invitation encryption key.
export STORY_RENDERER_SECRET="$(openssl rand -hex 32)"
export StoryRenderer__SharedSecret="$STORY_RENDERER_SECRET"
export StoryRenderer__Url="http://127.0.0.1:7070"

echo "Preparing Story renderer dependencies..."
if [[ ! -x "$RENDERER_DIR/node_modules/.bin/remotion" ]]; then
  (cd "$RENDERER_DIR" && npm install --no-audit --no-fund)
fi

# Remotion needs a compatible Chrome Headless Shell for video encoding.
(cd "$RENDERER_DIR" && npx --no-install remotion browser ensure)

echo "Starting the private Story renderer..."
(cd "$RENDERER_DIR" && exec npm start) > "$RENDERER_LOG" 2>&1 &
RENDER_PID="$!"

ready=0
for ((attempt=0; attempt<180; attempt++)); do
  if curl --silent --show-error --fail --max-time 2 http://127.0.0.1:7070/health > /dev/null 2>&1; then
    ready=1
    break
  fi
  if ! kill -0 "$RENDER_PID" 2>/dev/null; then
    echo "Story renderer failed to start. Recent logs:" >&2
    tail -60 "$RENDERER_LOG" >&2
    exit 1
  fi
  sleep 1
done

if [[ "$ready" != 1 ]]; then
  echo "Story renderer did not become ready. Check $RENDERER_LOG" >&2
  tail -60 "$RENDERER_LOG" >&2
  exit 1
fi

echo "Renderer ready at http://127.0.0.1:7070"
echo "Starting ASP.NET Core on http://localhost:5050 ..."
(cd "$ROOT/src/backend/DecoMyLantern.Api" && exec dotnet run) &
API_PID="$!"

if [[ ! -x "$ROOT/src/frontend/node_modules/.bin/vite" ]]; then
  echo "Installing frontend dependencies..."
  (cd "$ROOT/src/frontend" && npm ci --no-audit --no-fund)
fi

echo "Starting React/Vite on http://localhost:5173 ..."
(cd "$ROOT/src/frontend" && exec npm run dev) &
WEB_PID="$!"

echo "BeMyParol local stack starting. Press Ctrl+C to stop all services."
echo "Renderer log: $RENDERER_LOG"
while true; do
  for pid in "$RENDER_PID" "$API_PID" "$WEB_PID"; do
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "A BeMyParol process stopped unexpectedly." >&2
      tail -50 "$RENDERER_LOG" >&2
      exit 1
    fi
  done
  sleep 2
done
