// Shared by every page: footer year, scroll reveal, theme toggle (the hanging nav is in nav.js).
// Page-specific behavior lives in home.js and experience.js, which load after
// this file and rely on `reducedMotion` below (top-level consts are shared
// across classic scripts, so don't redeclare it there).
document.getElementById("year").textContent = new Date().getFullYear();

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Scroll-reveal animations. `observeReveal` is also used by home.js for elements it
// creates after load (e.g. the GitHub repo stations).
const revealObserver =
  reducedMotion || !("IntersectionObserver" in window)
    ? null
    : new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              revealObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
      );

const observeReveal = (el) => {
  if (revealObserver) revealObserver.observe(el);
  else el.classList.add("is-visible");
};

document.querySelectorAll(".reveal").forEach(observeReveal);

// Manual dark/light/system theme toggle. "system" means no explicit
// override: no data-theme attribute, no localStorage entry, and the
// prefers-color-scheme media queries in the CSS take over.
const themeButtons = document.querySelectorAll(".theme-toggle__btn");

const getThemeSetting = () => {
  const stored = document.documentElement.getAttribute("data-theme");
  return stored === "light" || stored === "dark" ? stored : "system";
};

const updateThemeButtons = () => {
  const current = getThemeSetting();
  themeButtons.forEach((btn) => {
    const active = btn.dataset.themeValue === current;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", String(active));
  });
};

updateThemeButtons();

themeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const next = btn.dataset.themeValue;
    if (next === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", next);

    // Applied first, so the toggle still works when storage is blocked (it just isn't remembered)
    try {
      if (next === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", next);
    } catch {
      // storage blocked
    }
    updateThemeButtons();
  });
});
