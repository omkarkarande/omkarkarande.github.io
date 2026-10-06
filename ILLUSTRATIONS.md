# Portfolio illustration assets

## Current hero — ASCII Magic / architectural portrait

`res/images/portrait-magic.webp` uses a real `stylize_image` response from the
account-authorized ASCII Magic MCP, Characters style, variant 0, requested cell
size 32, scale 2, with scanLines and charBloom disabled. The existing transparent
portrait was composited onto ivory locally and uploaded using `create_upload`.
The service returned a 2508 × 2508 PNG. Its character treatment is fine and
print-like rather than chunky terminal typography. It is not a local renderer
being passed off as an MCP output.

Local finishing restores the original portrait alpha mask to remove the export's
rectangular character background, maps grayscale to forest ink, and saves a
1500 × 1500 WebP. `scripts/finish-magic-portrait.py` reproduces this finishing from
a downloaded export. Service download links expire; the finished asset is hosted
locally with no visitor-time API calls, credentials, or third-party requests.
The architectural SVG, organic silhouette, and typography are local web design.

The final baseline retains the Design Lab's local texture scan unchanged: a
second clipped impression, 14s linear, opacity .18, contrast 1.6. It is enabled
by default, not service animation. There are no motion controls; reduced
motion disables it; offscreen/hidden documents suspend it. The original image
remains static without JavaScript. Comparison controls and effect URL handling
have been removed; archived exports are documented in `ILLUSTRATIONS-EFFECTS.md`.

## Dark appearance

`python3 scripts/generate-dark-assets.py` generates `portrait-magic-dark.webp`
and six `field-*-dark.svg` plates locally from the existing finished assets.
This local finishing extracts ink density into alpha from the archived
`portrait-magic-source.webp`. Pale skin becomes transparent negative space in
both themes, retaining contours and hatching rather than an opaque face fill.
Light ink is forest (#213c32); dark ink is subdued sage (#687961). The backing
silhouette is transparent too, so the actual page background shows through.
Both variants use lossless WebP with identical coverage. SVG geometry is
unchanged; ink, faces, and annotations receive explicit palette replacements.
Source photographs are untouched.

`css/theme.css` selects these variants for both the static image and scan overlay,
including no-JavaScript system-dark mode. CSS `--hairline-*` tokens update mounted
SVG faces and strokes immediately without remounting the engines or losing focus.
Print restores the light images and hides live SVG overlays.

## Previous ASCII hero — human / machine

`res/images/portrait-ascii.svg` is an original, locally generated character
composition. It samples the existing `profile-transparent.webp` portrait into
literal ASCII glyphs, surrounded by original organic contour rings, registration
marks, coordinate rails, and an isometric branching diagram. This is actual SVG
text, not a dither bitmap or embedded raster. The original portrait is unchanged.

That previous SVG is **not an ASCII Magic or MCP export**. Its generation was
entirely local. It is retained as an earlier treatment rather than the current
hero image.

Regenerate from any directory with Pillow installed:

    python3 scripts/generate-portrait-ascii.py

The previous SVG was served directly as an accessible image, with intrinsic dimensions and
high fetch priority. It renders with no JavaScript and no runtime font download.
A small CSS hover shift is available only for hover-capable pointers when reduced
motion is not requested. There is no automatic animation, frame loop, canvas, or
pointer tracking in the hero. Sparse text rows deliberately avoid SVG
`lengthAdjust="spacingAndGlyphs"`, which can stretch glyphs when whitespace is
collapsed. Explicit preserved whitespace keeps the character grid consistent.

## Hairline

`js/hairline.js` mounts six instances using six selected exports from
`@lucasmarkes/hairline` 0.3.0: server cabinet for experience; reading cards,
turntable, terrain, exploded window, and branches for the five projects.

Chess uses the library's turntable: **geometric pieces on a rotating platform**
as a study of board positions, not a literal chess-specific library figure.
Its circular silhouette is distinct from Game Mods' elongated branching graph.
The original transparent static chessboard and pieces remain its distinct
no-JS/reduced-motion fallback. Game Mods retains the graph's code-history meaning.

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
The suite checks the local Magic export's WebP format, dimensions, transparency,
no-JS rendering, transparent project containers, figure mappings, preserved prose and destinations, responsive
geometry, accessibility, native navigation, keyboard input, print, and runtime
reduced-motion preference changes.
