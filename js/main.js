const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();

const pages = [...document.querySelectorAll('[data-page]')];
const previous = document.querySelector('#previous-page');
const next = document.querySelector('#next-page');
const status = document.querySelector('#page-status');
const main = document.querySelector('#main');
let current = 0;

if (pages.length && previous && next && status && main) {
  document.documentElement.classList.add('reader');
  document.querySelector('.page-controls').hidden = false;
  document.querySelector('.reader-hint').hidden = false;
  pages.forEach(page => {
    const heading = page.querySelector('h1, h2');
    if (heading) heading.tabIndex = -1;
  });

  function show(index, { updateUrl = true, focus = false } = {}) {
    index = Math.max(0, Math.min(pages.length - 1, index));
    const activeWasHidden = pages[current].contains(document.activeElement);
    main.dataset.direction = index < current ? 'back' : 'forward';
    current = index;
    pages.forEach((page, i) => { page.hidden = i !== index; });
    pages[index].scrollTop = 0;
    previous.disabled = index === 0;
    next.disabled = index === pages.length - 1;
    status.textContent = `${String(index + 1).padStart(2, '0')} / ${String(pages.length).padStart(2, '0')} · ${pages[index].dataset.label}`;
    document.querySelectorAll('.site-nav a').forEach(link => {
      if (link.hash.slice(1) === pages[index].dataset.group) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    if (updateUrl && location.hash !== `#${pages[index].id}`) history.pushState(null, '', `#${pages[index].id}`);
    if (focus || activeWasHidden) pages[index].querySelector('h1, h2')?.focus({ preventScroll: true });
    // Keep focus usable when an endpoint disables the button that was pressed.
    if (document.activeElement === previous && previous.disabled) next.focus();
    if (document.activeElement === next && next.disabled) previous.focus();
  }

  function fromHash() {
    const aliases = { 'experience-earlier': 'experience', 'kinetic-canvas': 'work', 'youtube-macos': 'work', widgets: 'work', about: 'contact' };
    const hash = location.hash.slice(1);
    const id = aliases[hash] || hash;
    const index = pages.findIndex(page => page.id === id);
    show(index < 0 ? 0 : index, { updateUrl: false });
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const id = link.hash.slice(1);
    const index = pages.findIndex(page => page.id === id);
    if (index >= 0 || id === 'top' || id === 'main') {
      event.preventDefault();
      show(id === 'main' ? current : Math.max(index, 0), { focus: true });
    }
  });
  previous.addEventListener('click', () => show(current - 1));
  next.addEventListener('click', () => show(current + 1));
  document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    const target = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: pages.length - 1 }[event.key];
    if (target !== undefined) { event.preventDefault(); show(target); }
  });
  // Recognize a new gesture even when it arrives during the previous one's
  // momentum tail. Vertical wheel events must not keep the horizontal lock alive.
  let wheelDistance = 0;
  let wheelTurned = false;
  let lastWheelAt = -Infinity;
  let lastWheelDelta = 0;
  let lastTurnAt = -Infinity;
  document.addEventListener('wheel', event => {
    if (event.ctrlKey || event.metaKey || event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY) * 1.4) return;
    event.preventDefault();
    if (window.getSelection()?.toString()) return;
    const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? main.clientWidth : 1;
    const delta = event.deltaX * scale;
    const now = performance.now();
    const reversed = Math.sign(delta) !== Math.sign(lastWheelDelta);
    const renewed = Math.abs(lastWheelDelta) < 10 && Math.abs(delta) >= 12
      && Math.abs(delta) > Math.abs(lastWheelDelta) * 1.8;
    if (now - lastWheelAt > 180 || (now - lastTurnAt > 180 && (reversed || renewed))) {
      wheelDistance = 0;
      wheelTurned = false;
    }
    lastWheelAt = now;
    lastWheelDelta = delta;
    if (wheelTurned) return;
    if (Math.sign(delta) !== Math.sign(wheelDistance)) wheelDistance = 0;
    wheelDistance += delta;
    if (Math.abs(wheelDistance) >= 60) {
      wheelTurned = true;
      lastTurnAt = now;
      show(current + (wheelDistance > 0 ? 1 : -1));
    }
  }, { passive: false });

  let touchStart = null;
  main.addEventListener('touchstart', event => {
    touchStart = event.touches.length === 1 && !event.target.closest('a, button')
      ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
  }, { passive: true });
  main.addEventListener('touchmove', event => {
    if (!touchStart) return;
    if (event.touches.length !== 1) { touchStart = null; return; }
    const dx = event.touches[0].clientX - touchStart.x;
    const dy = event.touches[0].clientY - touchStart.y;
    if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) touchStart = null;
  }, { passive: true });
  main.addEventListener('touchend', event => {
    if (!touchStart) return;
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.6 && !window.getSelection()?.toString()) show(current + (dx < 0 ? 1 : -1));
    touchStart = null;
  }, { passive: true });
  main.addEventListener('touchcancel', () => { touchStart = null; }, { passive: true });
  window.addEventListener('popstate', fromHash);
  window.addEventListener('hashchange', fromHash);
  fromHash();
}
