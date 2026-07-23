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

// Draggable sticky note
const stickyNote = document.querySelector(".hero__eyebrow");
const stickyHand = document.querySelector(".hero__eyebrow-hand");

if (stickyNote) {
  const DRAG_THRESHOLD = 6; // px of movement before a tap counts as a drag
  const DOUBLE_TAP_WINDOW = 400; // ms between taps to count as "quick"

  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let downX = 0;
  let downY = 0;
  let downOnHand = false;
  let moved = false;
  let lastHandTapTime = 0;

  stickyNote.addEventListener("pointerdown", (e) => {
    const rect = stickyNote.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    downX = e.clientX;
    downY = e.clientY;
    downOnHand = Boolean(stickyHand && (e.target === stickyHand || stickyHand.contains(e.target)));
    moved = false;

    // Reparent to <body> so it escapes the hero's stacking context and
    // always renders above every other element, not just its old siblings.
    document.body.appendChild(stickyNote);

    stickyNote.style.position = "absolute";
    stickyNote.style.margin = "0";
    stickyNote.style.left = `${rect.left + window.scrollX}px`;
    stickyNote.style.top = `${rect.top + window.scrollY}px`;

    stickyNote.classList.add("is-dragging");
    stickyNote.setPointerCapture(e.pointerId);
  });

  stickyNote.addEventListener("pointermove", (e) => {
    if (!stickyNote.classList.contains("is-dragging")) return;
    if (Math.abs(e.clientX - downX) > DRAG_THRESHOLD || Math.abs(e.clientY - downY) > DRAG_THRESHOLD) {
      moved = true;
    }
    stickyNote.style.left = `${e.clientX - dragOffsetX + window.scrollX}px`;
    stickyNote.style.top = `${e.clientY - dragOffsetY + window.scrollY}px`;
  });

  const triggerClap = () => {
    const rect = stickyHand.getBoundingClientRect();
    const clap = document.createElement("span");
    clap.className = "clap-pop";
    clap.textContent = "👏";
    clap.style.left = `${rect.left + rect.width / 2}px`;
    clap.style.top = `${rect.top}px`;
    // Appended to <body>, not the hand, so it escapes the note's clip-path
    // instead of being clipped as it animates outside the note's bounds.
    document.body.appendChild(clap);
    clap.addEventListener("animationend", () => clap.remove());
  };

  const stopDragging = (e) => {
    stickyNote.classList.remove("is-dragging");
    stickyNote.releasePointerCapture(e.pointerId);

    if (!moved && downOnHand) {
      const now = Date.now();
      if (now - lastHandTapTime < DOUBLE_TAP_WINDOW) {
        triggerClap();
        lastHandTapTime = 0;
      } else {
        lastHandTapTime = now;
      }
    }
  };

  stickyNote.addEventListener("pointerup", stopDragging);
  stickyNote.addEventListener("pointercancel", stopDragging);
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
    btn.querySelector("span").textContent = expanded ? "Hide details" : "Show details";
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
        el.textContent = "Copied!";
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
  themeToggle.setAttribute("aria-label", current === "light" ? "Switch to dark theme" : "Switch to light theme");
};

updateToggleLabel();

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

// Total commit count via the `rel="last"` page number of a per_page=1 request
// (avoids paging through full commit history just to count it).
const fetchCommitCount = (repo) => {
  const commitsUrl = repo.commits_url.replace("{/sha}", "");
  return fetch(`${commitsUrl}?per_page=1`)
    .then((res) => {
      if (!res.ok) return null;
      const link = res.headers.get("link");
      if (link) {
        const match = link.match(/[?&]page=(\d+)>;\s*rel="last"/);
        if (match) return Number(match[1]);
      }
      return res.json().then((commits) => commits.length);
    })
    .catch(() => null);
};

const fetchTopLanguages = (repo) =>
  fetch(repo.languages_url)
    .then((res) => (res.ok ? res.json() : {}))
    .then((bytesByLanguage) =>
      Object.entries(bytesByLanguage)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([name]) => name)
    )
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

  const color = LANGUAGE_COLORS[languages[0]] || DEFAULT_THUMB_COLOR;
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

const buildMetaRow = (repo, commitCount, languages) => {
  const items = [];
  const year = new Date(repo.created_at).getFullYear();
  if (year) items.push(["icon-calendar", String(year)]);
  if (commitCount) items.push(["icon-commit", `${commitCount} commit${commitCount === 1 ? "" : "s"}`]);
  if (languages.length) items.push(["icon-code", languages.join(" · ")]);

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

if (projectsContainer) {
  fetch("https://api.github.com/users/albertobaraza/repos?sort=pushed&per_page=100")
    .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
    .then((repos) => {
      const top = repos
        .filter((repo) => !repo.fork && !repo.private && !repo.archived && !EXCLUDED_REPOS.has(repo.name))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 4);

      if (!top.length) return;

      return Promise.all(
        top.map((repo) => Promise.all([fetchCommitCount(repo), fetchTopLanguages(repo)]))
      ).then((stats) => {
        projectsContainer.innerHTML = "";

        top.forEach((repo, i) => {
          const [commitCount, languages] = stats[i];

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
          desc.textContent = repo.description || "No description provided.";

          const body = document.createElement("div");
          body.className = "project-card__body";
          body.append(title, desc);

          const meta = buildMetaRow(repo, commitCount, languages);
          if (meta) body.appendChild(meta);

          card.append(buildThumb(repo, languages), body);

          addSpotlight(card);
          projectsContainer.appendChild(card);
        });
      });
    })
    .catch(() => {
      // Network error, rate limit, or no JS: static fallback cards stay in place
    });
}
