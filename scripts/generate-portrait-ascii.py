#!/usr/bin/env python3
"""Original character-engraving composition, locally generated with Pillow.

Samples the existing portrait, then composes it with original ASCII contour
fields and a small isometric system diagram. Not an ASCII Magic/MCP export.
No upload, runtime canvas, raster embedding, random seed, or network required.
Run: python3 scripts/generate-portrait-ascii.py (Pillow required only to rebuild).
"""
from pathlib import Path
from html import escape
from math import sin, cos, pi
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
COLS, ROWS = 116, 88
CELL_X, CELL_Y = 6, 9
INK, RUST, FAINT = '#213c32', '#a34227', '#9ba08e'


def generate():
    canvas = [[' ' for _ in range(COLS)] for _ in range(ROWS)]
    colors = [[INK for _ in range(COLS)] for _ in range(ROWS)]

    def put(x, y, char, color=INK):
        if 0 <= x < COLS and 0 <= y < ROWS:
            canvas[y][x], colors[y][x] = char, color

    def label(x, y, text, color=RUST):
        for i, char in enumerate(text):
            put(x + i, y, char, color)

    # Hand-composed topology: imperfect concentric character contours.
    for ring in range(6):
        for step in range(500):
            t = step / 500 * 2 * pi
            x = round(57 + (46 + ring * 2.1) * cos(t) + 2 * sin(3 * t))
            y = round(42 + (29 + ring * 1.7) * sin(t) + 2 * cos(4 * t))
            if (step + ring * 13) % 19 < 13:
                put(x, y, '.:~'[ring % 3], FAINT)

    # Portrait is sampled as actual characters, not an ordered-dither texture.
    source = Image.open(ROOT / 'res/images/profile-transparent.webp').convert('RGBA')
    white = Image.new('RGBA', source.size, 'white')
    white.alpha_composite(source)
    small = ImageOps.autocontrast(white.convert('L')).resize((78, 70), Image.Resampling.LANCZOS)
    alpha = source.getchannel('A').resize((78, 70), Image.Resampling.LANCZOS)
    ramp = ' .,:;irsXA253hMHGS#9B&@'
    tones = small.tobytes()
    opacity = alpha.tobytes()
    for y in range(70):
        for x in range(78):
            if opacity[y * 78 + x] > 45:
                darkness = (255 - tones[y * 78 + x]) / 255
                char = ramp[round(darkness ** .8 * (len(ramp) - 1))]
                put(x + 19, y + 7, char)

    # Registration marks, coordinate rails and an original system sketch.
    for x, y in [(2, 4), (112, 4), (2, 81), (112, 81)]:
        label(x - 1, y, '-+-')
        put(x, y - 1, '|', RUST)
        put(x, y + 1, '|', RUST)
    for y in range(15, 72, 7):
        label(2, y, '+--', FAINT)
    for y in range(19, 65):
        put(108, y, ':' if y % 4 else '+', RUST)
    label(96, 17, 'x / y / z')
    diagram = ['    +------+', '   /      /|', '  +------+ |', '  |      | +', '  |      |/', '  +------+', '      |', '  +---+---+', '  |       |', ' [+]     [+]']
    for y, line in enumerate(diagram):
        label(91, 66 + y, line)
    label(8, 80, '01001111 / 01001011', FAINT)
    label(8, 83, 'INPUT: HUMAN    /    OUTPUT: POSSIBILITIES', INK)
    label(83, 5, '[ HAND / MACHINE ]', RUST)

    svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="696" height="792" viewBox="0 0 696 792">', '<title>omi — an ASCII character engraving</title>', '<desc>A portrait composed of literal type, organic contour rings, registration marks and an isometric branching system.</desc>', '<g font-family="monospace" font-size="10" xml:space="preserve">']
    for y in range(ROWS):
        x = 0
        while x < COLS:
            start, color = x, colors[y][x]
            while x < COLS and colors[y][x] == color:
                x += 1
            text = ''.join(canvas[y][start:x])
            if text.strip():
                svg.append(f'<text x="{start * CELL_X}" y="{y * CELL_Y + 9}" fill="{color}" style="white-space:pre">{escape(text)}</text>')
    svg.extend(['</g>', '</svg>'])
    output = ROOT / 'res/images/portrait-ascii.svg'
    output.write_text('\n'.join(svg) + '\n')
    print(f'{output.relative_to(ROOT)}: {output.stat().st_size} bytes; {COLS} × {ROWS} character composition')


if __name__ == '__main__':
    generate()
