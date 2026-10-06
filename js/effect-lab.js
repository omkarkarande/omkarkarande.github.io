/* Temporary local comparison lab. Exports match effects/manifest.json.
   Deliberately no runtime provenance fetch, third-party URLs, or persistence. */
(() => {
  const lab = document.querySelector('.effect-lab');
  if (!lab) return;
  const select = lab.querySelector('select');
  const status = document.querySelector('#effect-status');
  const image = document.querySelector('.ascii-portrait');
  const original = { src: image.getAttribute('src'), alt: image.alt };
  // A second, clipped impression scans the existing ink texture. No image wobble,
  // frame loop, canvas, or extra export; the selected asset is already cached.
  const surface = document.createElement('div');
  surface.className = 'portrait-surface';
  image.before(surface);
  surface.append(image);
  const scan = document.createElement('img');
  scan.className = 'portrait-image portrait-scan';
  scan.src = original.src;
  scan.alt = '';
  scan.setAttribute('aria-hidden', 'true');
  scan.hidden = true;
  surface.append(scan);
  const motion = document.querySelector('#local-motion');
  const pause = document.querySelector('#pause-motion');
  const motionStatus = document.querySelector('#motion-status');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = false;
  let visible = false;
  function updateMotion() {
    const state = !motion.checked ? 'off' : reduced.matches ? 'reduced' : paused ? 'paused' : (!visible || document.hidden) ? 'suspended' : 'running';
    surface.dataset.motion = state;
    scan.hidden = ['off', 'reduced', 'suspended'].includes(state);
    if (motion.checked && scan.getAttribute('src') !== image.getAttribute('src')) scan.src = image.getAttribute('src');
    pause.disabled = !motion.checked || reduced.matches;
    pause.textContent = paused ? 'Resume motion' : 'Pause motion';
    const messages = {
      off: 'Off — optional local texture scan, not an animated export.',
      reduced: 'Off — respecting your reduced-motion preference.',
      paused: 'Paused — local texture scan.',
      suspended: 'Suspended — portrait or tab out of view.',
      running: 'On — local texture scan, not an animated export.'
    };
    motionStatus.textContent = messages[state];
  }
  motion.addEventListener('change', () => { paused = false; updateMotion(); });
  pause.addEventListener('click', () => { paused = !paused; updateMotion(); });
  reduced.addEventListener('change', updateMotion);
  document.addEventListener('visibilitychange', updateMotion);
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    updateMotion();
  });
  observer.observe(surface);
  updateMotion();
  const ids = new Set([...select.options].map(option => option.value));
  let version = 0;
  let current = 'baseline';
  const label = id => [...select.options].find(option => option.value === id).textContent;
  const fromURL = () => {
    const id = new URL(location.href).searchParams.get('effect');
    return ids.has(id) ? id : 'baseline';
  };
  const updateURL = id => {
    const url = new URL(location.href);
    if (id === 'baseline') url.searchParams.delete('effect');
    else url.searchParams.set('effect', id);
    history.replaceState(history.state, '', url);
  };
  async function choose(id, share = false) {
    const request = ++version;
    select.value = id;
    const src = id === 'baseline' ? original.src : `res/images/effects/portrait-${id}.webp`;
    status.textContent = `Loading ${label(id)}…`;
    lab.setAttribute('aria-busy', 'true');
    try {
      const next = new Image();
      next.src = src;
      await next.decode();
      if (request !== version) return;
      image.src = src;
      image.alt = id === 'baseline' ? original.alt : `${label(id)} portrait of omi, an ASCII Magic still within an architectural line drawing`;
      current = id;
      updateMotion();
      status.textContent = id === 'baseline' ? 'Baseline — current portrait.' : `${label(id)} — static ASCII Magic export.`;
      if (share) updateURL(id);
    } catch {
      if (request !== version) return;
      select.value = current;
      status.textContent = `Could not load ${label(id)}. Keeping ${label(current)}. Try again.`;
    } finally {
      if (request === version) lab.removeAttribute('aria-busy');
    }
  }
  select.addEventListener('change', () => choose(select.value, true));
  window.addEventListener('popstate', () => choose(fromURL()));
  lab.hidden = false;
  const initial = fromURL();
  if (initial !== 'baseline') choose(initial);
})();
