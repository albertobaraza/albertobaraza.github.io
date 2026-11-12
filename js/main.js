// Shared by every page: footer year, scroll reveal, theme toggle, the page-to-page slide opt-out
// (the hanging nav is in nav.js).
// Page-specific behavior lives in home.js and experience.js, which load after
// this file and rely on `reducedMotion` below (top-level consts are shared
// across classic scripts, so don't redeclare it there).
document.getElementById("year").textContent = new Date().getFullYear();

// The profile pictures above the name (both pages' heroes). One that is missing (or fails to load)
// is simply left out, so the other still shows on its own, never a broken-image icon.
document.querySelectorAll(".hero__avatar").forEach((img) => {
  const leaveOut = () => { img.hidden = true; };
  if (img.complete && img.naturalWidth === 0) leaveOut();
  else img.addEventListener("error", leaveOut, { once: true });
});

// Visit counter in the footer. GoatCounter, which these pages already report to, can hand its own
// total back, but only once "allow using the visitor counter" is switched on in its dashboard.
// Until then (it answers 403), and whenever the request is blocked or fails, nothing is shown at
// all, never an empty label. The address comes from the tracker's own script tag.
const visitCountEl = document.getElementById("visit-count");
const goatCounterScript = document.querySelector("script[data-goatcounter]");

if (visitCountEl && goatCounterScript) {
  let visits = null;
  const showVisits = () => {
    if (visits === null) return;
    const text = window.i18n.t(visits === 1 ? "footer-visit" : "footer-visits");
    visitCountEl.textContent = text.replace("{n}", visits.toLocaleString(window.i18n.getLang()));
    visitCountEl.hidden = false;
  };

  fetch(goatCounterScript.dataset.goatcounter.replace(/\/count$/, "/counter/TOTAL.json"), { credentials: "omit" })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      // Unique visitors if it says so, else the plain count. It arrives formatted ("1 234"), so keep the digits.
      const n = data ? parseInt(String(data.count_unique ?? data.count).replace(/\D/g, ""), 10) : NaN;
      if (Number.isFinite(n) && n >= 1) {
        visits = n;
        showVisits();
      }
    })
    .catch(() => { /* blocked or offline: no counter */ });

  document.addEventListener("langchange", showVisits);
}

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

// The sideways slide between Projects and Experience is plain CSS (see "Page-to-page slide" in
// style.css). Two cases should not play it: a link to the page you are already on (it would slide
// the same page past itself), and when motion is switched off, which nav.js shows as
// `nav-still` (that also covers a system that asks for reduced motion). Otherwise this also says
// whether the name stays still (see the end of "Page-to-page slide" in style.css).
window.addEventListener("pageswap", (event) => {
  if (!event.viewTransition) return;
  try {
    const pageOf = (url) => (/\/experience(\.html)?$/.test(new URL(url).pathname) ? "experience" : "projects");
    const samePage = event.activation && pageOf(event.activation.entry.url) === pageOf(location.href);
    if (samePage || document.documentElement.classList.contains("nav-still")) {
      event.viewTransition.skipTransition();
      return;
    }
    // The name stays still while the rest slides, but only from the top of the page: scrolled down it
    // is not on screen, and a name that flies in from above would be worse than one that slides.
    // Both pages need to agree: this one gets the class now, before its picture is taken, and the
    // next one finds the note in its head script (a transition's types are not passed on). The note
    // also tells it a slide is coming, so it can finish its scripts before its first paint.
    const atTop = window.scrollY <= 2;
    let noted = false;
    try {
      sessionStorage.setItem("slide-note", `${Date.now()}:${atTop ? "hero" : "plain"}`);
      noted = true;
    } catch {
      // storage blocked: the next page can't be told, so the hero just slides with the page
    }
    document.documentElement.classList.toggle("slide-hero", atTop && noted);
  } catch {
    // an odd URL or a missing API: let the browser do what it would have done
  }
});
