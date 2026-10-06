"""Regression: transparent skin and natural, never negative, tonal order."""
from pathlib import Path
from PIL import Image, ImageStat

root = Path(__file__).resolve().parents[1] / "res/images"
light = Image.open(root / "portrait-magic.webp").convert("RGBA")
dark = Image.open(root / "portrait-magic-dark.webp").convert("RGBA")
source = Image.open(root / "portrait-magic-source.webp").convert("RGBA")
assert dark.size == light.size == (1500, 1500)
for name, image, background in [("light", light, "#f2eee5"), ("dark", dark, "#171c18")]:
    alpha = image.getchannel("A")
    for box in [(680, 350, 830, 430), (610, 660, 680, 750)]:
        mean = ImageStat.Stat(alpha.crop(box)).mean[0]
        assert mean < 65, f"{name}: opaque skin in {box}: {mean:.1f}"
    assert alpha.getpixel((0, 0)) == 0
    assert alpha.getextrema()[1] > 200
    rendered = Image.alpha_composite(Image.new("RGBA", image.size, background), image).convert("L")
    shadows, highlights = [], []
    for original, value in zip(source.getdata(), rendered.getdata()):
        r, g, b, a = original
        if a < 250:
            continue
        if g < 80:
            shadows.append(value)
        elif g > 210:
            highlights.append(value)
    shadow = sum(shadows) / len(shadows)
    highlight = sum(highlights) / len(highlights)
    assert highlight > shadow + 10, f"{name}: inverted tonal order: shadow {shadow:.1f}, highlight {highlight:.1f}"
    print(f"{name}: transparent skin; natural tonal order {shadow:.1f} < {highlight:.1f}")
