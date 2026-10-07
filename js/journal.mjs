// Original portfolio artwork, inspired by Hairline's fine-line vocabulary.
// Shared geometry keeps enhanced, no-JS, reduced-motion and print art identical.
export function journalArtwork() {
  const rules = [57, 70, 83, 96, 109, 122]
    .map((y) => `<path d="M20 ${y}H112 M143 ${y}H230"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%" fill="none" stroke="var(--hairline-hi,#213c32)" stroke-width=".95" stroke-linecap="round" stroke-linejoin="round">
  <g transform="translate(34 16) scale(.84)">
  <path d="M43 159 160 208 283 149" stroke="var(--hairline-lo,#b1beaa)" stroke-dasharray="2 4"/>
  <g transform="matrix(.87 .36 -.65 .46 99 39)">
    <path d="M-5 5Q57-6 124 13Q184-6 253 4V155Q186 143 124 163Q54 143-5 154Z" fill="var(--hairline-plate,#f2eee5)"/>
    <path d="M0 0Q59-10 124 9Q188-10 248 0V146Q186 137 124 156Q61 137 0 146Z" fill="var(--hairline-plate,#f2eee5)"/>
    <path d="M0 149Q64 141 124 159Q187 140 248 149M0 152Q64 144 124 162Q187 143 248 152" stroke="var(--hairline-mid,#84957e)"/>
    <path d="M0 0Q62-12 124 9V156Q63 136 0 146ZM124 9Q187-12 248 0V146Q184 135 124 156Z" fill="var(--hairline-plate,#f2eee5)"/>
    <path d="M119 11V150M129 11V150" stroke="var(--hairline-lo,#b1beaa)"/>
    <g stroke="var(--hairline-lo,#b1beaa)" stroke-width=".65">${rules}</g>
    <g fill="var(--hairline-edge,#536957)" stroke="none" font-family="monospace" font-size="8" letter-spacing="1"><text x="20" y="32">06 / OCT</text><text x="143" y="32">SMALL MOMENTS</text></g>
    <g stroke="var(--hairline-edge,#536957)" stroke-width="1.1"><path d="M20 50q3-7 5-1t6-2 7 1 8-1h12m5 0q4-5 6 0t9-1h19M20 63q4-5 6-1t8-2 7 1h18m7 0q4-5 6 0t8-2h12M20 76q3-6 6-1t8-2 9 1h13m7 0q5-5 7-1t10-1h20M20 89q4-6 7-1t10-2h13"/></g>
    <path d="M35 114q-10-11-14-4t14 20q21-15 14-20t-14 4" stroke="var(--hairline-mid,#84957e)"/>
    <path data-writing="" d="M143 50q3-7 5-1t6-2 7 1 8-1h12m5 0q4-5 6 0t9-1h22" stroke-width="1.2"/>
    <path d="M113 151v29l6-6 6 6v-24" fill="var(--hairline-mid,#84957e)" stroke="var(--hairline-edge,#536957)"/>
  </g>
  <g data-pen="" transform="translate(213 138) rotate(28)">
    <path d="M0 0-3-11V-57Q0-62 3-57V-11Z" fill="var(--hairline-plate,#f2eee5)"/>
    <path d="M-3-11H3M-3-48H3M0-11V-46M3-50H6V-33" stroke="var(--hairline-edge,#536957)"/>
    <path d="M0 0V-4"/>
  </g>
  </g></svg>`;
}

export function journal(element) {
  const template = document.createElement("template");
  template.innerHTML = journalArtwork();
  const svg = template.content.firstElementChild;
  element.append(svg);
  element.dataset.hairline = "journal";
  const ink = svg.querySelector("[data-writing]");
  const pen = svg.querySelector("[data-pen]");
  const length = ink.getTotalLength();
  ink.setAttribute("stroke-dasharray", `${length} ${length}`);
  let elapsed = 0,
    previous = null,
    raf = 0,
    visible = false,
    destroyed = false;
  function render() {
    // Write for 6s, linger for 2s, then quietly lift and reset over 1s.
    const phase = elapsed % 9000;
    const progress = Math.min(phase / 6000, 1);
    ink.setAttribute("stroke-dashoffset", String(length * (1 - progress)));
    const point = ink.getPointAtLength(length * progress);
    const lift =
      phase > 8000 ? Math.sin(((phase - 8000) / 1000) * Math.PI) * 8 : 0;
    pen.setAttribute(
      "transform",
      `translate(${0.87 * point.x - 0.65 * point.y + 99} ${0.36 * point.x + 0.46 * point.y + 39 - lift}) rotate(28)`,
    );
    // Fade only at the reset, avoiding a visible backwards-writing stroke.
    svg.querySelector("[data-writing]").style.opacity =
      phase > 8000 ? String(1 - (phase - 8000) / 1000) : "1";
    pen.style.opacity = phase > 8500 ? String((9000 - phase) / 500) : "1";
  }
  function tick(now) {
    if (previous !== null) elapsed += now - previous;
    previous = now;
    render();
    raf = requestAnimationFrame(tick);
  }
  function sync() {
    if (destroyed) return;
    cancelAnimationFrame(raf);
    previous = null;
    const running = visible && !document.hidden;
    element.dataset.motion = running ? "running" : "suspended";
    if (running) raf = requestAnimationFrame(tick);
  }
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  });
  observer.observe(element);
  document.addEventListener("visibilitychange", sync);
  render();
  sync();
  return {
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      svg.remove();
      delete element.dataset.hairline;
      delete element.dataset.motion;
    },
  };
}
