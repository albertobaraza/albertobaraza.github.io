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
    btn.querySelector("span").textContent = expanded ? "Hide details" : "Show details";
  });
});

// Career-arc pipeline: jump to (and expand) the matching experience entry
document.querySelectorAll(".pipeline__node[data-target]").forEach((node) => {
  node.addEventListener("click", () => {
    const target = document.getElementById(node.dataset.target);
    if (!target) return;

    target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });

    const toggle = target.querySelector('.timeline__toggle[aria-expanded="false"]');
    if (toggle) toggle.click();

    target.classList.remove("is-jumped");
    void target.offsetWidth;
    target.classList.add("is-jumped");
  });
});

// Skill <-> experience filtering
const skillChips = document.querySelectorAll(".skills .chip");
const skillsContainer = document.querySelector(".skills");
const timelineList = document.querySelector(".timeline");
const timelineItems = document.querySelectorAll(".timeline__item");

timelineItems.forEach((item) => {
  const stackEl = item.querySelector(".timeline__stack");
  if (stackEl) {
    stackEl.dataset.original = stackEl.innerHTML;
  }
});

const clearFilter = () => {
  skillChips.forEach((chip) => chip.classList.remove("is-active"));
  skillsContainer.classList.remove("has-active");
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

skillChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    const alreadyActive = chip.classList.contains("is-active");
    clearFilter();
    if (!alreadyActive) {
      chip.classList.add("is-active");
      skillsContainer.classList.add("has-active");
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
if (!reducedMotion) {
  document.querySelectorAll(".project-card").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--x", `${e.clientX - rect.left}px`);
      card.style.setProperty("--y", `${e.clientY - rect.top}px`);
    });
  });
}
