"""Export the six landing-page parol images as small static WebP files.

The landing marquee must never call the renderer (one render slot, per-IP
rate limit), so re-run this whenever a design's artwork changes:

    python scripts/export-landing-parols.py [API_BASE]   # default http://localhost:8080

Needs Pillow (pip install pillow).
"""
import io
import pathlib
import sys
import time
import urllib.error
import urllib.request

from PIL import Image

# Keep in sync with THEMES in src/frontend/src/features/customization/themes.ts.
KEYS = ["classic", "floral", "festival", "celestial", "fiesta", "sampaguita"]
WIDTH = 800
OUT = pathlib.Path(__file__).resolve().parent.parent / "src/frontend/public/parols"


def fetch(url: str) -> bytes:
    for _ in range(10):
        request = urllib.request.Request(url, headers={"Accept": "image/webp", "User-Agent": "bemyparol-export/1.0"})
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                return response.read()
        except urllib.error.HTTPError as error:
            if error.code != 503:
                raise
            time.sleep(int(error.headers.get("Retry-After", "2")))
    raise RuntimeError(f"renderer stayed busy: {url}")


def main() -> None:
    base = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080").rstrip("/")
    OUT.mkdir(parents=True, exist_ok=True)
    for key in KEYS:
        image = Image.open(io.BytesIO(fetch(f"{base}/api/designs/{key}/showcase")))
        height = round(image.height * WIDTH / image.width)
        target = OUT / f"{key}.webp"
        image.resize((WIDTH, height), Image.LANCZOS).save(target, "WEBP", quality=75, method=6)
        print(f"{target.name}: {WIDTH}x{height}, {target.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
