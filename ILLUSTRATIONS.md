# Portfolio illustration assets

## Hairline

`js/hairline.js` mounts six figures from `@lucasmarkes/hairline` 0.3.0:
server cabinet for experience; reading cards, layered device, terrain,
exploded window, and commit branches for the five projects.

Run `npm ci && npm run build` after changing the integration. Commit the
resulting `js/hairline.bundle.js`: GitHub Pages serves this static file;
no CDN, React, or runtime package installation is required.

Colours are set by the `--hairline-*` properties in `css/style.css`.
Reduced-motion users get the original static SVG illustrations, even when
their preference changes during a visit. They also remain the no-JS fallback.
Hairline's MIT notice is retained in `res/licenses/hairline-LICENSE.txt`.

## Portrait texture

`res/images/profile-dither.webp` is a locally generated, subtle dither
rendition of the existing transparent portrait. It is inspired by print and
ASCII Magic's image-treatment direction, not an export from ASCII Magic.
No portrait was uploaded to a third-party service.

Regenerate with Pillow installed:

    python3 scripts/generate-portrait-dither.py

The source portrait remains unchanged. The generator preserves its alpha.

## Verification

    npm run build
    TEST_BROWSERS=chromium,webkit npm test

Set `TEST_SCREENSHOTS` to a directory for desktop/mobile rendered evidence.
