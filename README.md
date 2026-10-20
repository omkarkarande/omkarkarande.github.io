# omi portfolio

A minimal, dark-only static portfolio. GitHub Pages serves `master`; `magazine-design` preserves the previous master at `57f989561ac8b968ba17ef8e2a902ccc228651c5`.

## Design and content

- `index.html`: oversized name, experience list, six projects, education and contact links. Existing professional/project copy and destinations are preserved.
- `css/minimal.css`: #101010 background, monochrome typography, thin row separators and responsive layouts.
- Anton is self-hosted in `res/fonts/anton-regular.woff2`, with Impact as a fallback. The original font is from Google Fonts' `ofl/anton/Anton-Regular.ttf`; its SIL Open Font License is included as `Anton-OFL.txt`. WOFF2 conversion preserves the full character set.
- Six small Hairline illustrations accompany the projects. They are bundled locally; no runtime third-party requests are required.
- There is no portrait, theme switch, scroll hijacking, or font-selection UI. All navigation is native HTML. The site works without JavaScript.
- Reduced motion uses static SVG fallbacks. Live changes tear down/remount Hairline. Print switches to white paper and static illustrations.

## Build and verification

```sh
npm ci
npx playwright install chromium webkit
npm run build
npm run format:check
TEST_BROWSERS=chromium,webkit npm test
```

The tests cover the dark-only layout, source-copy preservation against `magazine-design`, six project destinations and figures, 320/390/768/1440px widths, native fragments/history, fonts/assets, no-JS, reduced-motion teardown/remount, print, and WCAG axe checks. Fetch the archive branch if testing from a single-branch clone.

```sh
TEST_BROWSERS=chromium,webkit TEST_SCREENSHOTS="$PWD/test-evidence/minimal" npm test
```

Historical artwork and generation scripts remain as source material but are not loaded by the current page. Full prior design code and its original tests are preserved on `magazine-design`.
