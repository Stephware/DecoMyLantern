#!/usr/bin/env python3
"""Synthetic, localhost-only renderer load test; never target production."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import secrets
import subprocess
import tempfile
import time
import urllib.error
import urllib.request


def docker(*args, check=True):
    p = subprocess.run(["docker", *args], capture_output=True, text=True)
    if p.returncode and check:
        raise RuntimeError("Docker command failed: " + " ".join(args[:3]) +
                           " " + p.stderr[-400:])
    return p.stdout.strip()


def call(port, key, path, payload=None, timeout=240):
    body = json.dumps(payload).encode() if payload is not None else None
    headers = {"content-type": "application/json"}
    if payload is not None:
        headers["X-Story-Renderer-Key"] = key
    start = time.monotonic()
    request = urllib.request.Request(
        f"http://127.0.0.1:{port}{path}", data=body, headers=headers,
        method="POST" if payload is not None else "GET")
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.status, {k.lower(): v for k, v in response.headers.items()}, response.read(), round(
                (time.monotonic() - start) * 1000)
    except urllib.error.HTTPError as error:
        return error.code, {k.lower(): v for k, v in error.headers.items()}, error.read(), round(
            (time.monotonic() - start) * 1000)


def image(count):
    return {"designKey": "classic" if count == 0 else "sampaguita",
            "patternKey": "default" if count == 0 else "rays",
            "friendCount": count, "slots": list(range(count)), "format": "webp"}


def video(count):
    return {"kind": "owner", "designKey": "classic" if count < 20 else "sampaguita",
            "patternKey": "default" if count < 20 else "rays",
            "friendCount": count, "slots": list(range(count)),
            "highlightSlot": None, "format": "mp4"}


def require(result, allowed, name):
    if result[0] not in allowed:
        raise AssertionError(f"{name}: HTTP {result[0]} not in {allowed}; "
                             f"body={result[2][:140]!r}")


def cpu_usage(name):
    rows = docker("exec", name, "cat", "/sys/fs/cgroup/cpu.stat").splitlines()
    return int(next(x.split()[1] for x in rows if x.startswith("usage_usec "))) / 1e6


def wait_ready(port, key):
    deadline = time.monotonic() + 240
    while time.monotonic() < deadline:
        try:
            result = call(port, key, "/ready", timeout=3)
            if result[0] in (200, 503):
                return result[0], json.loads(result[2])
        except (OSError, TimeoutError):
            pass
        time.sleep(2)
    raise RuntimeError("The private renderer did not become ready")


def detail(result, header=None):
    value = {"http": result[0], "ms": result[3], "bytes": len(result[2])}
    if header:
        value["cache"] = result[1].get(header)
    return value


def measure(image_tag, cpu, memory):
    name = "bemyparol-load-" + secrets.token_hex(5)
    key = secrets.token_hex(32)
    docker("run", "-d", "--name", name, "--cpus", str(cpu), "--memory", memory,
           "--pids-limit", "512", "-p", "127.0.0.1::7070",
           "-e", "STORY_RENDERER_SECRET=" + key,
           "-e", "STORY_RENDERER_MODE=ffmpeg",
           "-e", "STORY_RENDERER_PRESET=standard", image_tag)
    out = {"image": image_tag, "cpu_limit": cpu, "memory_limit": memory,
           "fixture": "Synthetic parols only; isolated container; no production access",
           "warnings": []}
    try:
        port = int(docker("port", name, "7070/tcp").rsplit(":", 1)[1])
        status, health = wait_ready(port, key)
        out["readiness"] = {"http": status, **health}
        if status != 200 or health.get("status") != "ready" or (
                health.get("components", {}).get("optimizedVideo") != "ready"):
            raise RuntimeError("FFmpeg assets are not ready: refusing to mislabel "
                               "Remotion fallback as an FFmpeg benchmark")
        start_cpu = cpu_usage(name)
        print("Ready. Measuring cold/hot WebP, MP4, and concurrent pressure.", flush=True)
        out["webp"] = {}
        for title, count in (("zero_friends", 0), ("fifty_friends", 50)):
            first = call(port, key, "/render-parol", image(count))
            second = call(port, key, "/render-parol", image(count))
            require(first, [200], "cold image")
            require(second, [200], "cached image")
            assert first[2] == second[2] and second[1].get("x-parol-cache") == "HIT"
            assert first[1].get("content-type", "").startswith("image/webp")
            out["webp"][title] = {"cold": detail(first, "x-parol-cache"),
                                  "cached": detail(second, "x-parol-cache")}
        out["cpu_after_images_seconds"] = round(cpu_usage(name) - start_cpu, 2)

        out["mp4"] = {}
        for title, count in (("zero_friends", 0), ("fifty_friends", 50)):
            first = call(port, key, "/render", video(count))
            second = call(port, key, "/render", video(count))
            require(first, [200], "cold video")
            require(second, [200], "cached video")
            assert first[2][4:8] == b"ftyp"
            assert first[2] == second[2] and second[1].get("x-story-cache") == "HIT"
            out["mp4"][title] = {"cold": detail(first, "x-story-cache"),
                                 "cached": detail(second, "x-story-cache")}
        out["cpu_after_videos_seconds"] = round(cpu_usage(name) - start_cpu, 2)

        with ThreadPoolExecutor(max_workers=12) as pool:
            first = pool.submit(call, port, key, "/render", video(6))
            time.sleep(.25)
            same = pool.submit(call, port, key, "/render", video(6))
            cold_images = [pool.submit(call, port, key, "/render-parol", image(n))
                           for n in range(7, 15)]
            cached_image = pool.submit(call, port, key, "/render-parol", image(0))
            results = [first.result(), same.result()]
            cold_results = [item.result() for item in cold_images]
            hot_image = cached_image.result()
        for index, item in enumerate(results):
            require(item, [200], "simultaneous MP4 " + str(index))
        assert results[0][2] == results[1][2], "Identical MP4s did not coalesce"
        require(hot_image, [200], "cached image during video load")
        assert hot_image[1].get("x-parol-cache") == "HIT"
        cold_codes = [item[0] for item in cold_results]
        assert all(status in (200, 503) for status in cold_codes), cold_codes
        if 503 not in cold_codes:
            out["warnings"].append("No mixed-load 503 observed; timing was inconclusive")
        out["mixed_load"] = {
            "same_video_http": [r[0] for r in results],
            "identical_bytes": True,
            "cold_image_http": cold_codes,
            "busy_responses": cold_codes.count(503),
            "cached_image": detail(hot_image, "x-parol-cache"),
        }

        accepted = []
        duplicate_status = None
        for n in range(17, 35):
            response = call(port, key, "/story-video/start", video(n), timeout=15)
            require(response, [202, 503], "background job admission")
            accepted.append(response[0])
            if duplicate_status is None:
                twice = call(port, key, "/story-video/start", video(n), timeout=15)
                require(twice, [202], "duplicate owner job")
                duplicate_status = twice[0]
        assert 503 in accepted, "Queue did not demonstrate its 12-pending bound"
        loaded_readiness = call(port, key, "/ready", timeout=5)
        require(loaded_readiness, [200], "readiness during queue pressure")
        out["queue"] = {"accepted": accepted.count(202), "busy": accepted.count(503),
                        "responses": accepted, "duplicate_http": duplicate_status,
                        "readiness_http": loaded_readiness[0],
                        "note": "Queue admission only; intentionally not drained"}
        peak = int(docker("exec", name, "cat", "/sys/fs/cgroup/memory.peak"))
        limit = int(docker("exec", name, "cat", "/sys/fs/cgroup/memory.max"))
        out["resources"] = {
            "cpu_seconds_since_ready": round(cpu_usage(name)-start_cpu, 2),
            "memory_peak_bytes_including_startup": peak,
            "memory_limit_bytes": limit,
            "memory_peak_percent": round(peak * 100 / limit, 2),
        }
        if peak >= limit * .9:
            out["warnings"].append("Memory >=90% of limit: do not increase parallel renders")
        logs = docker("logs", name, check=False)
        out["engine"] = {"ffmpeg_profiles": logs.count("Story render metrics "),
                         "fallbacks": logs.count("FFmpeg Story failed")}
        assert out["engine"]["ffmpeg_profiles"] >= 2, "FFmpeg timing evidence missing"
        if out["engine"]["fallbacks"]:
            out["warnings"].append("FFmpeg fallback observed; examine renderer logs")
        return out
    finally:
        docker("stop", "--time", "2", name, check=False)
        docker("rm", "-f", name, check=False)


def main():
    args = argparse.ArgumentParser()
    args.add_argument("--image", required=True)
    args.add_argument("--cpu", type=float, default=2)
    args.add_argument("--memory", default="2g")
    args.add_argument("--out", default=None)
    values = args.parse_args()
    output = Path(values.out or tempfile.mkdtemp(prefix="bemyparol-load-"))
    output.mkdir(parents=True, exist_ok=True)
    try:
        result = measure(values.image, values.cpu, values.memory)
        (output/"results.json").write_text(json.dumps(result, indent=2) + "\n")
        lines = ["# BeMyParol load-test results", "",
                 "Disposable Docker renderer, synthetic parols, not production capacity.", "",
                 "| Scenario | Cold ms | Cached ms |", "|---|---:|---:|"]
        for name, collection in (("WebP", result["webp"]), ("MP4", result["mp4"])):
            for fixture, metrics in collection.items():
                lines.append(f"| {name} {fixture} | {metrics['cold']['ms']} "
                             f"| {metrics['cached']['ms']} |")
        resource = result["resources"]
        lines += ["",
                  f"CPU consumed: {resource['cpu_seconds_since_ready']} seconds",
                  f"Peak memory, including startup: {resource['memory_peak_percent']}% "
                  "of the container limit",
                  f"Cold image 503s during video: {result['mixed_load']['busy_responses']}/8",
                  f"Queued owner jobs: {result['queue']['accepted']} accepted, "
                  f"{result['queue']['busy']} rejected of 18 requests",
                  "No renderer concurrency or production code changed."]
        lines += ["Caution: " + warning for warning in result["warnings"]]
        (output/"summary.md").write_text("\n".join(lines) + "\n")
        print("\n".join(lines), flush=True)
        print("RESULT_JSON=" + str(output/"results.json"), flush=True)
    except Exception as ex:
        (output/"failure.txt").write_text(type(ex).__name__ + ": " + str(ex) + "\n")
        raise


if __name__ == "__main__":
    main()
