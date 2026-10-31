#!/usr/bin/env python3
"""Run the old and FFmpeg Story renderers in isolated, resource-limited containers.

Example: python3 scripts/benchmark-story-renderers.py \
  --baseline bemyparol-story-optimized:full --optimized bemyparol-story-optimized:full
Generated videos stay under /tmp by default. No user data or secrets are saved.
"""
import argparse
import json
import os
import pathlib
import secrets
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
import re
from concurrent.futures import ThreadPoolExecutor


def docker(*args, env=None):
    return subprocess.check_output(['docker', *args], text=True, env=env).strip()


def post(port, secret, data):
    request = urllib.request.Request(f'http://127.0.0.1:{port}/render',
        json.dumps(data).encode(), {'Content-Type': 'application/json',
        'X-Story-Renderer-Key': secret}, method='POST')
    try:
        with urllib.request.urlopen(request, timeout=600) as response:
            return response.status, response.headers, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.headers, error.read()


def cgroup(container, metric):
    return docker('exec', container, 'cat', f'/sys/fs/cgroup/{metric}')


def cpu_usec(container):
    for line in cgroup(container, 'cpu.stat').splitlines():
        if line.startswith('usage_usec '):
            return int(line.split()[1])
    raise RuntimeError('cpu.stat has no usage_usec')


def wait_ready(port):
    for _ in range(180):
        try:
            with urllib.request.urlopen(f'http://127.0.0.1:{port}/health', timeout=2) as response:
                if response.status == 200:
                    return
        except (OSError, urllib.error.URLError):
            pass
        time.sleep(2)
    raise RuntimeError('Renderer did not become ready')


def design(kind):
    if kind == 'simple':
        return {'kind': 'owner', 'designKey': 'classic', 'patternKey': 'default',
            'friendCount': 0, 'slots': [], 'highlightSlot': None, 'format': 'mp4'}
    return {'kind': 'friend', 'designKey': 'sampaguita', 'patternKey': 'rays',
        'friendCount': 50, 'slots': list(range(50)), 'highlightSlot': 49, 'format': 'mp4'}


def probe(file, image):
    command = ['docker', 'run', '--rm', '--pull=never', '-v', f'{file.parent}:/out:ro',
        '--entrypoint', '/usr/bin/ffprobe', image, '-v', 'error',
        '-show_entries', 'stream=codec_name,width,height,r_frame_rate,pix_fmt:format=duration',
        '-of', 'json', f'/out/{file.name}']
    return json.loads(subprocess.check_output(command, text=True))


def compare(first, second, image):
    command = ['docker', 'run', '--rm', '--pull=never', '-v', f'{first.parent}:/out:ro',
        '--entrypoint', '/usr/bin/ffmpeg', image, '-hide_banner', '-i', f'/out/{first.name}',
        '-i', f'/out/{second.name}', '-filter_complex',
        '[0:v]fps=1[a];[1:v]fps=1[b];[a][b]ssim', '-f', 'null', '-']
    result = subprocess.run(command, text=True, stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE, check=True)
    matches = re.findall(r'All:([0-9.]+)', result.stderr)
    return float(matches[-1]) if matches else None


def measure(image, mode, output_dir, check_concurrency=False, concurrency_only=False):
    name = f'bemyparol-bench-{mode}-{os.getpid()}'
    secret = secrets.token_hex(32)
    env = dict(os.environ, STORY_RENDERER_SECRET=secret)
    docker('run', '-d', '--rm', '--pull=never', '--name', name,
        '--cpus=2', '--memory=2g', '-p', '127.0.0.1::7070',
        '-e', 'STORY_RENDERER_SECRET', '-e', f'STORY_RENDERER_MODE={mode}',
        image, env=env)
    try:
        port = int(docker('port', name, '7070/tcp').rsplit(':', 1)[1])
        wait_ready(port)
        results = {}
        for kind in (() if concurrency_only else ('simple', 'complex')):
            before_cpu = cpu_usec(name)
            start = time.monotonic()
            status, headers, video = post(port, secret, design(kind))
            elapsed = time.monotonic() - start
            after_cpu = cpu_usec(name)
            if status != 200:
                raise RuntimeError(f'{mode} {kind} returned {status}: {video[:200]!r}')
            file = output_dir / f'{mode}-{kind}.mp4'
            file.write_bytes(video)
            results[kind] = {'seconds': round(elapsed, 2),
                'cpu_seconds': round((after_cpu - before_cpu) / 1e6, 2),
                'bytes': len(video), 'cache': headers.get('x-story-cache'),
                'file': str(file)}
        if check_concurrency:
            same = dict(design('simple'), friendCount=1, slots=[0])
            different = dict(design('simple'), friendCount=2, slots=[0,1])
            with ThreadPoolExecutor(max_workers=3) as pool:
                first = pool.submit(post, port, secret, same)
                time.sleep(0.5)
                second = pool.submit(post, port, secret, same)
                time.sleep(1)
                third_status, _, _ = post(port, secret, different)
                first_status, _, first_video = first.result()
                second_status, _, second_video = second.result()
            cached_status, cached_headers, cached_video = post(port, secret, same)
            results['concurrency'] = {'same_request_statuses': [first_status, second_status],
                'same_request_identical_output': first_video == second_video,
                'different_request_while_busy_status': third_status,
                'repeat_status': cached_status,
                'repeat_cache': cached_headers.get('x-story-cache'),
                'repeat_identical_output': cached_video == first_video}
            if ([first_status, second_status, third_status, cached_status] != [200,200,503,200]
                    or first_video != second_video or cached_video != first_video
                    or cached_headers.get('x-story-cache') != 'HIT'):
                raise RuntimeError(f'Unexpected concurrent request behavior: {results["concurrency"]}')
        results['peak_memory_bytes'] = int(cgroup(name, 'memory.peak'))
        return results
    finally:
        subprocess.run(['docker', 'stop', name], check=False,
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--baseline', default='bemyparol-story-optimized:full')
    parser.add_argument('--optimized', default='bemyparol-story-optimized:full')
    parser.add_argument('--mode', choices=('both', 'remotion', 'ffmpeg'), default='both')
    parser.add_argument('--concurrency', action='store_true',
        help='Also test duplicate joining and bounded admission with an extra render')
    parser.add_argument('--concurrency-only', action='store_true',
        help='Run only the concurrent-request check (requires --mode ffmpeg)')
    parser.add_argument('--out', default=None)
    args = parser.parse_args()
    if args.concurrency_only and args.mode != 'ffmpeg':
        parser.error('--concurrency-only requires --mode ffmpeg')
    output_dir = pathlib.Path(args.out or tempfile.mkdtemp(prefix='bemyparol-benchmark-'))
    output_dir.mkdir(parents=True, exist_ok=True)
    report = {'environment': {'host': os.uname().sysname + ' ' + os.uname().release,
        'cpu': '2 vCPU Docker quota per container', 'memory': '2 GiB Docker limit',
        'baseline_image': args.baseline, 'optimized_image': args.optimized}}
    modes = [('remotion', args.baseline), ('ffmpeg', args.optimized)]
    for mode, image in modes:
        if args.mode not in ('both', mode):
            continue
        report[mode] = measure(image, mode, output_dir,
            check_concurrency=(args.concurrency or args.concurrency_only) and mode == 'ffmpeg',
            concurrency_only=args.concurrency_only)
        print(mode, json.dumps(report[mode], indent=2), flush=True)
    if args.mode == 'both':
        for kind in ('simple', 'complex'):
            first = output_dir / f'remotion-{kind}.mp4'
            second = output_dir / f'ffmpeg-{kind}.mp4'
            report['remotion'][kind]['media'] = probe(first, args.optimized)
            report['ffmpeg'][kind]['media'] = probe(second, args.optimized)
            report['ffmpeg'][kind]['ssim_1fps'] = compare(first, second, args.optimized)
    elif args.mode == 'ffmpeg' and not args.concurrency_only:
        for kind in ('simple', 'complex'):
            file = output_dir / f'ffmpeg-{kind}.mp4'
            report['ffmpeg'][kind]['media'] = probe(file, args.optimized)
            baseline = output_dir / f'remotion-{kind}.mp4'
            if baseline.exists():
                report['ffmpeg'][kind]['ssim_1fps'] = compare(baseline, file, args.optimized)
    (output_dir / 'results.json').write_text(json.dumps(report, indent=2) + '\n')
    print('Saved', output_dir / 'results.json')


if __name__ == '__main__':
    main()
