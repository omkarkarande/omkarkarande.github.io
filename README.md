# omi portfolio

A static portfolio built for GitHub Pages. No build step or external JavaScript libraries are needed.

## Update the content

- Edit the introduction, projects, experience, and contact links in `index.html`.
- Adjust the warm paper palette, Transcity display typography, and spacing in `css/style.css`. The subtle grain is `res/images/paper-grain.svg`.
- `js/main.js` powers the four-page portfolio reader: previous/next controls, keyboard navigation and native scroll snapping, URL history, and the footer year. Without JavaScript, all pages remain readable as a scrolling document.
- The portrait illustration is `res/images/profile-transparent.webp`, generated from the supplied portrait photo. The transparent PNG is retained. The image uses a real alpha channel, so it does not rely on CSS blending inside Safari’s scroll layers. Its edit prompt is saved alongside the image. The four project sketches are SVG files in `res/images/`.

The featured project links point to public GitHub repositories. The professional summaries are intentionally broad.

Fonts are self-hosted in `res/fonts/`. Transcity is the display face; the supplied file is a personal-use font for local evaluation. Obtain the appropriate professional/web license before publishing it (see `res/fonts/Transcity-NOTICE.txt`). Fraunces is the fallback for glyphs absent from Transcity; Source Sans 3 remains the body face. These two fallback/body families retain their SIL Open Font Licenses. No external font service or build process is required.

The border uses `res/images/engraved-border.webp`; its original is `res/images/engraved-border.png`, made with the built-in image generation tool. Its full generation prompt is in `res/images/engraved-border.prompt.txt`.

The reader uses the viewport height. On short screens or at high zoom, an individual page can scroll so no content is clipped. Button and keyboard navigation are instant; there are no scripted motion effects. Printing includes all pages.

Font comparisons are available at `variants.html`. Each full portfolio variant can also be opened with `index.html?font=transcity`, `?font=quivert`, `?font=runiga`, or `?font=mending`. All variants share the same content, layout, and navigation. The default is Transcity. Runiga and Mending are personal-use evaluation fonts; see their notices in `res/fonts/` for licensing details.

Swipe horizontally with a trackpad or touchscreen to change sections. The browser handles momentum and snapping without custom wheel or touch locks. Vertical scrolling remains available within long pages. Offscreen pages are inert so keyboard focus and screen readers stay on the current section.

## Checks

The site has no production dependencies. Playwright and axe are only used for development checks:

```sh
npm ci
npx playwright install chromium webkit
TEST_BROWSERS=chromium,webkit npm test
```

The tests start a temporary local static server and cover repeated native trackpad scrolling, touchscreen swipes, vertical scrolling, keyboard focus, history and deep links, responsive layout, resize alignment, font requests, WCAG accessibility checks, comparison previews, print and no-JavaScript fallbacks. Set `TEST_BROWSERS=firefox` to run against Firefox when its test engine is installed.

The viewport uses `viewport-fit=cover`. Safe-area insets pad the content while fixed artwork extends to the viewport edges; Safari retains control of its toolbar.
