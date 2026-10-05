// Progressive enhancement only: anchors and all content work without JavaScript.
(() => {
  const year = document.querySelector('#year');
  if (year) year.textContent = new Date().getFullYear();

  const sections = [...document.querySelectorAll('main > section[id]')];
  const links = [...document.querySelectorAll('.site-nav a')];
  if (!sections.length || !('IntersectionObserver' in window)) return;

  const visible = new Set();
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
    });
    const current = sections.find((section) => visible.has(section));
    if (!current) return;
    links.forEach((link) => {
      if (link.hash === `#${current.id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }, { rootMargin: '-10% 0px -55% 0px', threshold: 0 });
  sections.forEach((section) => observer.observe(section));
  // Never intercept scrolling, keyboard shortcuts, history, or fragment navigation.
})();
