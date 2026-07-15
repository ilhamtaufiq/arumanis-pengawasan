"""Remove solid backgrounds from story-frame logos → transparent PNG."""
from __future__ import annotations

import os
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"


def make_ams_transparent(src: Path, out: Path) -> None:
    im = Image.open(src).convert("RGBA")
    pixels = im.load()
    w, h = im.size

    def soft_alpha(r: int, g: int, b: int) -> int:
        m = min(r, g, b)
        if m >= 250:
            return 0
        if m >= 220:
            t = (m - 220) / 30.0
            return int(255 * (1 - t))
        return 255

    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            # near-white background
            if r >= 230 and g >= 230 and b >= 230 and abs(r - g) < 14 and abs(g - b) < 14:
                sa = soft_alpha(r, g, b)
                pixels[x, y] = (r, g, b, 0 if sa <= 5 else sa)

    bbox = im.getbbox()
    if bbox:
        l, t, r, b = bbox
        pad = 8
        im = im.crop(
            (
                max(0, l - pad),
                max(0, t - pad),
                min(w, r + pad),
                min(h, b + pad),
            )
        )

    # Keep high-res for story export (1080-wide frame); only downscale if huge
    mw = 1280
    if im.width > mw:
        nh = int(im.height * mw / im.width)
        im = im.resize((mw, nh), Image.Resampling.LANCZOS)

    im.save(out, "PNG", optimize=True)
    print(f"saved {out} size={im.size} bytes={os.path.getsize(out)}")


def make_arumanis_transparent(src: Path, out: Path) -> None:
    im = Image.open(src).convert("RGBA")
    pixels = im.load()
    w, h = im.size

    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if r <= 25 and g <= 25 and b <= 25:
                pixels[x, y] = (0, 0, 0, 0)
            elif r <= 45 and g <= 45 and b <= 45:
                t = max(r, g, b) / 45.0
                pixels[x, y] = (r, g, b, int(255 * t))

    bbox = im.getbbox()
    if bbox:
        l, t, r, b = bbox
        pad = 4
        im = im.crop(
            (
                max(0, l - pad),
                max(0, t - pad),
                min(w, r + pad),
                min(h, b + pad),
            )
        )

    im.save(out, "PNG", optimize=True)
    print(f"saved {out} size={im.size} bytes={os.path.getsize(out)}")


def main() -> None:
    ams_src = ASSETS / "logo-ams-source.png"
    if not ams_src.exists():
        ams_src = Path(r"C:\Users\asusg\Downloads\Logo Ams - 1.png")
    make_ams_transparent(ams_src, ASSETS / "logo-bidang-ams.png")

    aru = ASSETS / "arumanis.png"
    if aru.exists():
        make_arumanis_transparent(aru, ASSETS / "arumanis-logo.png")


if __name__ == "__main__":
    main()
