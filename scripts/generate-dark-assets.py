"""Recolor existing character art and vector plates; never invert photographs.
Run with Python + Pillow. Extract transparent ink from the archived source.
"""
from pathlib import Path
import re
from PIL import Image, ImageOps

root = Path(__file__).resolve().parents[1] / "res/images"
source = Image.open(root / "portrait-magic-source.webp").convert("RGBA")
# Extract ink density from the immutable paper-filled print. Light skin becomes
# transparent negative space; contours/hatching retain their original coverage.
# Normalize against the original forest ink luminance (53), not pure black.
from PIL import ImageChops
ink = source.convert("L").point(
    [round(255 * (min(1, max(0, (245 - value) / 192)) ** 1.35)) for value in range(256)]
)
alpha = ImageChops.multiply(ink, source.getchannel("A"))
# 33 coverage levels retain soft strokes without shipping megabyte alpha noise.
alpha = alpha.point([min(255, round(value / 8) * 8) for value in range(256)])
portrait = Image.new("RGBA", source.size, "#213c32")
portrait.putalpha(alpha)
portrait.save(root / "portrait-magic.webp", lossless=True, method=6)

# Bright ink in shadow-shaped alpha produces a photographic negative on dark
# paper. Preserve source tonal order instead: near-black shadows and a faint,
# translucent sage highlight. Skin remains mostly open to the real background.
luminance = source.convert("L")
portrait = ImageOps.colorize(luminance, black="#060c08", white="#788970",
                           blackpoint=53, whitepoint=245).convert("RGBA")
dark_coverage = ink.point([round(40 + 215 * (value / 255) ** 3) for value in range(256)])
dark_alpha = ImageChops.multiply(dark_coverage, source.getchannel("A"))
dark_alpha = dark_alpha.point([min(255, round(value / 8) * 8) for value in range(256)])
portrait.putalpha(dark_alpha)
portrait.save(root / "portrait-magic-dark.webp", lossless=True, method=6)

palette = {
    "#213c32": "#dbe2cd", "#1b352d": "#dbe2cd",
    "#29463a": "#718d73", "#62685e": "#abb6a5",
    "#758477": "#8fa28a", "#78907a": "#8fa28a",
    "#a34227": "#c4b784", "#e5a184": "#c4b784",
    "#dc9b7a": "#c4b784", "#f2eee5": "#263a2e",
    "#edf0e3": "#354c3a", "#c5ccbb": "#48624b",
    "#d5dccc": "#48624b", "#c6cdbd": "#48624b",
    "#c7ccba": "#48624b", "#b7c3ae": "#647e60",
    "#e2e4d6": "#48624b",
}
for source in root.glob("field-*.svg"):
    if source.stem.endswith("-dark"):
        continue
    svg = re.sub(r"#[0-9a-fA-F]{6}", lambda m: palette.get(m[0], m[0]), source.read_text())
    source.with_stem(source.stem + "-dark").write_text(svg)
    print(source.with_stem(source.stem + "-dark").name)
print("portrait-magic-dark.webp")
