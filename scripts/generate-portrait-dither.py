#!/usr/bin/env python3
"""Generate the portfolio's restrained, locally inspired ordered-dither portrait.

This is NOT an ASCII Magic export and uses no upload, external service, AI redraw,
or literal terminal characters. It is a local Pillow treatment of the existing
sketch: a lightly blended Bayer halftone in soft midtones, with edge protection.
The original portrait, silhouette, dimensions, and alpha channel are retained.

Run from any directory: python3 scripts/generate-portrait-dither.py
Requires Pillow (tested with 11.3.0); no site/package dependency is added.
Output: res/images/profile-dither.webp (quality 92 RGB, lossless original alpha).

The muted forest tint is intentionally slight; the site's existing grayscale /
multiply CSS remains untouched and lets the surrounding ivory paper supply warmth.
"""
from pathlib import Path
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'res/images/profile-transparent.webp'
OUTPUT = ROOT / 'res/images/profile-dither.webp'
BAYER = ((0, 8, 2, 10), (12, 4, 14, 6), (3, 11, 1, 9), (15, 7, 13, 5))


def generate():
    source = Image.open(SOURCE).convert('RGBA')
    luminance = source.convert('L')
    edges = luminance.filter(ImageFilter.FIND_EDGES)
    output = source.copy()
    pixels, tones, outlines = source.load(), luminance.load(), edges.load()
    target = output.load()
    for y in range(source.height):
        for x in range(source.width):
            red, green, blue, alpha = pixels[x, y]
            if not alpha:
                continue
            tone = tones[x, y]
            # Keep highlights, deep ink, and fine high-contrast drawing intact.
            midtone = max(0.0, 1.0 - abs(tone - 142) / 105)
            protection = max(0.0, 1.0 - outlines[x, y] / 46)
            weight = 0.32 * midtone * protection
            threshold = (BAYER[(y // 3) % 4][(x // 3) % 4] + 0.5) / 16
            level = tone / 255 * 5
            quantized = min(5, int(level) + (level % 1 > threshold)) * 51
            delta = (quantized - tone) * weight
            # Small forest bias, not a duotone replacement of the graphite.
            ink = (1 - tone / 255) * 0.045
            channels = (red + delta - 8 * ink,
                        green + delta + 18 * ink,
                        blue + delta + 6 * ink)
            target[x, y] = tuple(max(0, min(255, round(c))) for c in channels) + (alpha,)
    assert output.getchannel('A').tobytes() == source.getchannel('A').tobytes()
    output.save(OUTPUT, 'WEBP', quality=92, method=6, exact=True)
    print(f'{OUTPUT.relative_to(ROOT)}: {output.width}x{output.height}, '
          f'{OUTPUT.stat().st_size:,} bytes, original alpha preserved')


if __name__ == '__main__':
    generate()
