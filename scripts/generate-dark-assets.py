"""Recolor existing character art and vector plates; never invert photographs.
Run with Python + Pillow. Source assets and their alpha/geometry stay intact.
"""
from pathlib import Path
import re
from PIL import Image, ImageOps

root = Path(__file__).resolve().parents[1] / "res/images"
source = Image.open(root / "portrait-magic.webp").convert("RGBA")
# Preserve tonal ordering without the pale paper highlights of the light print.
# Deep forest shadows and restrained sage highlights blend with the dark hero.
portrait = ImageOps.colorize(source.convert("L"), "#1c2a21", "#819581")
portrait.putalpha(source.getchannel("A"))
portrait.save(root / "portrait-magic-dark.webp", quality=92, method=6)

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
