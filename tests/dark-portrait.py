"""Regression: skin is open inkwork, not a pale opaque cutout."""
from pathlib import Path
from PIL import Image, ImageStat

root = Path(__file__).resolve().parents[1] / "res/images"
light = Image.open(root / "portrait-magic.webp").convert("RGBA")
dark = Image.open(root / "portrait-magic-dark.webp").convert("RGBA")
assert dark.size == light.size == (1500, 1500)
assert dark.getchannel("A").tobytes() == light.getchannel("A").tobytes()
for name, image in [("light", light), ("dark", dark)]:
    alpha = image.getchannel("A")
    # Interior forehead and cheeks must let the actual page surface through.
    for box in [(680, 350, 830, 430), (610, 660, 680, 750)]:
        mean = ImageStat.Stat(alpha.crop(box)).mean[0]
        assert mean < 65, f"{name}: opaque skin in {box}: {mean:.1f}"
    assert alpha.getpixel((0, 0)) == 0
    assert alpha.getextrema()[1] > 200, "Keep strong defining ink strokes"
highlight = max(max(r, g, b) for r, g, b, a in dark.getdata() if a > 200)
assert highlight < 130, f"Dark portrait ink too pale: {highlight}"
print(f"Both portraits: transparent skin, matching alpha, retained ink; dark peak {highlight}/255")
