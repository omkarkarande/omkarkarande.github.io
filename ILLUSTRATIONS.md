# Portfolio illustration assets

## ASCII hero — human / machine

`res/images/portrait-ascii.svg` is an original, locally generated character
composition. It samples the existing `profile-transparent.webp` portrait into
literal ASCII glyphs, surrounded by original organic contour rings, registration
marks, coordinate rails, and an isometric branching diagram. This is actual SVG
text, not a dither bitmap or embedded raster. The original portrait is unchanged.

It is **not an ASCII Magic or MCP export**. No portrait was uploaded, no MCP was
configured, and no external generation service was used. The composition and
Pillow generator are local fallback assets; an MCP-derived asset can be evaluated
separately later without changing the page's copy or navigation.

Regenerate from any directory with Pillow installed:

    python3 scripts/generate-portrait-ascii.py

The SVG is served directly as an accessible image, with intrinsic dimensions and
high fetch priority. It renders with no JavaScript and no runtime font download.
A small CSS hover shift is available only for hover-capable pointers when reduced
motion is not requested. There is no automatic animation, frame loop, canvas, or
pointer tracking in the hero. Sparse text rows deliberately avoid SVG
`lengthAdjust="spacingAndGlyphs"`, which can stretch glyphs when whitespace is
collapsed. Explicit preserved whitespace keeps the character grid consistent.

## Hairline

`js/hairline.js` mounts six instances using five selected exports from
`@lucasmarkes/hairline` 0.3.0: server cabinet for experience; reading cards,
branches, terrain, exploded window, and branches for the five projects.

Chess uses the library's branching graph as a **visual analogy for game-search
variations**, not a claim that Hairline ships a chess engine or a chess-specific
figure. The original static chessboard and pieces remain its no-JS/reduced-motion
fallback. Game Mods retains the graph's native code-history meaning.

Project containers are transparent against ivory. Object faces use paper-colored
fills to occlude hidden edges; they are not rectangular background panels. Dark
ink and sage secondary strokes replace the previous inverse-on-green palettes.
The dark experience cabinet retains its distinct palette. The newspaper and
terrain static fallback annotations were darkened for the ivory background.

Run `npm ci && npm run build` after changing the integration. The generated
`js/hairline.bundle.js` is served by GitHub Pages; no CDN, React, or runtime package
installation is required. Removing the unrelated phone also reduces the bundle.

Colours are set by the `--hairline-*` properties in `css/style.css`.
Reduced-motion users get the original static SVG illustrations, even when their
preference changes during a visit. They also remain the no-JS fallback.
Hairline's MIT notice is retained in `res/licenses/hairline-LICENSE.txt`.

## Previous portrait texture

`res/images/profile-dither.webp` and `scripts/generate-portrait-dither.py` are
retained as previous local treatments; the hero no longer uses that bitmap.
The dither is not an ASCII Magic export either.

## Verification

    npm run build
    TEST_BROWSERS=chromium,webkit npm test

Set `TEST_SCREENSHOTS` to a directory for desktop/mobile rendered evidence.
The suite checks real ASCII text, undistorted glyphs, no-JS rendering, transparent
project containers, figure mappings, preserved prose and destinations, responsive
geometry, accessibility, native navigation, keyboard input, print, and runtime
reduced-motion preference changes.
