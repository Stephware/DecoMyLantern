# Lightweight readiness and diagnostics

These are **detection checks**, not automated recovery or background monitoring.
They add no new logging package, host daemon, background timer, monitoring vendor
or renderer concurrency. The existing renderer's local browser/FFmpeg architecture,
cache, job queue and SQL Server transactions remain unchanged.

## HTTP endpoints

| Service | Endpoint | Success | Failure |
| --- | --- | --- | --- |
| API liveness | GET /api/health | 200 {"status":"ok"} | Only if API process is not serving |
| API readiness | GET /api/health/ready | 200 ready/degraded when SQL works | 503 when SQL cannot connect |
| Private renderer liveness | GET /health | 200 legacy {"message":"ready"} | Renderer process down |
| Private renderer readiness | GET /ready | 200 ready/degraded | 503 required files/tools missing |

The API readiness response has only safe coarse-grained statuses:
{"status":"degraded","components":{"database":"ready","renderer":"unavailable"}}.
It never returns connection strings, hostnames, encryption keys, tokens,
user information, file paths or raw exception messages.

- **Database is essential.** The API returns 503 when SQL Server is unavailable.
- **Renderer is optional.** An offline renderer returns API status "degraded" and
  HTTP 200, so owners can still create parols and friends can contribute.
- **Renderer optimized fallback is expected to be operational.** When configured
  for FFmpeg but verified optimized assets are missing, /ready returns HTTP 200,
  status "degraded" and optimizedVideo "fallback": Remotion is still available.
- **Renderer unavailable** is returned when its bundled UI, cache write access,
  FFmpeg or FFprobe executable cannot be accessed. The check does not launch
  Chromium, render frames, check image integrity or validate CPU/RAM headroom.
  Actual video compatibility and asset fingerprints are checked at startup/render.

The API has 3-second SQL and 2-second renderer probe deadlines. The private
renderer caches file-permission probe results for five seconds to avoid
repeated disk work. Both endpoints return Cache-Control: no-store.

## Operators

From an API-reachable host:

    curl -i https://api.bemyparol.site/api/health
    curl -i https://api.bemyparol.site/api/health/ready

To check the private renderer through its **internal** Docker network (no new
public port is required):

    docker compose -f compose.yaml exec story-renderer \
      node -e "fetch('http://127.0.0.1:7070/ready').then(async r => console.log(r.status, await r.text()))"

A monitoring service can poll these endpoints **if configured by the operator**.
No alerts, email notifications, third-party accounts, or schedules are installed.

## Logging and privacy

The API uses the existing ILogger infrastructure and logs changes in the
database/renderer status (not every health poll), with typed component fields.
Renderer readiness logs only when its overall status changes. Existing export
failure logs are preserved. Do not log guest invitation links, owner cookies,
recovery keys, request bodies or private messages.

## Verification

    dotnet test tests/DecoMyLantern.Api.IntegrationTests/DecoMyLantern.Api.IntegrationTests.csproj
    (cd story-renderer && npm test)
    (cd src/frontend && npm test && npm run lint && npm run build)

The SQL integration suite checks liveness/readiness through the real HTTP
pipeline. Renderer unit tests check healthy, degraded and unavailable paths and
the short readiness cache. Live production outage drills are not performed.
