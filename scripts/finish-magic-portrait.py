#!/usr/bin/env python3
"""Finish an actual ASCII Magic PNG export for this portfolio.

Usage: python3 scripts/finish-magic-portrait.py /path/to/downloaded-export.png
The MCP export supplies the character rendering. Local finishing restores the
original portrait's alpha mask, maps ink to forest green, and optimizes WebP.
"""
from pathlib import Path
import sys
from PIL import Image, ImageOps

root = Path(__file__).resolve().parents[1]
export = Image.open(sys.argv[1]).convert('RGB')
original = Image.open(root / 'res/images/profile-transparent.png').convert('RGBA')
alpha = original.getchannel('A').resize(export.size, Image.Resampling.LANCZOS)
finished = ImageOps.colorize(ImageOps.grayscale(export), '#213c32', '#ffffff')
finished.putalpha(alpha)
finished = finished.resize((1500, 1500), Image.Resampling.LANCZOS)
output = root / 'res/images/portrait-magic.webp'
finished.save(output, quality=80, method=6)
print(f'{output}: {output.stat().st_size} bytes, {finished.size}, alpha restored')
