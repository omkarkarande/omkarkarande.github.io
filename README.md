# omi portfolio

A static portfolio for GitHub Pages. Visitors need no package installation or external services. The selected Hairline figures are bundled locally during development; the generated bundle is checked in.

## Content and design

- Edit introduction, experience, projects, and contact links in `index.html`.
- `css/style.css` defines the ivory/forest editorial layout, oversized serif headings, architectural portrait scaffold, and staggered project plates.
- Fraunces and Source Sans 3 are self-hosted, with licenses in `res/fonts/`.
- The chosen **Baseline portrait** is `res/images/portrait-magic.webp`, unchanged from the Design Lab. `js/portrait-motion.js` and `css/portrait-motion.css` retain the approved local texture scan: 14 seconds, 18% opacity, contrast 1.6, with the same clipping keyframes. This is local presentation over an ASCII Magic still, not an animated service export.
- Local motion is enabled by default when the portrait is visible. A keyboard-accessible Pause/Resume button preserves the visitor's paused state across visibility and reduced-motion changes. Motion suspends offscreen and in hidden tabs; reduced-motion and no-JavaScript visitors get the static baseline. Print hides animation and its controls.
- The temporary Design Lab, effect selector, checkbox, and effect URL switching are removed. Old `?effect=` links simply show the baseline. Archived comparison assets and provenance remain on disk but are never requested by the page.
- On mobile, introduction and project links precede the portrait.
- Six local Hairline figures enhance the experience/projects. Chess uses abstract pieces on a turntable, distinct from Game Mods' branch graph and never a phone. Transparent, distinct static SVG illustrations remain visible without JavaScript and under reduced motion. See `ILLUSTRATIONS.md`.

## Navigation

The site is a normal vertically scrolling document. Native fragment links, browser history, and legacy anchors work with or without JavaScript. `js/main.js` updates the year and current navigation marker; it does not intercept scrolling. Print includes every section.

Professional summaries stay broad. Featured projects link to their public repositories; Game Mods links to the author's Nexus Mods profile.

## Build and checks

```sh
npm ci
npx playwright install chromium webkit
npm run build
npm run format:check
TEST_BROWSERS=chromium,webkit npm test
```

`npm run format` formats the maintained finalization files; generated bundles are built, not formatted. The formatter is pinned in `package-lock.json`.

Optional screenshot evidence (ignored by Git):

```sh
TEST_BROWSERS=chromium,webkit TEST_SCREENSHOTS="$PWD/test-evidence/final" npm test
```

Tests cover default/paused motion, runtime reduced motion, offscreen suspension, the hidden-document visibility event (simulated because headless tabs do not reliably change visibility), ignored legacy effect URLs, static/no-JS fallbacks, distinct Chess/Gaming geometry, keyboard input, responsive widths, transparent backgrounds, asset loading, preserved prose and external links, WCAG axe checks, native navigation/history, print, and font previews. Evidence includes desktop/mobile enhanced, no-JS, reduced-motion, and hero captures in both engines.

## Optional font studies

`variants.html` retains the earlier font-comparison tool. These are not the default design. Transcity, Runiga, and Mending are personal-use evaluation fonts: consult their notices and obtain appropriate licenses before commercial use. Historical artwork and unused studies are retained but not fetched by the default page.
