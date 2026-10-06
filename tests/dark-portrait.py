"""Regression: dark portrait keeps its silhouette without pale paper highlights."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1] / "res/images"
light = Image.open(root / "portrait-magic.webp").convert("RGBA")
dark = Image.open(root / "portrait-magic-dark.webp").convert("RGBA")
assert dark.size == light.size
assert dark.getchannel("A").tobytes() == light.getchannel("A").tobytes()
highlight = max(max(r, g, b) for r, g, b, a in dark.getdata() if a > 200)
assert highlight < 175, f"Dark portrait highlights too pale: {highlight}"
print(f"Dark portrait: matching alpha and dimensions; peak highlight {highlight}/255")
