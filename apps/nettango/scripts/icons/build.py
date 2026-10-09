"""Render the NetTango icons from packages/vue-ui/assets/brands/.

NetTango-Mark.svg gives the site set in public/; NetTango-Icon.svg gives the
gradient product icon in brands/NetTango-Icon/.
Needs rsvg-convert and iconutil on PATH, and Pillow.
Usage: python3 scripts/icons/build.py [--contact-sheet PATH]
"""

import argparse
import io
import re
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw

APP = Path(__file__).resolve().parents[2]
BRANDS = APP.parents[1] / "packages/vue-ui/assets/brands"
SOURCE = BRANDS / "NetTango-Mark.svg"
ICON_SOURCE = BRANDS / "NetTango-Icon.svg"
ICON_OUT = BRANDS / "NetTango-Icon"
PUBLIC = APP / "public"
DARK = (0x26, 0x2B, 0x35, 255)

# Maskable icons crop to a circle of radius 0.4 x canvas; at 10/16 scale the
# mark's farthest corner sits at 0.36.
MASKABLE_SCALE = 0.625


def show(*group_ids):
    return "".join(f"#{g}{{display:inline}}" for g in group_ids)


def render(svg, size, css=""):
    with_css = svg.replace("</svg>", f"<style>{css}</style></svg>") if css else svg
    png = subprocess.run(
        ["rsvg-convert", "-w", str(size), "-h", str(size)],
        input=with_css.encode(),
        capture_output=True,
        check=True,
    ).stdout
    return Image.open(io.BytesIO(png)).convert("RGBA")


def maskable(svg):
    mark = re.search(r'<g id="mark">.*?</g>', svg, re.S).group(0)
    offset = 512 * (1 - MASKABLE_SCALE)
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">'
        '<rect width="1024" height="1024" fill="#FFFFFF"/>'
        f'<g transform="translate({offset} {offset}) scale({MASKABLE_SCALE})">{mark}</g>'
        "</svg>"
    )


def build_set(svg):
    outputs = {
        "favicon-16x16.png": render(svg, 16),
        "favicon-32x32.png": render(svg, 32),
        "apple-touch-icon.png": render(svg, 180, show("surface-light")).convert("RGB"),
        "android-chrome-192x192.png": render(svg, 192),
        "android-chrome-512x512.png": render(svg, 512),
        "web-app-manifest-192x192.png": render(maskable(svg), 192).convert("RGB"),
        "web-app-manifest-512x512.png": render(maskable(svg), 512).convert("RGB"),
    }
    for name, image in outputs.items():
        image.save(PUBLIC / name, optimize=True)
    outputs["favicon-32x32.png"].save(
        PUBLIC / "favicon.ico",
        sizes=[(16, 16), (32, 32)],
        append_images=[outputs["favicon-16x16.png"]],
    )


def build_icon(svg):
    ICON_OUT.mkdir(exist_ok=True)
    for size in (1024, 512, 256, 128):
        render(svg, size).save(ICON_OUT / f"NetTango-Icon-{size}.png", optimize=True)
    with tempfile.TemporaryDirectory() as tmp:
        iconset = Path(tmp) / "NetTango.iconset"
        iconset.mkdir()
        for size in (16, 32, 128, 256, 512):
            render(svg, size).save(iconset / f"icon_{size}x{size}.png")
            render(svg, size * 2).save(iconset / f"icon_{size}x{size}@2x.png")
        subprocess.run(["iconutil", "-c", "icns", str(iconset), "-o", str(ICON_OUT / "NetTango-Icon.icns")], check=True)


def contact_sheet(svg, icon_svg, path):
    sizes = [16, 32, 64, 128, 256]
    gap = 24
    row_h = max(sizes) + 2 * gap
    width = sum(sizes) + 48 * 8 + gap * (len(sizes) + 3)
    sheet = Image.new("RGBA", (max(width, 1024 + 2 * gap), 3 * row_h + 1024 + 2 * gap), (255, 255, 255, 255))
    ImageDraw.Draw(sheet).rectangle([0, row_h, sheet.width, 2 * row_h], fill=DARK)
    for row in range(2):
        x = gap
        for size in sizes:
            icon = render(svg, size)
            y = row * row_h + (row_h - size) // 2
            sheet.alpha_composite(icon, (x, y))
            x += size + gap
        for size in (16, 32):
            zoomed = render(svg, size).resize((size * 8, size * 8), Image.NEAREST)
            sheet.alpha_composite(zoomed, (x, row * row_h + (row_h - size * 8) // 2))
            x += size * 8 + gap
    x = gap
    for size in sizes:
        sheet.alpha_composite(render(icon_svg, size), (x, 2 * row_h + (row_h - size) // 2))
        x += size + gap
    overlay = render(svg, 1024, show("surface-light", "keylines"))
    sheet.alpha_composite(overlay, (gap, 3 * row_h + gap))
    path.parent.mkdir(parents=True, exist_ok=True)
    sheet.convert("RGB").save(path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--contact-sheet", type=Path)
    args = parser.parse_args()
    svg = SOURCE.read_text()
    icon_svg = ICON_SOURCE.read_text()
    build_set(svg)
    build_icon(icon_svg)
    if args.contact_sheet:
        contact_sheet(svg, icon_svg, args.contact_sheet)


if __name__ == "__main__":
    main()
