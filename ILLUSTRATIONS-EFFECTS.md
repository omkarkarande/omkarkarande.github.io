# ASCII Magic portrait comparison exports

All six treatments in `res/images/effects/manifest.json` were rendered by the authenticated ASCII Magic MCP `stylize_image` service, not synthesized by a local filter. The live account was confirmed **Free**, and `list_styles(free_only=true)` confirmed access before rendering. No subscription, payment, or Pro gate was used. The public label **Voxel** maps to engine style ID **`3d`**.

## Files and integration contract

- `res/images/effects/manifest.json`: six `effects` entries in requested comparison order; each has `id`, `label`, `engine_style_id`, `file`, site-root `src`, `raw_file`, `width`, `height`, `motion_type`, `animated`, `static_fallback`, alpha status, hashes, and service provenance.
- `portrait-{dither,dots,voxel,characters,lines,cross}.webp`: finished 1500 × 1500 browser assets.
- `portrait-*-service.png`: untouched 2508 × 2508 PNG downloads from the real service. They are retained for provenance and exact offline refinishing; do not load these large originals in the selector.
- `portrait-source-ivory.png`: exact opaque image uploaded to the service.
- `service-records.json`: actual service response text, parameters, output hash, and download timestamp. Returned signed upload URLs and credentials are not recorded. Public render URLs expire; local originals are authoritative.
- `free-styles.txt`: actual free-style availability response.
- `comparison-contact-sheet.jpg`: six-way visual inspection sheet.

## Animation limitation

The discovered `stylize_image` schema supports still-image settings and PNG export. It exposes no animation, timeline, frame sequence, GIF, or video option. **All six are genuine service stills.** No locally fabricated animation is represented as a service export. The manifest explicitly records `motion_type: "static"` and `animated: false`, with each WebP also its static fallback. UI transitions, if added separately, are presentation effects, not service animation.

## Source and finishing

The existing `res/images/profile-transparent.webp` was alpha-composited onto ivory `#f6f4ee` before upload. All treatments use curated variant 0, scale 2, explicit per-style cell sizes, and disabled character bloom/scanlines. Dither requests monochrome Atkinson but the curated service look also applies its own chromatic post effect, which is preserved and recorded. Other service dressing is preserved as returned.

The finishing helper restores the original alpha silhouette to Dither, Dots, Characters, Lines, and Cross, then downsamples to 1500px WebP at quality 92. It does not re-render the effects or recolor service output. Voxel retains its service background so peripheral 3D marks are not inadvertently cut off.

Visual inspection found all six portraits intact and recognizable. Voxel, Dither, and Lines have the boldest differences; Dots, Characters, and Cross are subtler textures that benefit from a larger comparison view. Voxel has a visible light rectangle; this is intentional preservation, not a failed transparent export.

## Reproduce

Offline refinishing requires Python with Pillow and the checked-in raw originals:

```sh
python3 scripts/generate-magic-effects.py --finish-only
```

For fresh service renders, run `scripts/generate-magic-effects.py` with the managed Python interpreter of the authenticated Hermes installation (the helper imports `hermes_bootstrap` to activate its packages). On this installation the following command was exercised successfully:

```sh
python3 -c 'import subprocess; from pathlib import Path; runtime=next((Path.home()/".hermes/tools").glob("python-*/bin/python3")); raise SystemExit(subprocess.call([str(runtime),"scripts/generate-magic-effects.py"]))'
```

The helper uses the existing authenticated `ascii-magic` registry integration, checks Free-plan access, uploads using the service-documented curl PUT method, renders sequentially, and immediately downloads each expiring PNG before requesting the next. It never reads or prints credentials and does not change auth configuration. `HERMES_AGENT_ROOT` can specify a different Hermes source installation. The active profile remains controlled by Hermes.

Hermes redacts long recipe payloads in tool response text, so `recipe` is deliberately null when the returned payload is truncated. The exact render parameters and source are preserved for repeat requests; service engine updates may change fresh rendering. The retained originals and `--finish-only` are the exact reproducible finishing route.

## Finalized portrait

The temporary Design Lab has been removed after selection of the unchanged
baseline `res/images/portrait-magic.webp` with local motion enabled. The selector,
opt-in checkbox, effect URL handling, and temporary lab CSS/JS are gone. Old
`?effect=` URLs no longer switch the image. The six comparison exports remain as
archived studies and provenance; none are requested by the shipped page.

`js/portrait-motion.js` and `css/portrait-motion.css` preserve the approved local
texture-contrast scan (14s linear, opacity .18, contrast 1.6, unchanged clip-path
keyframes). A Pause/Resume button remains. Reduced motion disables the scan;
offscreen/hidden documents suspend it; no-JS visitors retain the static baseline
and see no unusable controls. This is not native ASCII Magic animation.

Service URLs and opaque recipe payloads are removed from public provenance. Raw
local PNGs and hashes remain the reproducible source of truth. Chromium and
WebKit tests now cover the finalized default, ignored legacy effect URLs,
keyboard pause, lifecycle suspension, static fallbacks, and preserved content.
