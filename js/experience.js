// Experience page: timeline, career pipeline and stack filter. Uses
// `reducedMotion` from main.js.

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
