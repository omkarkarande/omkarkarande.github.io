# omi portfolio

A static portfolio built for GitHub Pages. No build step or external JavaScript libraries are needed.

## Update the content

- Edit the introduction, projects, experience, and contact links in `index.html`.
- Adjust the warm paper palette, Transcity display typography, and spacing in `css/style.css`. The subtle grain is `res/images/paper-grain.svg`.
- `js/main.js` powers the four-page portfolio reader: previous/next controls, keyboard and swipe navigation, URL history, and the footer year. Without JavaScript, all pages remain readable as a scrolling document.
- The portrait illustration is `res/images/profile-engraving-trimmed.png`, generated from the supplied portrait photo. Its edit prompt is saved alongside the image. The four project sketches are SVG files in `res/images/`.

The featured project links point to public GitHub repositories. The professional summaries are intentionally broad so they can be reviewed for a public audience before publishing.

Fonts are self-hosted in `res/fonts/`. Transcity is the display face; the supplied file is a personal-use font for local evaluation. Obtain the appropriate professional/web license before publishing it (see `res/fonts/Transcity-NOTICE.txt`). Fraunces is the fallback for glyphs absent from Transcity; Source Sans 3 remains the body face. These two fallback/body families retain their SIL Open Font Licenses. No external font service or build process is required.

The original botanical and mechanical border is `res/images/engraved-border.png`, made with the built-in image generation tool. Its full generation prompt is in `res/images/engraved-border.prompt.txt`.

The reader uses the viewport height. On short screens or at high zoom, an individual page can scroll so no content is clipped. Reduced-motion settings disable page transitions. Printing includes all pages.

Font comparisons are available at `variants.html`. Each full portfolio variant can also be opened with `index.html?font=transcity`, `?font=quivert`, `?font=runiga`, or `?font=mending`. All variants share the same content, layout, and navigation. The default is Transcity. Runiga and Mending are personal-use evaluation fonts; see their notices in `res/fonts/` for licensing details.

Swipe horizontally with a trackpad or touchscreen to change sections. Trackpad momentum is limited to one section per gesture; vertical scrolling remains available within long pages.
