# omi portfolio

A static portfolio built for GitHub Pages. No build step or production dependencies.

## Content and design

- Edit the introduction, experience, projects, and contact links in `index.html`.
- `css/style.css` implements the **magzinize** editorial composition: serif headlines, asymmetrical spreads, thin rules, marginal details, and illustrated project rows rather than cards. No background textures, gradients, or external services are loaded.
- The default edition is light, selected by `<html data-theme="light">`. Set that attribute to `dark` for the black-paper edition. Both token sets live in the stylesheet and share the same layout. There is intentionally no theme-switching UI or automatic system-theme override.
- Light tokens: paper `#f2eee5`, ink `#25231f`, muted `#686259`, rule `#c6bfb2`, accent `#974a32`. Dark tokens: paper `#000`, ink `#f3f0e7`, muted `#a6a69c`, rule `#383a34`, accent `#d99376`.
- Fraunces is the default display serif; Source Sans 3 is the body face. Both are self-hosted WOFF2 fonts with their SIL Open Font Licenses retained in `res/fonts/`. The default page does not request the personal-use evaluation fonts.
- The portrait is `res/images/profile-transparent.webp`, generated from the supplied portrait photo. Original assets and edit notes are retained. Light mode blends the illustration into the paper; dark mode displays its original tones without inversion. Project sketches retain their original colours, on light paper plates in the dark edition.
- Below 601px, the portrait precedes “I Build.” and remains left aligned with its existing 8px left nudge. Landing labels and captions intentionally remain absent.

Professional summaries remain intentionally broad. Daily Paper and the other featured apps link to their public repositories; Game Mods links to the author's Nexus Mods profile.

## Reader behavior

`js/main.js` enhances the four sections into a horizontal reader:

- Previous/next buttons, arrow keys, touch swipes, and horizontal trackpad gestures move between pages. Links and history preserve fragment navigation; older fragment aliases still resolve.
- Native touch scrolling and snapping handle touchscreen movement. Explicit links, keyboard navigation, and wheel gestures choose exact pages without native snapping. A new pointer gesture restores snapping; this avoids WebKit restoring an obsolete snap target after explicit navigation.
- Vertical scrolling remains native within long pages. Home/End scroll the focused article; outside the article, they navigate to the first/last page.
- Paging controls preserve each sheet's reading position. Content links return to its heading and move focus there. Offscreen pages are inert and excluded from the accessibility tree.
- Without JavaScript, all four sections form a normal scrolling document with working anchor links. Print renders every section in light ink on white paper without fixed controls or clipped scroll containers.
- Safe-area insets protect content and controls on notched devices. Reduced-motion preferences are respected; explicit navigation is instant.

## Checks

Development dependencies are Playwright and axe-core:

```sh
npm ci
npx playwright install chromium webkit
TEST_BROWSERS=chromium,webkit npm test
```

Optional screenshot evidence:

```sh
TEST_BROWSERS=chromium,webkit TEST_SCREENSHOTS=/absolute/path/to/evidence npm test
```

Tests cover repeated trackpad gestures, real Chromium touch input, keyboard focus, history, legacy fragments, scroll restoration, resize and safe-area behavior, portrait placement, local assets, print, and no-JavaScript reading. Edition tests exercise light/dark layouts at 320, 390, 768, and 1440px, check identical geometry, reachable content endings, visible keyboard focus, and run axe WCAG checks in Chromium. Screenshots include every section and the bottom of the projects sheet. Firefox can be selected with `TEST_BROWSERS=firefox` if its engine is installed.

## Optional font studies

`variants.html` retains the earlier font-comparison tool, with explicit `?font=transcity`, `?font=quivert`, `?font=runiga`, and `?font=mending` previews. These are not the default design. Transcity, Runiga, and Mending are personal-use evaluation fonts: consult their notices and obtain the appropriate web/professional license before using those variants commercially. Original font files, historical border artwork, and unused sketches are retained but are not fetched by the default page.
