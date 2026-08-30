document.getElementById("year").textContent = new Date().getFullYear();

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Scroll-reveal animations
const revealEls = document.querySelectorAll(".reveal");

if (reducedMotion || !("IntersectionObserver" in window)) {
  revealEls.forEach((el) => el.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver(
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

  revealEls.forEach((el) => revealObserver.observe(el));
}

// Nav: shadow on scroll + scrollspy active link
const nav = document.querySelector(".nav");
const navLinks = document.querySelectorAll(".nav__links a");
const sections = document.querySelectorAll("main .section, .hero, .footer");

const setActiveLink = (id) => {
  navLinks.forEach((link) => {
    link.classList.toggle("is-active", link.getAttribute("href") === `#${id}`);
  });
};

window.addEventListener(
  "scroll",
  () => {
    nav.classList.toggle("is-scrolled", window.scrollY > 10);
  },
  { passive: true }
);

if ("IntersectionObserver" in window && sections.length) {
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveLink(entry.target.id === "top" ? "top" : entry.target.id);
        }
      });
    },
    { rootMargin: "-45% 0px -45% 0px" }
  );

  sections.forEach((section) => spy.observe(section));
}

// Collapsible timeline entries
document.querySelectorAll(".timeline__toggle").forEach((btn) => {
  btn.addEventListener("click", () => {
    const item = btn.closest(".timeline__item");
    const expanded = item.classList.toggle("is-expanded");
    btn.setAttribute("aria-expanded", String(expanded));
    btn.querySelector("span").textContent = window.i18n.t(expanded ? "tl-hide-details" : "tl-show-details");
  });
});

// Career-arc pipeline: jump to (and expand) the matching experience entry
let cancelPendingHighlight = null;

document.querySelectorAll(".pipeline__node[data-target]").forEach((node) => {
  node.addEventListener("click", () => {
    const target = document.getElementById(node.dataset.target);
    if (!target) return;

    if (cancelPendingHighlight) cancelPendingHighlight();

    target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });

    const toggle = target.querySelector('.timeline__toggle[aria-expanded="false"]');
    if (toggle) toggle.click();

    const highlight = () => {
      target.classList.remove("is-jumped");
      void target.offsetWidth;
      target.classList.add("is-jumped");
    };

    if (reducedMotion) {
      highlight();
      return;
    }

    // Wait for the smooth scroll to actually arrive before pulsing, so distant
    // nodes don't finish the highlight animation before the scroll gets there.
    // Falls back to a timer if scrollend isn't supported or nothing needed scrolling.
    const onScrollEnd = () => {
      clearTimeout(fallback);
      highlight();
    };
    const fallback = setTimeout(() => {
      document.removeEventListener("scrollend", onScrollEnd);
      highlight();
    }, 1200);

    document.addEventListener("scrollend", onScrollEnd, { once: true });
    cancelPendingHighlight = () => {
      clearTimeout(fallback);
      document.removeEventListener("scrollend", onScrollEnd);
    };
  });
});

// Career-arc pipeline: switch to a top-down layout the instant the row of
// stages would actually overflow, rather than at some guessed viewport width -
// a long name/font or a short-but-wide window can overflow just as easily as
// a narrow phone.
const pipeline = document.querySelector(".pipeline");

if (pipeline) {
  const updatePipelineLayout = () => {
    pipeline.classList.remove("pipeline--vertical");

    // Don't use scrollWidth here: the "that's me now!" annotation on the
    // current node is absolutely positioned and pokes out past the row on
    // purpose (it's allowed to bleed into the surrounding whitespace), which
    // would otherwise read as overflow that isn't really there. Instead sum
    // what the row actually needs - nodes at their natural width (they never
    // shrink or grow) plus each link's CSS min-width (the narrowest a link
    // can go before nodes start colliding) - and compare to the space available.
    const cs = getComputedStyle(pipeline);
    let required = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    pipeline.querySelectorAll(".pipeline__node").forEach((node) => {
      required += node.offsetWidth;
    });
    pipeline.querySelectorAll(".pipeline__link").forEach((link) => {
      required += parseFloat(getComputedStyle(link).minWidth) || 0;
    });

    const overflowing = required > pipeline.clientWidth + 1;
    pipeline.classList.toggle("pipeline--vertical", overflowing);
  };

  updatePipelineLayout();

  let resizeFrame = null;
  const scheduleUpdate = () => {
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(updatePipelineLayout);
  };

  window.addEventListener("resize", scheduleUpdate);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(updatePipelineLayout);
  }
  // Node label widths change with the language (translations apply after this
  // runs, and again on every toggle), so re-measure whenever they do.
  document.addEventListener("langchange", updatePipelineLayout);
}

// Stack <-> experience filtering
const stackChips = document.querySelectorAll(".stack .chip");
const stackContainer = document.querySelector(".stack");
const timelineList = document.querySelector(".timeline");
const timelineItems = document.querySelectorAll(".timeline__item");

timelineItems.forEach((item) => {
  const stackEl = item.querySelector(".timeline__stack");
  if (stackEl) {
    stackEl.dataset.original = stackEl.innerHTML;
  }
});

const clearFilter = () => {
  stackChips.forEach((chip) => chip.classList.remove("is-active"));
  stackContainer.classList.remove("has-active");
  timelineList.classList.remove("has-filter");
  timelineItems.forEach((item) => {
    item.classList.remove("is-match");
    const stackEl = item.querySelector(".timeline__stack");
    if (stackEl && stackEl.dataset.original) {
      stackEl.innerHTML = stackEl.dataset.original;
    }
  });
};

const applyFilter = (skill) => {
  timelineList.classList.add("has-filter");
  timelineItems.forEach((item) => {
    const stackEl = item.querySelector(".timeline__stack");
    const stack = stackEl ? stackEl.dataset.original.split("·").map((s) => s.trim()) : [];
    const isMatch = stack.includes(skill);
    item.classList.toggle("is-match", isMatch);
    if (stackEl) {
      stackEl.innerHTML = stackEl.dataset.original.replace(
        new RegExp(`(^|·\\s*)(${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(\\s*·|$)`),
        (match, before, name, after) => `${before}<mark>${name}</mark>${after}`
      );
    }
  });
};

stackChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    const alreadyActive = chip.classList.contains("is-active");
    clearFilter();
    if (!alreadyActive) {
      chip.classList.add("is-active");
      stackContainer.classList.add("has-active");
      applyFilter(chip.textContent.trim());
    }
  });
});

// Copy-to-clipboard email buttons
if (navigator.clipboard) {
  document.querySelectorAll(".copy-email").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const email = el.href.replace(/^mailto:/, "");
      navigator.clipboard.writeText(email).then(() => {
        const label = el.dataset.defaultLabel;
        el.textContent = window.i18n.t("copied");
        el.classList.add("is-copied");
        clearTimeout(el._copyTimeout);
        el._copyTimeout = setTimeout(() => {
          el.textContent = label;
          el.classList.remove("is-copied");
        }, 1600);
      });
    });
  });
}

// Manual dark/light theme toggle
const themeToggle = document.getElementById("theme-toggle");

const getEffectiveTheme = () => {
  const stored = document.documentElement.getAttribute("data-theme");
  if (stored) return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
};

const updateToggleLabel = () => {
  const current = getEffectiveTheme();
  themeToggle.setAttribute("aria-label", window.i18n.t(current === "light" ? "theme-to-dark" : "theme-to-light"));
};

updateToggleLabel();
document.addEventListener("langchange", updateToggleLabel);

themeToggle.addEventListener("click", () => {
  const next = getEffectiveTheme() === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
  updateToggleLabel();
});

// Project card spotlight hover effect
const addSpotlight = (card) => {
  if (reducedMotion) return;
  card.addEventListener("mousemove", (e) => {
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--x", `${e.clientX - rect.left}px`);
    card.style.setProperty("--y", `${e.clientY - rect.top}px`);
  });
};

document.querySelectorAll(".project-card").forEach(addSpotlight);

// Live GitHub project cards (falls back to the static cards above on failure)
const projectsContainer = document.querySelector(".projects");
const EXCLUDED_REPOS = new Set(["albertobaraza", "albertobaraza.github.io"]);

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
};
const DEFAULT_THUMB_COLOR = "#22d3ee";

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
const buildThumb = (repo, languages) => {
  const thumb = document.createElement("div");
  thumb.className = "project-card__thumb";

  const color = LANGUAGE_COLORS[languages[0]?.[0]] || DEFAULT_THUMB_COLOR;
  thumb.style.background = color;

  const label = document.createElement("span");
  label.style.color = getReadableTextColor(color);
  label.textContent = getInitials(repo.name);
  thumb.appendChild(label);

  const img = new Image();
  img.alt = "";
  img.onload = () => {
    thumb.style.background = "";
    thumb.innerHTML = "";
    thumb.appendChild(img);
  };
  img.src = `assets/projects/${repo.name}.png`;

  return thumb;
};

const buildMetaRow = (repo) => {
  const items = [];
  if (repo.pushed_at) {
    const updated = new Date(repo.pushed_at).toLocaleDateString("en-US", { month: "short", year: "numeric" });
    items.push(["icon-calendar", `Updated ${updated}`]);
  }

  if (!items.length) return null;

  const meta = document.createElement("ul");
  meta.className = "project-card__meta";
  items.forEach(([iconId, label]) => {
    const li = document.createElement("li");
    li.innerHTML = `<svg class="project-card__meta-icon" aria-hidden="true"><use href="#${iconId}"/></svg>`;
    li.append(label);
    meta.appendChild(li);
  });
  return meta;
};

// Donut chart of per-language byte share, using the same GitHub linguist
// colors as the thumbnail. Long tails beyond MAX_SLICES collapse into "Other".
const MAX_RING_SLICES = 5;
const buildLanguageRing = (languages) => {
  const total = languages.reduce((sum, [, bytes]) => sum + bytes, 0);
  if (!total) return null;

  const top = languages.slice(0, MAX_RING_SLICES);
  const otherBytes = languages.slice(MAX_RING_SLICES).reduce((sum, [, bytes]) => sum + bytes, 0);
  const slices = otherBytes > 0 ? [...top, ["Other", otherBytes]] : top;

  let cursor = 0;
  const stops = slices.map(([name, bytes]) => {
    const start = (cursor / total) * 100;
    cursor += bytes;
    const end = (cursor / total) * 100;
    const color = LANGUAGE_COLORS[name] || DEFAULT_THUMB_COLOR;
    return `${color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
  });

  const ring = document.createElement("div");
  ring.className = "project-card__ring";
  ring.style.background = `conic-gradient(${stops.join(", ")})`;
  ring.title = slices.map(([name, bytes]) => `${name} ${((bytes / total) * 100).toFixed(1)}%`).join(" · ");
  return ring;
};

if (projectsContainer) {
  fetch("https://api.github.com/users/albertobaraza/repos?sort=pushed&per_page=100")
    .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
    .then((repos) => {
      const top = repos
        .filter((repo) => !repo.fork && !repo.private && !repo.archived && !EXCLUDED_REPOS.has(repo.name))
        .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
        .slice(0, 4);

      if (!top.length) return;

      return Promise.all(top.map((repo) => fetchTopLanguages(repo))).then((stats) => {
        const pinnedCard = projectsContainer.querySelector(".project-card--pinned");

        top.forEach((repo, i) => {
          const languages = stats[i];

          const card = document.createElement("a");
          card.className = "project-card reveal is-visible";
          card.style.setProperty("--i", String(i + 1));
          card.href = repo.html_url;
          card.target = "_blank";
          card.rel = "noopener";

          const title = document.createElement("h3");
          title.textContent = `${repo.name} `;
          const arrow = document.createElement("span");
          arrow.className = "project-card__arrow";
          arrow.textContent = "↗";
          title.appendChild(arrow);

          const desc = document.createElement("p");
          desc.textContent = repo.description || window.i18n.t("proj-no-description");

          const body = document.createElement("div");
          body.className = "project-card__body";
          body.append(title, desc);

          const meta = buildMetaRow(repo);
          if (meta) body.appendChild(meta);

          const ring = buildLanguageRing(languages);
          card.append(buildThumb(repo, languages), body, ...(ring ? [ring] : []));

          addSpotlight(card);
          projectsContainer.insertBefore(card, pinnedCard);
        });
      });
    })
    .catch(() => {
      // Network error, rate limit, or no JS: the pinned "More on GitHub" card stays as-is
    });
}
