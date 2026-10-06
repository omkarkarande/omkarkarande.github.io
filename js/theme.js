/* Blocking, before styles: resolve appearance before the first paint. */
(() => {
  const root = document.documentElement;
  const system = matchMedia("(prefers-color-scheme: dark)");
  let choice;
  try {
    const saved = localStorage.getItem("portfolio-theme");
    if (saved === "dark" || saved === "light") choice = saved;
  } catch {
    /* Storage is optional (private / restricted contexts). */
  }
  function apply() {
    const theme = choice || (system.matches ? "dark" : "light");
    root.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]').content =
      theme === "dark" ? "#171c18" : "#f2eee5";
    const button = document.querySelector(".theme-toggle");
    if (button) button.setAttribute("aria-pressed", String(theme === "dark"));
  }
  apply();
  system.addEventListener("change", apply);
  document.addEventListener("DOMContentLoaded", () => {
    const button = document.querySelector(".theme-toggle");
    button.hidden = false;
    apply();
    button.addEventListener("click", () => {
      choice = root.dataset.theme === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("portfolio-theme", choice);
      } catch {}
      apply();
    });
  });
})();
