/* Local texture scan over the chosen ASCII Magic still, not service animation. */
(() => {
  const image = document.querySelector(".ascii-portrait");
  const controls = document.querySelector(".motion-controls");
  if (!image || !controls || !("IntersectionObserver" in window)) return;
  const surface = document.createElement("div");
  surface.className = "portrait-surface";
  image.before(surface);
  surface.append(image);
  const scan = document.createElement("img");
  scan.className = "portrait-image portrait-scan";
  scan.src = image.getAttribute("src");
  scan.alt = "";
  scan.setAttribute("aria-hidden", "true");
  scan.hidden = true;
  surface.append(scan);
  const pause = document.querySelector("#pause-motion");
  const status = document.querySelector("#motion-status");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let paused = false;
  let visible = false;
  function updateMotion() {
    const state = reduced.matches
      ? "reduced"
      : !visible || document.hidden
        ? "suspended"
        : paused
          ? "paused"
          : "running";
    surface.dataset.motion = state;
    scan.hidden = state === "reduced" || state === "suspended";
    pause.disabled = reduced.matches;
    pause.textContent = paused ? "Resume motion" : "Pause motion";
    const messages = {
      reduced: "Off — respecting your reduced-motion preference.",
      paused: "Paused — local texture scan.",
      suspended: "Suspended — portrait or tab out of view.",
      running: "On — local texture scan, not an animated export.",
    };
    status.textContent = messages[state];
  }
  pause.addEventListener("click", () => {
    paused = !paused;
    updateMotion();
  });
  reduced.addEventListener("change", updateMotion);
  document.addEventListener("visibilitychange", updateMotion);
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    updateMotion();
  });
  observer.observe(surface);
  updateMotion();
  controls.hidden = false;
})();
