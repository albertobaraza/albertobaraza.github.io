// Home page: pointer-lit grid, the flow (pipeline) through the page and the project stations.
// Every project is one kind of station, whether it is written in index.html or comes from GitHub,
// and shows its latest release. Uses `reducedMotion` from main.js.

const homeMain = document.querySelector(".home-main");

// ---------------------------------------------------------------------------
// Dot grid: an accent-colored layer is revealed around the pointer (CSS mask)
// ---------------------------------------------------------------------------
const homeBg = document.querySelector(".home-bg");

if (homeBg && !reducedMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
  let frame = 0;
  let px = 0;
  let py = 0;
  window.addEventListener(
    "pointermove",
    (e) => {
      px = e.clientX;
      py = e.clientY;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        homeBg.style.setProperty("--mx", `${px}px`);
        homeBg.style.setProperty("--my", `${py}px`);
      });
    },
    { passive: true }
  );
}

// ---------------------------------------------------------------------------
// Localized dates. Elements carry data-date (ISO) and data-date-label (i18n key); they are
// re-rendered whenever the language changes.
// ---------------------------------------------------------------------------
const renderDates = () => {
  const lang = window.i18n.getLang();
  document.querySelectorAll("[data-date]").forEach((el) => {
    const shown = new Date(el.dataset.date).toLocaleDateString(lang, {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
    el.textContent = `${window.i18n.t(el.dataset.dateLabel)} ${shown}`;
  });
};

document.addEventListener("langchange", renderDates);

// Flow: one path through the hero pin, every station icon and the closing pin.
// It draws itself as you scroll, lights each station when reached, and carries a pulse.
// Without JS the path simply isn't drawn; the layout stands on its own.
// ---------------------------------------------------------------------------
const flow = (() => {
  const svg = document.querySelector(".flow");
  const startPin = document.querySelector(".hero__pin");
  const endPin = document.querySelector(".journey__pin");
  if (!svg || !homeMain || !startPin || !endPin) return { rebuild() {} };

  const paths = {
    track: svg.querySelector(".flow__track"),
    line: svg.querySelector(".flow__line"),
    glow: svg.querySelector(".flow__glow"),
  };
  const beamTemplate = svg.querySelector(".flow__beam");
  const SAMPLES = 300;
  const BEAM_SPACING = 1000; // px of path between pulses
  const END_EASE = 400; // px of scroll over which the reveal line slides to the viewport bottom

  let total = 0; // path length in px
  let drawn = 0; // how much of it is currently drawn
  let ys = []; // y of the path at each of the SAMPLES + 1 evenly spaced lengths
  let stops = []; // [{ el, at }]: `at` is the 0..1 point where the path reaches that station

  // Position of an element's center relative to <main>, measured from bounding rects
  // (scroll cancels out) so it is correct whatever the page is scrolled to.
  const centerOf = (el, rootRect) => {
    const r = el.getBoundingClientRect();
    return { x: r.left - rootRect.left + r.width / 2, y: r.top - rootRect.top + r.height / 2 };
  };

  // The path only ever moves downward, so y is monotonic along it and can be inverted:
  // fraction (0..1) of the path length at which the path first reaches vertical position y.
  const fractionAtY = (y) => {
    if (!ys.length || y <= ys[0]) return 0;
    if (y >= ys[SAMPLES]) return 1;
    let lo = 0;
    let hi = SAMPLES;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (ys[mid] < y) lo = mid + 1;
      else hi = mid;
    }
    const prev = Math.max(lo - 1, 0);
    const span = ys[lo] - ys[prev] || 1;
    return (prev + ((y - ys[prev]) / span) * (lo - prev)) / SAMPLES;
  };

  const update = () => {
    if (!total) return;
    let p = 1;
    if (!reducedMotion) {
      // The line is drawn down to a reference line 62% of the way down the viewport. Over the last
      // stretch of the page that line slides down to the viewport's bottom edge, so the closing pin
      // (which sits above a short footer) is always reached when you scroll to the end.
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const nearEnd = maxScroll > 0 ? Math.min(1, Math.max(0, (window.scrollY - (maxScroll - END_EASE)) / END_EASE)) : 1;
      const reference = window.innerHeight * (0.62 + 0.38 * nearEnd);
      p = fractionAtY(reference - homeMain.getBoundingClientRect().top);
    }
    drawn = p * total;
    const offset = String(1 - p);
    paths.line.style.strokeDashoffset = offset;
    paths.glow.style.strokeDashoffset = offset;
    stops.forEach(({ el, at }) => el.classList.toggle("is-lit", p >= at - 0.003));
  };

  const build = () => {
    const icons = [...document.querySelectorAll(".station__icon")];
    const rootRect = homeMain.getBoundingClientRect();
    // In the staggered desktop layout the text sits beside each icon, so the path has to stay
    // vertical for the full height of that row and only swerve in the gap between rows.
    // On mobile everything hangs off one column, so a short stem past the icon is enough.
    const staggered = window.matchMedia("(min-width: 721px)").matches;
    const stations = [
      { el: startPin, stem: 0 },
      ...icons.map((icon) => {
        const body = icon.parentElement.querySelector(".station__body");
        const row = staggered ? Math.max(icon.offsetHeight, body ? body.offsetHeight : 0) : icon.offsetHeight;
        return { el: icon, stem: row / 2 + 10 };
      }),
      { el: endPin, stem: 0 },
    ];
    const points = stations.map(({ el }) => centerOf(el, rootRect));

    svg.setAttribute("width", rootRect.width);
    svg.setAttribute("height", rootRect.height);
    svg.setAttribute("viewBox", `0 0 ${rootRect.width} ${rootRect.height}`);

    // Per segment: straight down the stem, a cubic S-curve with vertical tangents across the gap,
    // then straight down into the next station. y only ever increases along the path.
    const f = (n) => n.toFixed(1);
    let d = `M${f(points[0].x)} ${f(points[0].y)}`;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      const dy = b.y - a.y;
      const y1 = a.y + Math.min(stations[i - 1].stem, dy * 0.38);
      const y2 = b.y - Math.min(stations[i].stem, dy * 0.38);
      const k = (y2 - y1) / 2;
      d += `L${f(a.x)} ${f(y1)}C${f(a.x)} ${f(y1 + k)} ${f(b.x)} ${f(y2 - k)} ${f(b.x)} ${f(y2)}L${f(b.x)} ${f(b.y)}`;
    }
    Object.values(paths).forEach((path) => path.setAttribute("d", d));

    total = paths.line.getTotalLength();
    ys = Array.from({ length: SAMPLES + 1 }, (_, i) => paths.line.getPointAtLength((total * i) / SAMPLES).y);
    stops = [...icons.map((icon) => icon.closest(".station")), endPin].map((el, i) => ({
      el,
      at: fractionAtY(points[i + 1].y),
    }));

    update();
  };

  let buildFrame = 0;
  const rebuild = () => {
    if (buildFrame) return;
    buildFrame = requestAnimationFrame(() => {
      buildFrame = 0;
      build();
    });
  };

  let updateFrame = 0;
  window.addEventListener(
    "scroll",
    () => {
      if (updateFrame) return;
      updateFrame = requestAnimationFrame(() => {
        updateFrame = 0;
        update();
      });
    },
    { passive: true }
  );

  // Anything that can move a station: size changes (incl. async cards), fonts, language.
  if ("ResizeObserver" in window) new ResizeObserver(rebuild).observe(homeMain);
  window.addEventListener("resize", rebuild);
  window.addEventListener("load", rebuild);
  document.addEventListener("langchange", rebuild);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(rebuild);
  rebuild();

  // Pulses travel the path continuously. Their positions depend only on time and the path's
  // fixed length, never on how much of it is drawn, so scrolling can't make them restart: it only
  // changes where they are visible. They fade out at the tip of the drawn line and fade back in
  // when scrolling draws more of it. Several are spread along the path so one is usually in view.
  if (!reducedMotion) {
    const started = performance.now();
    const SPEED = 0.2; // px per ms
    const FADE = 70; // px over which a pulse fades in / out
    const beams = [];

    const syncBeams = () => {
      const wanted = Math.max(1, Math.ceil(total / BEAM_SPACING));
      while (beams.length < wanted) {
        const beam = beams.length ? beamTemplate.cloneNode() : beamTemplate;
        if (beams.length) svg.appendChild(beam);
        beams.push(beam);
      }
      while (beams.length > wanted) {
        const beam = beams.pop();
        if (beam !== beamTemplate) beam.remove();
      }
    };

    const tick = (now) => {
      if (total) {
        syncBeams();
        const cycle = beams.length * BEAM_SPACING; // >= total; beams past the end are just hidden
        const travelled = (now - started) * SPEED;
        beams.forEach((beam, i) => {
          const at = (travelled + i * BEAM_SPACING) % cycle;
          let opacity = 0;
          if (at <= drawn) {
            const point = paths.line.getPointAtLength(at);
            beam.setAttribute("cx", point.x);
            beam.setAttribute("cy", point.y);
            opacity = Math.max(0, Math.min(1, at / FADE, (drawn - at) / FADE));
          }
          beam.style.opacity = String(opacity);
        });
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  return { rebuild };
})();

// ---------------------------------------------------------------------------
// Projects. Every project is a `.station--project`, ahead of the closing "More on GitHub" stop.
// Some are written in index.html (their release comes from their own /version.json), others are
// built from GitHub (their release is the repo's latest GitHub release). Whatever the source, a
// release is { version, releaseDate } ("X.Y.Z", "YYYY-MM-DD") and is handled the same way: a version
// badge on the icon, and the release date kept on the station (data-release-date) to sort by. The
// date can also be written above the title as "Released: ...", which is switched off for now. A
// project with no release has a release of null (a repo without GitHub releases, a failed request, a
// /version.json without the fields) and gets neither, through the same code.
// ---------------------------------------------------------------------------
const journeyMap = document.querySelector(".journey__map");
const moreStation = document.querySelector(".station--more");

const SHOW_RELEASE_DATE = false;
const VERSION_PATTERN = /^\d+\.\d+\.\d+[\w.+-]*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const applyRelease = (station, release) => {
  const { version, releaseDate } = release ?? {}; // null: no release, so nothing to show
  if (typeof version === "string" && VERSION_PATTERN.test(version)) {
    const badge = document.createElement("span");
    badge.className = "station__badge";
    badge.textContent = `v${version}`;
    station.querySelector(".station__icon").appendChild(badge);
  }
  if (typeof releaseDate === "string" && DATE_PATTERN.test(releaseDate)) {
    station.dataset.releaseDate = releaseDate; // what the sort reads
    if (SHOW_RELEASE_DATE) {
      Object.assign(station.querySelector(".station__date").dataset, {
        date: releaseDate,
        dateLabel: "label-released",
      });
    }
  }
};

// Projects are sorted by release date, newest first, then the ones without a date, and within the
// same date (or without one) alphabetically by name; the flow follows whatever order they end up in.
// Called each time a batch of release data arrives, so it must be safe to repeat.
const projectName = (station) => station.querySelector(".station__title").textContent.replace("↗", "").trim();

const compareProjects = (a, b) => {
  const da = a.dataset.releaseDate, db = b.dataset.releaseDate;
  if (da && db && da !== db) return da < db ? 1 : -1; // newest first
  if (!da !== !db) return da ? -1 : 1; // undated last
  return projectName(a).localeCompare(projectName(b), undefined, { sensitivity: "base" });
};

const refreshProjects = () => {
  const sorted = [...journeyMap.querySelectorAll(".station--project")].sort(compareProjects);
  sorted.forEach((station, i) => {
    station.style.setProperty("--i", i + 1);
    journeyMap.insertBefore(station, moreStation);
  });
  renderDates();
  placeLanguageCharts();
  flow.rebuild();
};

// ---------------------------------------------------------------------------
// Projects from GitHub: the most recently pushed public repos join the journey. Falls back to the
// projects written in index.html if the request fails.
// ---------------------------------------------------------------------------
const EXCLUDED_REPOS = new Set(["albertobaraza", "albertobaraza.github.io"]);

// What a repo says about itself beyond the API, read from the package.json on its default branch
// (raw.githubusercontent.com, open CORS, not counted against the API limit) as { icon, home }:
// - icon: the "icon" field (a VS Code extension declares its Marketplace icon there),
// - home: where the project lives for its users, if not the repo: a VS Code extension
//   (engines.vscode + publisher) lives on its Marketplace page.
// No package.json, or nothing in it: initials tile, and the repo is the project's link. Rejects when
// the file can't be read for any other reason, so a hiccup is never cached as "no icon".
const fetchRepoManifest = async (repo) => {
  const base = `https://raw.githubusercontent.com/${repo.full_name}/${repo.default_branch}/`;
  const res = await fetch(`${base}package.json`);
  if (res.status === 404) return { icon: null, home: null };
  if (!res.ok) throw new Error(`package.json answered ${res.status}`);
  const pkg = await res.json();
  const icon = typeof pkg.icon === "string" && pkg.icon ? new URL(pkg.icon, base).href : null;
  const isExtension = pkg.engines?.vscode && typeof pkg.publisher === "string" && typeof pkg.name === "string";
  const home = isExtension
    ? `https://marketplace.visualstudio.com/items?itemName=${encodeURIComponent(`${pkg.publisher}.${pkg.name}`)}`
    : null;
  return { icon, home };
};

// Set on purpose, these win over what the repo says. Only for a repo that publishes no icon itself.
const REPO_ICON_OVERRIDES = {
  soldat: "assets/projects/soldat.png",
};

// Returns [name, bytes] pairs sorted by share of the repo, largest first. Rejects when the request
// fails (e.g. rate-limited), so a failure is never mistaken for "this repo has no languages".
const fetchTopLanguages = (repo) =>
  fetch(repo.languages_url)
    .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
    .then((bytesByLanguage) => Object.entries(bytesByLanguage).sort((a, b) => b[1] - a[1]));

// The repo's latest published release (no drafts, no pre-releases) as { version, releaseDate }, or
// null when it has none. Rejects when the request fails, like fetchTopLanguages. The list endpoint
// is used because it answers 200 with [] for a repo without releases, where /releases/latest
// would answer 404 (and log an error in every visitor's console).
const fetchLatestRelease = (repo) =>
  fetch(`${repo.url}/releases?per_page=5`)
    .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
    .then((releases) => {
      const latest = releases.find((release) => !release.draft && !release.prerelease);
      if (!latest) return null;
      return {
        version: String(latest.tag_name).replace(/^v/i, ""),
        releaseDate: String(latest.published_at || "").slice(0, 10),
      };
    });

const fetchRepoDetails = (repo) =>
  Promise.all([fetchTopLanguages(repo), fetchLatestRelease(repo), fetchRepoManifest(repo)]).then(
    ([languages, release, manifest]) => ({ languages, release, manifest }),
  );

// GitHub allows 60 un-authenticated API requests an hour per IP and one page load costs 9, so a few
// reloads (or a busy shared IP) would run the GitHub projects dry. The last complete answer is kept
// in localStorage for an hour, and if a refresh fails the last good one is shown whatever its age.
const REPOS_CACHE_KEY = "github-repos-v3";
const REPOS_CACHE_TTL = 60 * 60 * 1000;

const readReposCache = () => {
  try {
    const cached = JSON.parse(localStorage.getItem(REPOS_CACHE_KEY));
    return cached && Array.isArray(cached.projects) && Number.isFinite(cached.savedAt) ? cached : null;
  } catch {
    return null; // storage blocked or the entry is garbled: behave as if there were no cache
  }
};

const writeReposCache = (projects) => {
  try {
    localStorage.setItem(REPOS_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), projects }));
  } catch {
    // storage blocked or full: just no caching
  }
};

// GitHub linguist colors for common languages; unlisted languages fall back to the site accent.
const LANGUAGE_COLORS = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Java: "#b07219",
  HTML: "#e34c26",
  CSS: "#563d7c",
  SCSS: "#c6538c",
  Shell: "#89e051",
  Dockerfile: "#384d54",
  "Jupyter Notebook": "#DA5B0B",
  PLpgSQL: "#336790",
  Go: "#00ADD8",
  Ruby: "#701516",
  PHP: "#4F5D95",
  "C++": "#f34b7d",
  C: "#555555",
  Rust: "#dea584",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Vue: "#41b883",
  R: "#198CE7",
  MATLAB: "#e16737",
  "C#": "#178600",
  Dart: "#00B4AB",
  Lua: "#3a3a9e",
  Makefile: "#427819",
  Svelte: "#ff3e00",
  Nix: "#7e7eff",
  TeX: "#3D6117",
  PowerShell: "#2d5a87",
  Astro: "#ff5a03",
  MDX: "#fcb32c",
  XSLT: "#EB8CEB",
};
const DEFAULT_THUMB_COLOR = "#fbbf24";

// The language chart is a legend, so two slices must never share a color. A language without a
// linguist color above gets a stable pick from this palette (same name, same color every time)
// and the "Other" bucket is always neutral grey.
const FALLBACK_LANGUAGE_COLORS = ["#14b8a6", "#d946ef", "#fb7185", "#38bdf8", "#a3e635", "#f59e0b"];
const OTHER_LANGUAGE_COLOR = "#8b949e";
const languageColor = (name) => {
  if (LANGUAGE_COLORS[name]) return LANGUAGE_COLORS[name];
  const hash = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return FALLBACK_LANGUAGE_COLORS[hash % FALLBACK_LANGUAGE_COLORS.length];
};

const getInitials = (name) => {
  const words = name.split(/[-_\s]+/).filter(Boolean);
  const significant = words.filter((word) => word.length > 1);
  const source = significant.length >= 2 ? significant : words;
  if (source.length >= 2) return (source[0][0] + source[1][0]).toUpperCase();
  return (source[0] || name).slice(0, 2).toUpperCase();
};

// Perceived-brightness check so initials stay legible against any language color.
const getReadableTextColor = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1a1a1a" : "#ffffff";
};

// A project's icon: its initials on its color, swapped for the image at iconUrl once (and if) it
// loads. dataset.icon remembers which image was asked for, so a re-render can tell whether the
// icon actually changed.
const buildThumb = (name, color, iconUrl) => {
  const thumb = document.createElement("span");
  thumb.className = "station__thumb";
  thumb.style.background = color;
  thumb.style.color = getReadableTextColor(color);
  thumb.textContent = getInitials(name);
  thumb.dataset.icon = iconUrl || "";

  if (iconUrl) {
    const img = new Image();
    img.alt = "";
    img.onload = () => {
      thumb.style.background = "";
      thumb.replaceChildren(img);
    };
    img.src = iconUrl;
  }

  return thumb;
};

// A repo's language mix, shared by the ring and the hover chart so they always agree. Takes
// [name, size] pairs, largest first (GitHub's byte counts today; any source that can give
// relative sizes works) and returns slices with their share of the total. Long tails beyond
// MAX_RING_SLICES collapse into a single "Other" slice.
const MAX_RING_SLICES = 5;
const summarizeLanguages = (languages) => {
  const total = languages.reduce((sum, [, size]) => sum + size, 0);
  if (!total) return [];

  const top = languages.slice(0, MAX_RING_SLICES).map(([name, size]) => ({
    name,
    share: size / total,
    color: languageColor(name),
    isOther: false,
  }));
  const otherSize = languages.slice(MAX_RING_SLICES).reduce((sum, [, size]) => sum + size, 0);
  if (otherSize > 0) {
    top.push({ name: "Other", share: otherSize / total, color: OTHER_LANGUAGE_COLOR, isOther: true });
  }
  return top;
};

// The ring around a repo's icon is its language mix: a thin segmented ring using the same
// colors as the tile and the hover chart (buildLanguageChart).
const buildOrbit = (slices) => {
  const orbit = document.createElement("span");
  orbit.className = "station__orbit";
  if (!slices.length) return orbit; // no language data: keep the plain dashed orbit

  let cursor = 0;
  const stops = slices.map(({ share, color }) => {
    const start = cursor * 100;
    cursor += share;
    return `${color} ${start.toFixed(2)}% ${(cursor * 100).toFixed(2)}%`;
  });

  orbit.classList.add("station__orbit--langs");
  orbit.style.background = `conic-gradient(${stops.join(", ")})`;
  return orbit;
};

const formatShare = (share) => (share * 100 < 0.1 ? "<0.1%" : `${(share * 100).toFixed(1)}%`);

// The card that opens beside the icon on hover/focus (the CSS owns when). It spells out what the
// ring only hints at: which languages, and how much of each. It's decorative duplicate info for
// pointer users, so it's hidden from assistive tech and offered to it as the link's description.
const buildLanguageChart = (slices, id) => {
  const chart = document.createElement("div");
  chart.className = "station__langs";
  chart.id = id;
  chart.setAttribute("aria-hidden", "true");

  const title = document.createElement("p");
  title.className = "station__langs-title";
  title.dataset.i18n = "proj-languages";
  title.textContent = window.i18n.t("proj-languages");

  const list = document.createElement("ul");
  list.className = "station__langs-list";
  slices.forEach(({ name, share, color, isOther }, i) => {
    const row = document.createElement("li");
    row.style.setProperty("--c", color);
    row.style.setProperty("--p", (share * 100).toFixed(2));
    row.style.setProperty("--n", String(i));

    const dot = document.createElement("i");
    const label = document.createElement("span");
    if (isOther) {
      label.dataset.i18n = "proj-lang-other";
      label.textContent = window.i18n.t("proj-lang-other");
    } else {
      label.textContent = name;
    }
    const pct = document.createElement("b");
    pct.textContent = formatShare(share);

    row.append(dot, label, pct);
    list.appendChild(row);
  });

  chart.append(title, list);
  return chart;
};

// Where each language chart opens. Preferably on the side of the icon that has no text, so the
// chart only adds to the card and nothing has to be hidden. When there isn't room out there (a
// narrower window, or on phones where the icon hugs the edge) it opens across the text instead and
// the CSS fades that text back. A station's icon position only depends on the viewport width, so
// this runs once the stations exist and on resize, not on hover (which would make it jump).
const CHART_WIDTH = { max: 216, min: 170 }; // narrower than min would truncate names like "JavaScript"
const CHART_EDGE_MARGIN = 12; // keep this much air between the chart and the window edge
const placeLanguageCharts = () => {
  const viewport = document.documentElement.clientWidth;
  document.querySelectorAll(".station--langs").forEach((station) => {
    const iconEl = station.querySelector(".station__icon");
    const icon = iconEl.getBoundingClientRect();
    const iconIsLeft = icon.left < station.querySelector(".station__body").getBoundingClientRect().left;

    // Room beyond the icon, minus what the chart itself spends: the ring around the icon and its gap
    const roomOutside = iconIsLeft ? icon.left : viewport - icon.right;
    const spent = iconEl.offsetWidth * 0.14 + 0.55 * 16 + CHART_EDGE_MARGIN;
    const width = Math.min(CHART_WIDTH.max, roomOutside - spent);
    const fitsOutside = width >= CHART_WIDTH.min;

    // Outside: the side opposite the text. Across the text: the side the text is on.
    station.dataset.chartSide = iconIsLeft === fitsOutside ? "left" : "right";
    station.toggleAttribute("data-chart-over", !fitsOutside);
    if (fitsOutside) station.style.setProperty("--langs-w", `${Math.floor(width)}px`);
    else station.style.removeProperty("--langs-w");
  });
};

let placeFrame = 0;
window.addEventListener("resize", () => {
  cancelAnimationFrame(placeFrame);
  placeFrame = requestAnimationFrame(placeLanguageCharts);
});

const buildProjectStation = ({ repo, languages, release }) => {
  // A project that lives somewhere other than its repo (repo.home) links there, with the repo as a
  // second link under its description. A link can't nest inside another, so a station with a
  // second link is a div whose title link is stretched over the whole station (see .station--multi).
  const mainUrl = repo.home || repo.html_url;
  const extraLinks = repo.home ? [["GitHub", repo.html_url]] : [];
  const hasExtra = extraLinks.length > 0;
  const slices = summarizeLanguages(languages);
  const color = slices[0]?.color || DEFAULT_THUMB_COLOR;

  const station = document.createElement(hasExtra ? "div" : "a");
  station.className =
    "station station--project" + (hasExtra ? " station--multi" : "") + (slices.length ? " station--langs" : "");
  station.style.setProperty("--node-color", color);

  const repoLink = hasExtra ? document.createElement("a") : station;
  repoLink.href = mainUrl;
  repoLink.target = "_blank";
  repoLink.rel = "noopener";
  if (hasExtra) repoLink.className = "station__stretch";

  // In a multi-link station the stretched title link covers everything, which would swallow the
  // hover that opens the language chart. The icon therefore sits above it as a link of its own
  // (same repo; hidden from assistive tech and the tab order, since the title link already is it).
  const icon = document.createElement(hasExtra ? "a" : "span");
  icon.className = "station__icon";
  if (hasExtra) {
    icon.href = mainUrl;
    icon.target = "_blank";
    icon.rel = "noopener";
    icon.tabIndex = -1;
    icon.setAttribute("aria-hidden", "true");
  }
  icon.append(buildOrbit(slices), buildThumb(repo.name, color, REPO_ICON_OVERRIDES[repo.name] || repo.icon));

  const date = document.createElement("span");
  date.className = "station__date";

  const title = document.createElement("h2");
  title.className = "station__title";
  const arrow = document.createElement("span");
  arrow.className = "station__arrow";
  arrow.textContent = "↗";
  (hasExtra ? title.appendChild(repoLink) : title).append(`${repo.name} `, arrow);

  const desc = document.createElement("p");
  desc.textContent = repo.description || window.i18n.t("proj-no-description");

  const body = document.createElement("div");
  body.className = "station__body reveal";
  body.append(date, title, desc);

  if (hasExtra) {
    const links = document.createElement("div");
    links.className = "station__links";
    extraLinks.forEach(([label, href]) => {
      const a = document.createElement("a");
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = `${label} ↗`;
      links.appendChild(a);
    });
    body.appendChild(links);
  }

  station.append(icon, body);
  applyRelease(station, release);
  if (slices.length) {
    const chartId = `lang-chart-${repo.id}`;
    station.appendChild(buildLanguageChart(slices, chartId));
    repoLink.setAttribute("aria-describedby", chartId);
  }
  observeReveal(body);
  return station;
};

// Resolves to [{ repo, languages, release }] for the GitHub projects: from the cache while it's fresh, else
// from GitHub (and then cached), else from a stale cache. Rejects only when there's nothing to show.
const loadRepoProjects = async () => {
  const cached = readReposCache();
  if (cached && Date.now() - cached.savedAt < REPOS_CACHE_TTL) return cached.projects;

  try {
    const res = await fetch("https://api.github.com/users/albertobaraza/repos?sort=pushed&per_page=100");
    if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
    const repos = await res.json();

    const top = repos
      .filter((repo) => !repo.fork && !repo.private && !repo.archived && !EXCLUDED_REPOS.has(repo.name))
      .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
      .slice(0, 4);

    const details = await Promise.all(top.map((repo) => fetchRepoDetails(repo).catch(() => null)));
    const projects = top.map((repo, i) => ({
      // Only what the station needs, so the cache stays small
      repo: {
        id: repo.id,
        name: repo.name,
        html_url: repo.html_url,
        description: repo.description,
        icon: details[i]?.manifest.icon || null,
        home: details[i]?.manifest.home || null,
      },
      languages: details[i]?.languages || [],
      release: details[i]?.release || null,
    }));

    if (details.every(Boolean)) writeReposCache(projects);
    // Rate-limited part-way: the last complete answer beats one with missing language rings and releases
    else if (cached) return cached.projects;
    return projects;
  } catch (error) {
    if (cached) return cached.projects;
    throw error;
  }
};

if (journeyMap && moreStation) {
  loadRepoProjects()
    .then((projects) => {
      if (!projects.length) return;

      // Now that GitHub projects precede it, "browse the rest" reads correctly
      // instead of the plain fallback wording used when it's the only extra stop.
      const moreDesc = moreStation.querySelector('[data-i18n="proj-more-desc"]');
      if (moreDesc) {
        moreDesc.dataset.i18n = "proj-more-desc-live";
        moreDesc.innerHTML = window.i18n.t("proj-more-desc-live");
      }

      projects.forEach((project) => journeyMap.insertBefore(buildProjectStation(project), moreStation));
      refreshProjects();
    })
    .catch(() => {
      // Network error, rate limit and nothing cached, or no JS: the projects from index.html stay as they are
    });
}

// ---------------------------------------------------------------------------
// Projects written in index.html (tagged data-site): index.html holds only their address. Each
// describes itself from its own origin, both files served with open CORS:
// - /manifest.json, its web app manifest: name, description and icon. The description is English,
//   with other languages in description_localized (the W3C manifest localization proposal, e.g.
//   { "es": "..." }); name_localized works the same way.
// - /version.json, {"version":"X.Y.Z","releaseDate":"YYYY-MM-DD"}: its release.
// Nothing about a project is kept here, so a new icon or wording shows up as soon as it deploys.
// Set on purpose, a station attribute wins over the manifest: data-name, data-icon, and the inline
// --node-color (the portfolio's own palette, since a manifest's theme_color is the app's toolbar).
// The last manifest read from each project is kept in localStorage, so a returning visit paints at
// once and a project that is down still shows what it last said. Never read and unreachable: the
// station shows its hostname and an initials tile. A project with no release gets no badge or date.
// ---------------------------------------------------------------------------
const MANIFESTS_CACHE_KEY = "site-manifests-v1";
const ICON_TARGET_PX = 240; // icons show at up to 120 CSS px, so twice that is sharp on 2x screens
const siteStations = [...document.querySelectorAll("[data-site]")];
const manifestUrlOf = (station) => new URL("/manifest.json", station.href).href;

const readManifestsCache = () => {
  try {
    const cached = JSON.parse(localStorage.getItem(MANIFESTS_CACHE_KEY));
    return cached && typeof cached === "object" && !Array.isArray(cached) ? cached : {};
  } catch {
    return {}; // storage blocked or the entry is garbled: behave as if nothing was cached
  }
};

// A manifest member in the current language: member_localized[lang] (a string or { value }),
// else the member itself.
const localizedMember = (manifest, member) => {
  const entry = manifest[`${member}_localized`]?.[window.i18n.getLang()];
  const value = typeof entry === "string" ? entry : entry?.value;
  if (typeof value === "string" && value.trim()) return value;
  return typeof manifest[member] === "string" ? manifest[member] : "";
};

// The smallest "any"-purpose icon that is at least ICON_TARGET_PX (an SVG, sizes "any", counts as
// big enough), else the biggest there is. src is relative to the manifest, as the spec says.
const pickManifestIcon = (manifest, manifestUrl) => {
  const icons = (Array.isArray(manifest.icons) ? manifest.icons : []).filter(
    (icon) => typeof icon?.src === "string" && (!icon.purpose || String(icon.purpose).split(/\s+/).includes("any")),
  );
  const sizeOf = (icon) =>
    icon.sizes === "any" ? Infinity : Math.max(0, ...String(icon.sizes || "").split(/\s+/).map((s) => parseInt(s, 10) || 0));
  const bySize = [...icons].sort((a, b) => sizeOf(a) - sizeOf(b));
  const best = bySize.find((icon) => sizeOf(icon) >= ICON_TARGET_PX) || bySize[bySize.length - 1];
  if (!best) return null;
  const url = new URL(best.src, manifestUrl);
  return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
};

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const renderSite = (station, manifest) => {
  const name = station.dataset.name || (manifest && localizedMember(manifest, "name")) || new URL(station.href).hostname;
  station.querySelector(".station__name").textContent = name;
  station.querySelector(".station__desc").textContent = manifest ? localizedMember(manifest, "description") : "";

  if (!station.style.getPropertyValue("--node-color") && HEX_COLOR.test(manifest?.theme_color || "")) {
    station.style.setProperty("--node-color", manifest.theme_color);
  }
  const color = station.style.getPropertyValue("--node-color").trim();

  const iconUrl = station.dataset.icon || (manifest && pickManifestIcon(manifest, manifestUrlOf(station))) || "";
  const current = station.querySelector(".station__icon > .station__thumb");
  // Rebuilding an unchanged icon would flash its initials, so only swap when it actually changed
  if (current?.dataset.icon === iconUrl && (iconUrl || current.textContent === getInitials(name))) return;
  const thumb = buildThumb(name, HEX_COLOR.test(color) ? color : DEFAULT_THUMB_COLOR, iconUrl);
  if (current) current.replaceWith(thumb);
  else station.querySelector(".station__icon").appendChild(thumb);
};

const manifestsCache = readManifestsCache();
const siteManifests = new Map(siteStations.map((station) => [station, manifestsCache[manifestUrlOf(station)] || null]));
siteManifests.forEach((manifest, station) => {
  if (manifest) renderSite(station, manifest);
});

const loadSiteManifest = (station) =>
  fetch(manifestUrlOf(station))
    .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
    .then((manifest) => {
      if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) throw new Error("not a manifest");
      // Only what a station uses, so the cache stays small
      const { name, name_localized, description, description_localized, icons, theme_color } = manifest;
      siteManifests.set(station, { name, name_localized, description, description_localized, icons, theme_color });
    })
    .catch(() => {}) // keep the cached copy, if any
    .then(() => renderSite(station, siteManifests.get(station)));

const sitesLoaded = Promise.all(siteStations.map(loadSiteManifest)).then(() => {
  const toCache = {};
  siteManifests.forEach((manifest, station) => {
    if (manifest) toCache[manifestUrlOf(station)] = manifest;
  });
  try {
    localStorage.setItem(MANIFESTS_CACHE_KEY, JSON.stringify(toCache));
  } catch {
    // storage blocked or full: just no caching
  }
});

// The name and description follow the language toggle. A station still waiting for its first
// manifest is left alone: its fetch renders it (or its fallback) when it settles.
document.addEventListener("langchange", () =>
  siteManifests.forEach((manifest, station) => {
    if (manifest) renderSite(station, manifest);
  }),
);

const loadSiteRelease = (station) =>
  fetch(new URL("/version.json", station.href).href)
    .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
    .then((release) => applyRelease(station, release))
    .catch(() => {});

// The sort reads names too, so it waits for the manifests as well as the releases
Promise.all([sitesLoaded, ...siteStations.map(loadSiteRelease)]).then(refreshProjects);

// ---------------------------------------------------------------------------
// Private projects: their repos can't be read from the browser, so a scheduled job
// (.github/workflows/update-languages.yml) writes their language mix to data/languages.json and
// the stations tagged with data-lang-key get the same ring and hover chart as the live GitHub
// repos. No file, no entry for a project, or a failed request: the plain dashed orbit stays.
// ---------------------------------------------------------------------------
fetch("data/languages.json")
  .then((res) => (res.ok ? res.json() : {}))
  .catch(() => ({}))
  .then((data) => {
    const languagesByKey = data && typeof data === "object" ? data : {};
    document.querySelectorAll("[data-lang-key]").forEach((station) => {
      const key = station.dataset.langKey;
      const slices = summarizeLanguages(Array.isArray(languagesByKey[key]) ? languagesByKey[key] : []);
      const plainOrbit = station.querySelector(".station__orbit");
      if (!slices.length || !plainOrbit) return;

      plainOrbit.replaceWith(buildOrbit(slices));
      const chartId = `lang-chart-${key}`;
      station.classList.add("station--langs");
      station.appendChild(buildLanguageChart(slices, chartId));
      station.setAttribute("aria-describedby", chartId); // the station itself is the link here
    });
    placeLanguageCharts();
  });

// ---------------------------------------------------------------------------
// Touch: a phone has no hover, so tapping a station's icon opens its language chart instead of
// following the link, and any other tap (or Escape) closes it. While no chart is open the title and
// text follow the link as usual, but the tap that closes an open chart only closes it: it must not
// also follow whatever link happens to be underneath (another card, the same card, or the chart,
// which lives inside its station's link). Only a touch pointer is intercepted: a mouse click or the
// keyboard (including on a touch laptop) keeps its normal behavior. One delegated listener covers
// stations added later too.
// ---------------------------------------------------------------------------
let lastPointerType = "";
document.addEventListener("pointerdown", (event) => (lastPointerType = event.pointerType), true);

const closeLanguageCharts = (except) =>
  document.querySelectorAll(".station--langs.is-peeking").forEach((station) => {
    if (station !== except) station.classList.remove("is-peeking");
  });

document.addEventListener("click", (event) => {
  const wasTouch = lastPointerType === "touch";
  lastPointerType = ""; // so a later keyboard-triggered click isn't mistaken for a tap
  const icon = event.target instanceof Element ? event.target.closest(".station--langs .station__icon") : null;

  if (wasTouch && icon) {
    event.preventDefault();
    const station = icon.closest(".station--langs");
    closeLanguageCharts(station);
    station.classList.toggle("is-peeking");
    return;
  }

  // This tap is dismissing an open chart: swallow the link it landed on. The next tap is a normal one.
  if (wasTouch && document.querySelector(".station--langs.is-peeking") && event.target instanceof Element) {
    if (event.target.closest("a[href]")) event.preventDefault();
  }
  closeLanguageCharts();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeLanguageCharts();
});
