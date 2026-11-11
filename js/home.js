// Home page: pointer-lit grid, the flow (pipeline) through the page, app stations
// and GitHub project cards. Uses `reducedMotion` from main.js.

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
// Localized dates. Elements carry data-date (ISO), data-date-label (i18n key) and
// data-date-format ("day" | "month"); they are re-rendered whenever the language changes.
// ---------------------------------------------------------------------------
const renderDates = () => {
  const lang = window.i18n.getLang();
  document.querySelectorAll("[data-date]").forEach((el) => {
    const options = el.dataset.dateFormat === "month"
      ? { month: "short", year: "numeric" }
      : { month: "short", day: "numeric", year: "numeric" };
    const shown = new Date(el.dataset.date).toLocaleDateString(lang, { ...options, timeZone: "UTC" });
    el.textContent = `${window.i18n.t(el.dataset.dateLabel)} ${shown}`;
  });
};

document.addEventListener("langchange", renderDates);

// ---------------------------------------------------------------------------
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
// Stations from GitHub: the most recently pushed public repos join the journey, just before
// the final "More on GitHub" stop. Falls back to the static stations if the request fails.
// ---------------------------------------------------------------------------
const journeyMap = document.querySelector(".journey__map");
const moreStation = document.querySelector(".station--more");
const EXCLUDED_REPOS = new Set(["albertobaraza", "albertobaraza.github.io"]);

// Extra public links per repo ([label, url]), shown under its description next to the main repo link.
const EXTRA_LINKS = {
  "claude-limits-meter": [
    ["VS Code Marketplace", "https://marketplace.visualstudio.com/items?itemName=albertobaraza.claude-limits-meter"],
  ],
};

// Returns [name, bytes] pairs sorted by share of the repo, largest first.
const fetchTopLanguages = (repo) =>
  fetch(repo.languages_url)
    .then((res) => (res.ok ? res.json() : {}))
    .then((bytesByLanguage) => Object.entries(bytesByLanguage).sort((a, b) => b[1] - a[1]))
    .catch(() => []);

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

// Drop an image at assets/projects/<repo-name>.png to override the generated initials tile.
const buildThumb = (repo, color) => {
  const thumb = document.createElement("span");
  thumb.className = "station__thumb";
  thumb.style.background = color;
  thumb.style.color = getReadableTextColor(color);
  thumb.textContent = getInitials(repo.name);

  const img = new Image();
  img.alt = "";
  img.onload = () => {
    thumb.style.background = "";
    thumb.replaceChildren(img);
  };
  img.src = `assets/projects/${repo.name}.png`;

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

const buildRepoStation = (repo, languages) => {
  // A link can't nest inside another, so a station with extra links is a div whose title link
  // is stretched over the whole station (see .station--multi).
  const extraLinks = EXTRA_LINKS[repo.name] || [];
  const hasExtra = extraLinks.length > 0;
  const slices = summarizeLanguages(languages);
  const color = slices[0]?.color || DEFAULT_THUMB_COLOR;

  const station = document.createElement(hasExtra ? "div" : "a");
  station.className =
    "station station--project" + (hasExtra ? " station--multi" : "") + (slices.length ? " station--langs" : "");
  station.style.setProperty("--node-color", color);
  station.style.setProperty("--i", "1");

  const repoLink = hasExtra ? document.createElement("a") : station;
  repoLink.href = repo.html_url;
  repoLink.target = "_blank";
  repoLink.rel = "noopener";
  if (hasExtra) repoLink.className = "station__stretch";

  // In a multi-link station the stretched title link covers everything, which would swallow the
  // hover that opens the language chart. The icon therefore sits above it as a link of its own
  // (same repo; hidden from assistive tech and the tab order, since the title link already is it).
  const icon = document.createElement(hasExtra ? "a" : "span");
  icon.className = "station__icon";
  if (hasExtra) {
    icon.href = repo.html_url;
    icon.target = "_blank";
    icon.rel = "noopener";
    icon.tabIndex = -1;
    icon.setAttribute("aria-hidden", "true");
  }
  icon.append(buildOrbit(slices), buildThumb(repo, color));

  const license = repo.license?.spdx_id;
  if (license && license !== "NOASSERTION") {
    const badge = document.createElement("span");
    badge.className = "station__badge";
    badge.textContent = license;
    icon.appendChild(badge);
  }

  const date = document.createElement("span");
  date.className = "station__date";
  if (repo.pushed_at) {
    Object.assign(date.dataset, { date: repo.pushed_at, dateLabel: "label-last-commit", dateFormat: "month" });
  }

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
  if (slices.length) {
    const chartId = `lang-chart-${repo.id}`;
    station.appendChild(buildLanguageChart(slices, chartId));
    repoLink.setAttribute("aria-describedby", chartId);
  }
  observeReveal(body);
  return station;
};

if (journeyMap && moreStation) {
  fetch("https://api.github.com/users/albertobaraza/repos?sort=pushed&per_page=100")
    .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
    .then((repos) => {
      const top = repos
        .filter((repo) => !repo.fork && !repo.private && !repo.archived && !EXCLUDED_REPOS.has(repo.name))
        .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
        .slice(0, 4);

      if (!top.length) return;

      return Promise.all(top.map((repo) => fetchTopLanguages(repo))).then((stats) => {
        // Now that repo stations precede it, "browse the rest" reads correctly
        // instead of the plain fallback wording used when it's the only extra stop.
        const moreDesc = moreStation.querySelector('[data-i18n="proj-more-desc"]');
        if (moreDesc) {
          moreDesc.dataset.i18n = "proj-more-desc-live";
          moreDesc.innerHTML = window.i18n.t("proj-more-desc-live");
        }

        top.forEach((repo, i) => journeyMap.insertBefore(buildRepoStation(repo, stats[i]), moreStation));

        renderDates();
        placeLanguageCharts();
        flow.rebuild();
      });
    })
    .catch(() => {
      // Network error, rate limit, or no JS: the static stations stay as they are
    });
}

// ---------------------------------------------------------------------------
// Apps: deployed version and release date from each app's own /version.json (open CORS).
// An app that isn't live yet, or can't be reached, just gets no badge/date. App stations are then
// sorted by releaseDate (YYYY-MM-DD), oldest first, undated last, and always stay ahead of the
// project stations; the flow follows whatever order they end up in.
// ---------------------------------------------------------------------------
const SORT_APPS_NEWEST_FIRST = false;
const appStations = [...document.querySelectorAll("[data-version-url]")];

const loadAppMeta = (station) =>
  fetch(station.dataset.versionUrl)
    .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
    .then(({ version, releaseDate }) => {
      if (typeof version === "string" && /^\d+\.\d+\.\d+[\w.+-]*$/.test(version)) {
        const badge = document.createElement("span");
        badge.className = "station__badge";
        badge.textContent = `v${version}`;
        station.querySelector(".station__icon").appendChild(badge);
      }
      if (typeof releaseDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) {
        station.dataset.releaseDate = releaseDate;
        Object.assign(station.querySelector(".station__date").dataset, {
          date: releaseDate,
          dateLabel: "label-released",
          dateFormat: "day",
        });
      }
    })
    .catch(() => {});

Promise.all(appStations.map(loadAppMeta)).then(() => {
  const dir = SORT_APPS_NEWEST_FIRST ? -1 : 1;
  const sorted = [...appStations].sort((a, b) => {
    const da = a.dataset.releaseDate, db = b.dataset.releaseDate;
    if (!da || !db) return !da - !db; // undated last
    return da < db ? -dir : da > db ? dir : 0; // stable: ties keep page order
  });
  // Everything that isn't an app (Tapeo Dev, repos, More on GitHub) stays after them.
  const firstProject = journeyMap.querySelector(".station--project, .station--more");
  sorted.forEach((station, i) => {
    station.style.setProperty("--i", i + 1);
    journeyMap.insertBefore(station, firstProject);
  });
  renderDates();
  placeLanguageCharts();
  flow.rebuild();
});

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
// following the link, and any other tap (or Escape) closes it. The title and text still follow the
// link. Only a touch pointer is intercepted: a mouse click or the keyboard (including on a touch
// laptop) keeps its normal behavior. One delegated listener covers stations added later too.
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
  closeLanguageCharts();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeLanguageCharts();
});
