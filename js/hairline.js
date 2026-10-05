// Selected vanilla ESM figures; bundled locally, no runtime CDN or framework.
/*! Hairline © 2026 Lucas Marques, MIT. See /res/licenses/hairline-LICENSE.txt. */
import { cabinet, riffle, terrain, exploded, branches } from '@lucasmarkes/hairline';

const figures = { cabinet, riffle, terrain, exploded, branches };
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const mounted = new Map();

function syncMotion() {
  if (motion.matches) {
    // Hairline's own reduced-motion mode still answers pointer input.
    // Destroy the engines entirely, including their listeners and RAFs.
    for (const handle of mounted.values()) handle.destroy();
    mounted.clear();
    return;
  }
  for (const element of document.querySelectorAll('[data-figure]')) {
    if (mounted.has(element)) continue;
    mounted.set(element, figures[element.dataset.figure](element, {
      intensity: 0.3,
      theme: element.dataset.palette,
      label: element.getAttribute('aria-label'),
    }));
  }
}
motion.addEventListener('change', syncMotion);
syncMotion();
