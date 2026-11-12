// Hanging navigation, shared by every page. Each control (.hang) hangs from the top edge of the
// window on its own rope. The ropes are simulated here; the controls themselves stay ordinary
// links and buttons, this file only moves them (CSS transform) and draws the ropes (SVG).
//
// Per control: a chain of rope points pinned to the top edge, then a "body" point hanging below
// the attach point at the tag's eyelet. Verlet integration + distance constraints give a rope
// that bends and a tag that swings like a pendulum. Scroll speed pushes everything sideways like
// wind. Hovering a tag only gives it a tiny nudge; the real interaction is grabbing it (click and
// drag with the mouse, or press and drag with a finger without lifting it) and flinging it. A
// control that has stopped moving goes to sleep so an idle page costs nothing. Uses
// `reducedMotion` from main.js: with reduced motion the ropes are drawn once, straight, and
// nothing moves.
(() => {
  const nav = document.querySelector(".nav");
  const svg = nav && nav.querySelector(".nav__ropes");
  if (!nav || !svg) return;

  const SEGMENTS = 7; // links per rope
  const RATE = 120; // physics substeps per second
  const STEP = 1 / RATE;
  const GRAVITY = 0.12; // px per substep² (about 1700 px/s²)
  const DAMPING = 0.9965; // share of velocity kept each substep (air drag)
  const CALM_ENERGY = 0.9; // below this total speed the swing is barely visible...
  const CALM_DAMPING = 0.985; // ...so friction is much stronger and it dies out quickly
  const ITERATIONS = 8; // constraint passes per substep
  const WIND = 0.0009; // sideways acceleration per px/frame of scroll speed
  const MAX_SCROLL_SPEED = 60; // px/frame, caps the wind
  const ANCHOR_Y = -12; // ropes start just above the window so they appear to come from outside
  const DRAG_THRESHOLD = 5; // px of mouse travel before a press becomes a drag (and not a click)
  const TOUCH_DRAG_THRESHOLD = 10; // fingers jitter more than a mouse, so a tap gets more slack
  const HOVER_NUDGE = 0.07; // sideways velocity (px/substep) when the cursor arrives: about a 2° sway
  const HOVER_COOLDOWN = 600; // ms before the same control can be nudged again

  const SVG_NS = "http://www.w3.org/2000/svg";
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const particle = (x, y, invMass, wind) => ({ x, y, px: x, py: y, inv: invMass, wind });

  let items = [];
  let raf = 0;
  let last = 0;
  let accumulator = 0;
  let pendingScroll = 0;
  let lastScrollY = window.scrollY;
  let smoothScroll = 0;
  let firstBuild = true;

  // Where an element sits at rest, relative to the nav. offset* ignores transforms, so this is
  // correct even while the control is swinging.
  const restBox = (el) => {
    let x = 0;
    let y = 0;
    for (let node = el; node && node !== nav; node = node.offsetParent) {
      x += node.offsetLeft;
      y += node.offsetTop;
    }
    return { x, y, w: el.offsetWidth, h: el.offsetHeight };
  };

  const makePath = (className) => {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("class", className);
    svg.appendChild(path);
    return path;
  };

  const buildItem = (el, index) => {
    const box = restBox(el);
    const cx = box.x + box.w / 2;
    const top = box.y; // the attach point: top edge, centered
    const ropeLength = top - ANCHOR_Y;
    const link = ropeLength / SEGMENTS;
    const bodyLength = Math.max(14, box.h * 0.55);

    // anchor (fixed), SEGMENTS rope links, attach point (the last rope point), then the body
    const pts = [particle(cx, ANCHOR_Y, 0, 0)];
    for (let i = 1; i <= SEGMENTS; i++) {
      pts.push(particle(cx, ANCHOR_Y + link * i, i === SEGMENTS ? 0.5 : 1, i / SEGMENTS));
    }
    const attach = pts[pts.length - 1];
    const body = particle(cx, top + bodyLength, 0.2, 1.2);
    pts.push(body);

    const constraints = pts.slice(0, -1).map((a, i) => ({
      a,
      b: pts[i + 1],
      length: i < SEGMENTS ? link : bodyLength,
    }));

    const nail = document.createElementNS(SVG_NS, "circle");
    nail.setAttribute("class", "nail");
    nail.setAttribute("cx", cx);
    nail.setAttribute("cy", 2);
    nail.setAttribute("r", 2.8);
    svg.appendChild(nail);

    return {
      el,
      pts,
      constraints,
      attach,
      body,
      rest: { x: cx, y: top },
      ropeLength,
      // each control reacts to the wind a little differently
      gain: 0.85 + 0.3 * ((Math.sin(index * 12.9898 + 1.7) + 1) / 2),
      strand: makePath("rope"),
      twist: makePath("rope rope--twist"),
      nail,
      restPose: pts.map((p) => [p.x, p.y]),
      energy: 1,
      still: 0,
      asleep: false,
      needsRender: false,
      lastNudge: 0,
      drag: null,
    };
  };

  // ------------------------------------------------------------------ physics

  const relax = ({ a, b, length }) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy) || 1e-6;
    const w = a.inv + b.inv;
    if (!w) return;
    const diff = (dist - length) / dist;
    a.x += (dx * diff * a.inv) / w;
    a.y += (dy * diff * a.inv) / w;
    b.x -= (dx * diff * b.inv) / w;
    b.y -= (dy * diff * b.inv) / w;
  };

  const simulate = (item, wind) => {
    const { pts, constraints, attach, drag } = item;
    const damping = !drag && item.energy < CALM_ENERGY ? CALM_DAMPING : DAMPING;

    for (const p of pts) {
      if (!p.inv) continue;
      const vx = (p.x - p.px) * damping;
      const vy = (p.y - p.py) * damping;
      p.px = p.x;
      p.py = p.y;
      p.x += vx + wind * p.wind;
      p.y += vy + GRAVITY;
    }

    if (drag) {
      attach.x += (drag.x - attach.x) * 0.55;
      attach.y += (drag.y - attach.y) * 0.55;
    }

    for (let k = 0; k < ITERATIONS; k++) constraints.forEach(relax);

    // fall asleep once everything has stopped moving
    let energy = 0;
    for (const p of pts) if (p.inv) energy += Math.abs(p.x - p.px) + Math.abs(p.y - p.py);
    item.energy = energy;
    item.still = !drag && wind === 0 && energy < 0.025 * pts.length ? item.still + 1 : 0;
    if (item.still > RATE / 2) sleep(item);
  };

  // Hanging straight down is the true equilibrium, so snapping there is invisible and guarantees
  // a control is never left at a slightly crooked angle.
  const sleep = (item) => {
    item.pts.forEach((p, i) => {
      p.x = p.px = item.restPose[i][0];
      p.y = p.py = item.restPose[i][1];
    });
    item.energy = 0;
    item.asleep = true;
    item.needsRender = true;
  };

  const wake = (item) => {
    item.asleep = false;
    item.still = 0;
    item.energy = 1;
  };

  // add sideways velocity to a swinging control (Verlet velocity = position - previous position)
  const kick = (item, vx) => {
    for (const p of item.pts) if (p.inv) p.px -= vx * p.wind;
    wake(item);
    ensureLoop();
  };

  // ------------------------------------------------------------------ drawing

  const ropeD = (pts) => {
    let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2;
      const my = (pts[i].y + pts[i + 1].y) / 2;
      d += `Q${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
    }
    const end = pts[pts.length - 1];
    return d + `L${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
  };

  const render = (item) => {
    const { attach, body, rest, el } = item;
    // 0 when the body hangs straight down; CSS rotates clockwise, so swinging right is negative
    const angle = -Math.atan2(body.x - attach.x, body.y - attach.y);
    el.style.transform = `translate(${(attach.x - rest.x).toFixed(2)}px, ${(attach.y - rest.y).toFixed(2)}px) rotate(${angle.toFixed(4)}rad)`;
    const d = ropeD(item.pts.slice(0, SEGMENTS + 1));
    item.strand.setAttribute("d", d);
    item.twist.setAttribute("d", d);
  };

  const renderStatic = (item) => {
    const d = `M${item.rest.x} ${ANCHOR_Y}L${item.rest.x} ${item.rest.y}`;
    item.strand.setAttribute("d", d);
    item.twist.setAttribute("d", d);
  };

  // ------------------------------------------------------------------ loop

  const frame = (now) => {
    raf = 0;
    const dt = clamp((now - last) / 1000, 0, 0.05);
    last = now;

    smoothScroll += (pendingScroll - smoothScroll) * 0.3;
    pendingScroll = 0;
    if (Math.abs(smoothScroll) < 0.02) smoothScroll = 0;
    const wind = clamp(smoothScroll, -MAX_SCROLL_SPEED, MAX_SCROLL_SPEED) * WIND;
    if (wind !== 0) items.forEach(wake);

    accumulator += dt;
    while (accumulator >= STEP) {
      accumulator -= STEP;
      for (const item of items) if (!item.asleep) simulate(item, wind * item.gain);
    }

    let active = wind !== 0;
    for (const item of items) {
      if (!item.asleep) {
        render(item);
        active = true;
      } else if (item.needsRender) {
        item.needsRender = false; // one last draw at the exact rest pose
        render(item);
      }
    }
    if (active) raf = requestAnimationFrame(frame);
  };

  function ensureLoop() {
    if (reducedMotion || raf) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  // ------------------------------------------------------------------ pointer: brush, grab, fling

  // Bound once per element. build() makes fresh items on every rebuild (resize, language change),
  // so the handlers look up the element's *current* item when an event fires.
  const attachPointer = (el) => {
    el.addEventListener("dragstart", (e) => e.preventDefault());

    // Hovering is deliberately gentle: one tiny nudge away from where the cursor arrives, with a
    // cooldown so sweeping back and forth can't build up a swing. Grabbing is the real physics.
    el.addEventListener("pointerenter", (e) => {
      const item = el.hangItem;
      if (!item || e.pointerType !== "mouse" || item.drag || e.buttons) return;
      const now = performance.now();
      if (now - item.lastNudge < HOVER_COOLDOWN || item.energy > 1) return;
      item.lastNudge = now;
      const box = el.getBoundingClientRect();
      const away = e.clientX < box.left + box.width / 2 ? 1 : -1; // pushed away from the cursor
      kick(item, away * HOVER_NUDGE);
    });

    // True while a finger or pen is down on this control. A long press on a link would open the
    // browser's context menu (and cancel the gesture), which would kill a "hold, then drag".
    let touching = false;
    el.addEventListener("contextmenu", (e) => {
      if (touching) e.preventDefault();
    });

    el.addEventListener("pointerdown", (e) => {
      const item = el.hangItem;
      if (!item || touching || e.button !== 0) return;
      const isMouse = e.pointerType === "mouse";
      touching = !isMouse;
      const threshold = isMouse ? DRAG_THRESHOLD : TOUCH_DRAG_THRESHOLD;
      const press = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        grabX: e.clientX - item.attach.x,
        grabY: e.clientY - item.attach.y,
        moved: false,
        vx: 0,
        vy: 0,
        lastX: e.clientX,
        lastY: e.clientY,
        lastT: e.timeStamp,
      };

      const onMove = (ev) => {
        if (ev.pointerId !== press.id) return;
        if (!press.moved) {
          if (Math.hypot(ev.clientX - press.x, ev.clientY - press.y) < threshold) return;
          press.moved = true;
          item.attach.inv = 0; // pinned to the pointer while held
          item.drag = { x: item.attach.x, y: item.attach.y };
          document.documentElement.classList.add("is-dragging-hang");
          try { el.setPointerCapture(press.id); } catch (err) { /* not capturable: fine */ }
          wake(item);
          ensureLoop();
        }
        // follow the pointer, but never farther from the anchor than the rope is long
        const ax = item.pts[0].x;
        const ay = item.pts[0].y;
        let tx = ev.clientX - press.grabX;
        let ty = ev.clientY - press.grabY;
        const reach = item.ropeLength * 0.98;
        const len = Math.hypot(tx - ax, ty - ay);
        if (len > reach) {
          tx = ax + ((tx - ax) * reach) / len;
          ty = ay + ((ty - ay) * reach) / len;
        }
        item.drag.x = tx;
        item.drag.y = ty;

        const dtMs = Math.max(1, ev.timeStamp - press.lastT);
        press.vx = press.vx * 0.6 + ((ev.clientX - press.lastX) / dtMs) * 0.4;
        press.vy = press.vy * 0.6 + ((ev.clientY - press.lastY) / dtMs) * 0.4;
        press.lastX = ev.clientX;
        press.lastY = ev.clientY;
        press.lastT = ev.timeStamp;
      };

      const onUp = (ev) => {
        if (ev.pointerId !== press.id) return;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        touching = false;
        if (!press.moved) return; // a plain click or tap: let it through

        // fling: release with the pointer's velocity
        const perSubstep = 1000 / RATE;
        item.drag = null;
        item.attach.inv = 0.5;
        item.attach.px = item.attach.x - clamp(press.vx * perSubstep, -6, 6);
        item.attach.py = item.attach.y - clamp(press.vy * perSubstep, -6, 6);
        document.documentElement.classList.remove("is-dragging-hang");
        wake(item);
        ensureLoop();

        // the release would otherwise count as a click on the link/button under the pointer
        const swallow = (clickEvent) => {
          clickEvent.preventDefault();
          clickEvent.stopPropagation();
        };
        el.addEventListener("click", swallow, { capture: true, once: true });
        setTimeout(() => el.removeEventListener("click", swallow, true), 80);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    });
  };

  // ------------------------------------------------------------------ build

  const build = () => {
    items.forEach((item) => {
      item.el.style.transform = "";
    });
    svg.replaceChildren();

    const elements = [...nav.querySelectorAll(".hang")].filter((el) => el.offsetParent !== null);
    items = elements.map(buildItem);
    nav.classList.add("has-ropes");

    items.forEach((item) => {
      item.el.hangItem = item;
      if (!item.el.dataset.hangBound) {
        item.el.dataset.hangBound = "1";
        if (!reducedMotion) attachPointer(item.el);
      }
    });

    if (reducedMotion) {
      items.forEach(renderStatic);
      return;
    }
    items.forEach(render);

    if (firstBuild) {
      firstBuild = false;
      // a little life on arrival: the controls sway gently and settle
      setTimeout(() => items.forEach((item, i) => kick(item, (i % 2 ? -1 : 1) * (0.5 + 0.2 * (i % 3)))), 350);
    }
  };

  let buildFrame = 0;
  const rebuild = () => {
    if (buildFrame) return;
    buildFrame = requestAnimationFrame(() => {
      buildFrame = 0;
      build();
    });
  };

  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY;
      pendingScroll += y - lastScrollY;
      lastScrollY = y;
      ensureLoop();
    },
    { passive: true }
  );
  // Phones fire `resize` whenever the address bar slides in or out, which happens while scrolling
  // (most of all when scrolling up). Only the height changes then, and nothing here depends on
  // the height, but a rebuild throws the whole simulation away and snaps every swinging control
  // back to hanging straight. So only a change of width (rotating the phone, resizing a window)
  // re-measures the ropes.
  let builtWidth = window.innerWidth;
  window.addEventListener("resize", () => {
    if (window.innerWidth === builtWidth) return;
    builtWidth = window.innerWidth;
    rebuild();
  });
  window.addEventListener("load", rebuild);
  document.addEventListener("langchange", rebuild);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(rebuild);

  build();
})();
