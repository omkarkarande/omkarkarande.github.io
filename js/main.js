(() => {
  const year = document.querySelector("#year");
  if (year) year.textContent = new Date().getFullYear();

  const main = document.querySelector("#main");
  const pages = [...document.querySelectorAll("[data-page]")];
  const previous = document.querySelector("#previous-page");
  const next = document.querySelector("#next-page");
  const status = document.querySelector("#page-status");
  if (!main || !pages.length || !previous || !next || !status) return;

  const navLinks = [...document.querySelectorAll(".site-nav a")];
  const aliases = {
    "experience-earlier": "experience",
    "kinetic-canvas": "work",
    "youtube-macos": "work",
    widgets: "work",
    about: "contact",
  };
  let current = -1;
  let settleTimer;
  let wheelTimer;
  let wheelScrolling = false;

  document.documentElement.classList.add("reader");
  document.querySelector(".page-controls").hidden = false;
  document.querySelector(".reader-hint").hidden = false;
  pages.forEach((page) => {
    page.querySelector("h1, h2").tabIndex = -1;
  });

  function select(index, { updateUrl = true, focus = false } = {}) {
    index = Math.max(0, Math.min(pages.length - 1, index));
    const changed = index !== current;
    const moveFocus =
      focus || (changed && pages[current]?.contains(document.activeElement));
    current = index;
    // Offscreen pages stay in the scroll layout but out of the keyboard and AX tree.
    pages.forEach((page, i) => {
      page.inert = i !== current;
      page.tabIndex = i === current ? 0 : -1;
      if (i === current) page.removeAttribute("aria-hidden");
      else page.setAttribute("aria-hidden", "true");
    });
    previous.disabled = current === 0;
    next.disabled = current === pages.length - 1;
    if (changed) {
      status.textContent = `${String(current + 1).padStart(2, "0")} / ${String(pages.length).padStart(2, "0")} · ${pages[current].dataset.label}`;
    }
    navLinks.forEach((link) => {
      if (link.hash === `#${pages[current].id}`)
        link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    if (updateUrl && location.hash !== `#${pages[current].id}`) {
      history.pushState(null, "", `#${pages[current].id}`);
      // pushState does not emit hashchange; the font comparison preview uses this.
      window.dispatchEvent(new Event("portfoliochange"));
    }
    if (moveFocus)
      pages[current].querySelector("h1, h2").focus({ preventScroll: true });
    if (document.activeElement === previous && previous.disabled) next.focus();
    if (document.activeElement === next && next.disabled) previous.focus();
  }

  function go(index, { updateUrl = true, focus = false } = {}) {
    clearTimeout(wheelTimer);
    wheelScrolling = false;
    main.style.removeProperty("scroll-snap-type");
    clearTimeout(settleTimer);
    select(index, { updateUrl, focus });
    // Explicit navigation is immediate. This also avoids WebKit cancelling a
    // smooth scroll while its initial deep-link scroll is still settling.
    main.scrollTo({ left: current * main.clientWidth, behavior: "instant" });
  }

  function fromHash() {
    const hash = location.hash.slice(1);
    if (hash === "main" && current >= 0) {
      go(current, { updateUrl: false, focus: true });
      return;
    }
    const index = pages.findIndex(
      (page) => page.id === (aliases[hash] || hash),
    );
    go(Math.max(0, index), { updateUrl: false });
  }

  // Browser scroll snapping owns gesture thresholds, momentum and cancellation.
  // JavaScript only updates navigation once the native scroll has settled.
  function settled() {
    clearTimeout(settleTimer);
    if (!wheelScrolling && main.clientWidth)
      select(Math.round(main.scrollLeft / main.clientWidth));
  }
  main.addEventListener("scrollend", settled);
  main.addEventListener(
    "scroll",
    () => {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(settled, 180); // Fallback for browsers without scrollend.
    },
    { passive: true },
  );

  // A vertically overflowing sheet consumes diagonal wheel events, even when
  // deltaX dominates. Route those deltas to the outer reader without a gesture
  // lock; reversal and momentum continue to move it until the wheel goes quiet.
  main.addEventListener("wheel", (event) => {
    if (event.ctrlKey || event.defaultPrevented ||
        Math.abs(event.deltaX) <= Math.abs(event.deltaY) * 1.5 || !event.deltaX) return;
    event.preventDefault();
    clearTimeout(settleTimer);
    clearTimeout(wheelTimer);
    wheelScrolling = true;
    main.style.scrollSnapType = "none";
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? main.clientWidth : 1;
    main.scrollLeft += event.deltaX * unit;
    wheelTimer = setTimeout(() => {
      go(Math.round(main.scrollLeft / main.clientWidth));
    }, 140);
  }, { passive: false });

  document.addEventListener("click", (event) => {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const link = event.target.closest?.('a[href^="#"]');
    if (!link) return;
    const id = link.hash.slice(1);
    const index = pages.findIndex((page) => page.id === id);
    if (index >= 0 || id === "top" || id === "main") {
      event.preventDefault();
      go(id === "main" ? current : Math.max(0, index), { focus: true });
    }
  });
  previous.addEventListener("click", () => go(current - 1));
  next.addEventListener("click", () => go(current + 1));
  document.addEventListener("keydown", (event) => {
    if (
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.target.closest?.(
        'input, textarea, select, [contenteditable]:not([contenteditable="false"])',
      )
    )
      return;
    const index = {
      ArrowLeft: current - 1,
      ArrowRight: current + 1,
      Home: 0,
      End: pages.length - 1,
    }[event.key];
    if (index !== undefined) {
      event.preventDefault();
      go(index);
    }
  });

  // Keep the selected sheet aligned when rotation, zoom or the window changes width.
  let lastWidth = main.clientWidth;
  new ResizeObserver(() => {
    if (main.clientWidth === lastWidth) return;
    lastWidth = main.clientWidth;
    clearTimeout(settleTimer);
    main.scrollTo({ left: current * lastWidth, behavior: "instant" });
  }).observe(main);

  window.addEventListener("popstate", fromHash);
  window.addEventListener("hashchange", fromHash);
  fromHash();
  // WebKit can re-snap during the first font layout. Keep deep links aligned.
  document.fonts.ready.then(() => {
    if (!wheelScrolling) go(current, { updateUrl: false });
  });
})();
