# Improvement #4 — Bounded renderer load testing

This is a repeatable, *synthetic* benchmark of the unchanged server renderer.
It adds **no parallelism**, backend changes, database writes, deployment
configuration, external monitoring, user identities or production requests.

## Run

Build the actual current renderer Docker image and run a disposable container:

    docker build -f story-renderer/Dockerfile -t bemyparol-renderer:load .
    python3 scripts/benchmark-renderer-load.py --image bemyparol-renderer:load \
      --cpu 2 --memory 2g --out /tmp/bemyparol-load-report

JSON and Markdown reports are stored only in the output directory. GitHub's
separate Bounded renderer load benchmark workflow runs automatically on relevant
PRs targeting dev, and can also be run manually. Results are attached as a
short-retention workflow artifact. Regular unit tests remain fast.

## Workload

- Cold and cached WebP 0/50-friend parol image snapshots.
- Cold and cached 0/50-friend 8-second H.264 video exports.
- Two simultaneous requests for the same uncached video (deduplicated media).
- Eight different cold image requests during video rendering. 503 is valid
  **backpressure** while one expensive render occupies the server; a cached
  image must still return 200 HIT.
- Eighteen distinct owner background-job starts to confirm the existing
  **one active + twelve pending** admission ceiling and duplicate-start behavior.
  The test checks queue admission only, not time to drain the whole queue.
- Readiness during load, container CPU time and peak RAM measured through cgroups.
  High memory utilization >=90% is reported as a warning, not a reason to
  automatically increase concurrency.

The container binds a random loopback-only host port and uses a fresh random
renderer secret. No live user data, parol links, messages, or owner credentials
are used. Do not point this script at any production host.

## Limitations and decisions

Peak RAM includes process startup and is the maximum over the whole run,
not the cost of one request. CPU seconds are container CPU time. Two CPU/2 GiB
are an explicit **test quota**, not an assertion about deployed server size.
One cold/hot pair per fixture is illustrative, not p95 production latency.
The workload is synthetic; actual phones, user sharing UI, web proxies and
host-specific production resources are not load tested.

Keep the single-active-render limit unless repeated representative runs
demonstrate safe extra headroom, no OOM risk, and a reduction in user-visible
busy responses under an explicitly tested alternative. Any future concurrency
change needs its own PR and additional quality/CPU/RAM verification.
