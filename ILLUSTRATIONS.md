# Portfolio illustrations

The minimal portfolio uses ten local Hairline figures from `@lucasmarkes/hairline` 0.3.0. Experience uses loupe (memories), cabinet (photo platform), router (reliable services), and drawer (video catalog). Their matching static SVGs are exported by `node scripts/export-experience.cjs`, with computed palette values embedded for no-JS and reduced-motion rendering.

The six project figures are:

| Project           | Library figure | Static fallback          |
| ----------------- | -------------- | ------------------------ |
| Fleu              | phone          | field-fleu-dark.svg      |
| Daily Paper       | riffle         | field-newspaper-dark.svg |
| reMarkable Chess  | turntable      | field-chess-dark.svg     |
| Kinetic Canvas    | terrain        | field-kinetic-dark.svg   |
| YouTube for macOS | exploded       | field-youtube-dark.svg   |
| Game Mods         | branches       | field-game-mods-dark.svg |

The live figures use grayscale `--hairline-*` tokens in `css/minimal.css`, with #060606 faces matching the page. Static illustrations are distinct project-specific drawings in `res/images/`, desaturated with CSS. They remain visible until a live SVG mounts and return when reduced motion tears down the engines. Printing uses the static artwork.

`js/hairline.js` is the source integration; `npm run build` updates the committed ESM bundle served directly by GitHub Pages. No runtime CDN, framework, or package installation is needed. The MIT notice remains in `res/licenses/hairline-LICENSE.txt`.

The portrait and architectural/editorial artwork are no longer displayed. Their source assets and generation scripts remain as historical material; the complete former design, provenance, and original tests are preserved on `magazine-design`.

Run `TEST_BROWSERS=chromium,webkit npm test` for rendering, asset, fallback and motion-lifecycle checks. Set `TEST_SCREENSHOTS` to capture desktop and mobile evidence.
