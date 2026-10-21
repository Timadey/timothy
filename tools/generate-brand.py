#!/usr/bin/env python3
"""Regenerate static brand assets from resources/brand/logo-source.png.

Run once per logo change: python3 tools/generate-brand.py
Generated files are committed; CI never runs this script.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "resources" / "brand" / "logo-source.png"
PUBLIC = ROOT / "public"
IMAGES = PUBLIC / "images"

# Monogram-only region of the 1254x1254 source: a bright-pixel scan found the
# monogram at y 445-726 / x 398-853; the "TTADELEKE" wordmark starts at y 787.
# This crop is monogram + 40px of black padding and stops well above it.
CROP = (358, 405, 894, 767)
TILE = 536  # square canvas: crop is 536 wide, pasted centered on black
MARK = 512
CREAM = (241, 235, 229)
CARD = (1200, 630)
FONT = "/System/Library/Fonts/Helvetica.ttc"


def flatten_blacks(img: Image.Image) -> Image.Image:
    """Crush the source's non-uniform near-black (up to ~30) to pure black so
    pasted tiles never show a rectangle seam against the card's black."""
    lut = [0 if v <= 30 else v for v in range(256)]
    return img.point(lut * 3)


def build_mark() -> Image.Image:
    source = Image.open(SOURCE).convert("RGB")
    tile = source.crop(CROP)
    canvas = Image.new("RGB", (TILE, TILE), (0, 0, 0))
    canvas.paste(tile, (0, (TILE - tile.height) // 2))
    return flatten_blacks(canvas.resize((MARK, MARK), Image.LANCZOS))


def build_card(mark: Image.Image) -> Image.Image:
    card = Image.new("RGB", CARD, (0, 0, 0))
    draw = ImageDraw.Draw(card)
    font = ImageFont.truetype(FONT, 96, index=1)  # index 1 = Helvetica Bold
    mark_px = 220
    gap = 48
    text = "Timadey"
    text_w = draw.textlength(text, font=font)
    x = int((CARD[0] - (mark_px + gap + text_w)) // 2)
    y = (CARD[1] - mark_px) // 2
    card.paste(mark.resize((mark_px, mark_px), Image.LANCZOS), (x, y))
    draw.text((x + mark_px + gap, CARD[1] // 2), text, font=font, fill=CREAM, anchor="lm")
    return card


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"missing source logo: {SOURCE} (commit it first)")

    mark = build_mark()
    IMAGES.mkdir(parents=True, exist_ok=True)

    outputs = [
        (IMAGES / "logo-mark.png", mark),
        (PUBLIC / "favicon-32x32.png", mark.resize((32, 32), Image.LANCZOS)),
        (PUBLIC / "favicon-16x16.png", mark.resize((16, 16), Image.LANCZOS)),
        (PUBLIC / "apple-touch-icon.png", mark.resize((180, 180), Image.LANCZOS)),
        (IMAGES / "og-card.png", build_card(mark)),
    ]
    for path, image in outputs:
        image.save(path, optimize=True)
    mark.save(PUBLIC / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])

    for path in [p for p, _ in outputs] + [PUBLIC / "favicon.ico"]:
        size = path.stat().st_size
        if size == 0:
            raise SystemExit(f"generated empty file: {path}")
        print(f"{path.relative_to(ROOT)}: {size} bytes")


if __name__ == "__main__":
    main()
