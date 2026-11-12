// Easter egg, Projects page only: a duck is hiding under the very last corner of the page.
//
// Scroll to the end and hover the bottom-right corner (a finger taps it instead: it has no hover):
// the corner lifts a little. Grab it and pull it up and to the left: the page peels, and the duck
// shows through the hole. Pull it far enough and the corner stays folded over, exactly where it was
// pulled (it only settles the last few pixels into its final fold): it can't be dragged any more, the
// duck hops out and says hello. Let go too early and the corner springs back, bounces, and sticks
// down again.
//
// The geometry is a real fold. The corner C is pulled to a tip P; the crease is the perpendicular
// bisector of C-P, which crosses the bottom edge at A and the right edge at B. What is revealed is
// the triangle C-A-B (what is under the page), and the flap lying on the page is the triangle
// P-A-B (the back of the paper). Everything is measured from the corner: `s` is how far left of it,
// `t` how far above it, in the units of the 310 x 310 design box of the markup (a window narrower
// than that scales it down with --k).
//
// The tip is simulated like the hanging tags of nav.js: fixed substeps, and a held tip follows the
// pointer closely but lags behind a little, the page resisting more the farther it is pulled.
// Released, it is a damped spring back to where it was resting, so it overshoots and bounces; a
// quick flick can carry it past the point where it locks. The tip is kept as a distance `r` from the
// corner and an angle `th` (not as s and t), so a fold never degenerates when the pull is nearly
// along one edge. When the switch in the nav has turned the motion off (`html.nav-still`, which a
// system asking for reduced motion sets too) the pull is still yours to make, but nothing bounces,
// hops or sways: the flap follows exactly, goes back at once, and is in its final fold at once.
(() => {
  const root = document.getElementById("peel");
  if (!root) return;
  const zone = root.querySelector(".peel__zone");
  const say = root.querySelector(".peel__say");
  const byId = (id) => document.getElementById(id);
  const holePoly = byId("peel-hole-poly");
  const flap = byId("peel-flap");
  const flapShade = byId("peel-flap-shade");
  const flapGrad = byId("peel-flap-grad");
  const holeGrad = byId("peel-hole-grad");
  const rays = byId("peel-rays");
  const duckImage = root.querySelector(".peel__sway");
  if (!zone || !say || !holePoly || !flap || !flapShade || !flapGrad || !holeGrad || !rays) return;

  const FINAL = 225; // legs of the fully peeled corner (what it reveals), in design units
  const BOX = 310; // the design box
  const CURL = 34; // legs of the little dog-ear shown while the corner is hovered
  const GRAB = 52; // how close to the tip a press has to land to take hold of it
  const TH_MIN = Math.atan(0.4); // the pull angle (from the bottom edge) is kept between these two,
  const TH_MAX = Math.PI / 2 - TH_MIN; // so the crease always cuts across the corner
  const TH_END = 0.14; // radians either side of 45 degrees that are left at the very end of the pull
  const LOCK = 0.88; // the corner stays peeled for good once its legs reach this share of FINAL
  const STICK = 0.1; // how much the page resists: where it locks the tip lags about this share behind the pointer
  const FOLLOW = 0.5; // share of the way to the pointer a held tip covers each substep
  const RATE = 120; // substeps per second (as in nav.js)
  const STEP = 1 / RATE;
  const SPRING_PERIOD = 0.42; // seconds per bounce of the corner falling back
  const SPRING_DAMPING = 0.3; // 0 bounces for ever, 1 just eases back
  const K = (2 * Math.PI / (SPRING_PERIOD * RATE)) ** 2;
  const C = 2 * SPRING_DAMPING * Math.sqrt(K);
  const KT = (2 * Math.PI / (0.5 * RATE)) ** 2; // the pull angle eases back to 45 degrees too
  const CT = 2 * 0.7 * Math.sqrt(KT);
  const C_SETTLE = 2 * 0.75 * Math.sqrt(K); // the last bit into the final fold: hardly any bounce
  const R_CURL = CURL * Math.SQRT2; // tip distance of the resting dog-ear (legs = r * 0.707 at 45 degrees)
  const R_FINAL = FINAL * Math.SQRT2; // and of the final fold

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const still = () => document.documentElement.classList.contains("nav-still");
  const canHover = window.matchMedia("(hover: hover)");

  // The rays behind the duck, all coming from the corner (static: drawn once)
  {
    let d = "";
    const slots = 28;
    for (let i = 0; i < slots; i += 2) {
      const a1 = Math.PI + (i * Math.PI) / 2 / slots;
      const a2 = Math.PI + ((i + 1) * Math.PI) / 2 / slots;
      d += `M${BOX} ${BOX}L${(BOX + 520 * Math.cos(a1)).toFixed(1)} ${(BOX + 520 * Math.sin(a1)).toFixed(1)}L${(BOX + 520 * Math.cos(a2)).toFixed(1)} ${(BOX + 520 * Math.sin(a2)).toFixed(1)}Z`;
    }
    rays.setAttribute("d", d);
  }

  // The duck's picture is only fetched once someone lifts the corner (or, if they somehow didn't, when
  // the corner locks), so a visitor who never goes looking never loads it
  const fetchDuck = () => {
    if (duckImage && !duckImage.hasAttribute("href")) duckImage.setAttribute("href", duckImage.dataset.src);
  };

  // ------------------------------------------------------------------ state

  let k = 1; // window pixels per design unit
  let r = 0; // how far the tip is from the corner...
  let th = Math.PI / 4; // ...and at what angle from the bottom edge
  let vr = 0;
  let vth = 0; // their speeds, per substep
  let armed = false; // the corner is lifted (hovered, or tapped)
  let touchArmed = false; // lifted by a tap, so only a tap elsewhere or scrolling away puts it down
  let held = false;
  let peeled = false; // pulled far enough: the corner is folded over for good and the duck is out
  let holdId = null;
  let ptrX = 0;
  let ptrY = 0; // the pointer, in window pixels
  let grabS = 0;
  let grabT = 0; // where on the tip the pointer took hold of it
  let aim = [0, 0]; // where the pointer says the tip should be (r, th), measured once per frame
  let tap = null; // a finger that went down on the corner and might be a tap
  let disarmTimer = 0;
  let raf = 0;
  let last = 0;
  let acc = 0;

  // legs of the triangle the fold cuts off the bottom edge (u) and the right edge (v)
  const legs = (s, t) => {
    const q = s * s + t * t;
    return [q / (2 * s), q / (2 * t)];
  };
  const legsOf = (rr, aa) => rr / (2 * Math.min(Math.cos(aa), Math.sin(aa)));

  // The corner of the page, in window pixels, as the box has it right now (the page may be scrolling)
  const cornerOf = (x, y) => {
    const box = root.getBoundingClientRect();
    return [(box.right - x) / k, (box.bottom - y) / k];
  };

  const atEnd = () => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 48;

  // ------------------------------------------------------------------ drawing

  const at = (s, t) => `${(BOX - s).toFixed(2)},${(BOX - t).toFixed(2)}`;
  let drawn = false;

  const aimGradient = (grad, x1, y1, x2, y2) => {
    grad.setAttribute("x1", (BOX - x1).toFixed(2));
    grad.setAttribute("y1", (BOX - y1).toFixed(2));
    grad.setAttribute("x2", (BOX - x2).toFixed(2));
    grad.setAttribute("y2", (BOX - y2).toFixed(2));
  };

  const clear = () => {
    if (!drawn) return;
    drawn = false;
    for (const el of [holePoly, flap, flapShade]) el.setAttribute("points", "");
  };

  // What is under the page is the triangle C-A-B, shaded where the paper lifts off it
  const drawHole = (u, v, dirS, dirT) => {
    drawn = true;
    holePoly.setAttribute("points", `${at(0, 0)} ${at(u, 0)} ${at(0, v)}`);
    const mid = [u / 2, v / 2];
    const len = Math.hypot(dirS, dirT) || 1;
    const reach = Math.min(46, Math.hypot(mid[0], mid[1]));
    aimGradient(holeGrad, mid[0], mid[1], mid[0] + (dirS / len) * reach, mid[1] + (dirT / len) * reach);
  };

  const render = () => {
    if (r < 0.6) {
      clear();
      return;
    }
    const s = r * Math.cos(th);
    const t = r * Math.sin(th);
    const [u, v] = legs(s, t);
    drawHole(u, v, -s, -t);
    const points = `${at(s, t)} ${at(u, 0)} ${at(0, v)}`;
    flap.setAttribute("points", points);
    flapShade.setAttribute("points", points);
    aimGradient(flapGrad, s / 2, t / 2, s, t); // shaded at the crease, lighter towards the tip
  };

  // ------------------------------------------------------------------ physics

  // The pointer says where the tip should be: right under it (less the way it was grabbed), kept
  // within the angles a fold can have, and short of it by the page's resistance.
  const aimAt = () => {
    const [s0, t0] = cornerOf(ptrX, ptrY);
    const s = Math.max(s0 - grabS, 0);
    const t = Math.max(t0 - grabT, 0);
    const dist = Math.hypot(s, t);
    if (dist < 0.5) return [0, th];
    const heading = Math.atan2(t, s);
    // The nearer the end, the more diagonal the fold has to be (the paper's own stiffness steers it),
    // so that when the corner locks it is already almost in its final fold and has no far to settle.
    const progress = clamp(legsOf(dist, clamp(heading, TH_MIN, TH_MAX)) / (LOCK * FINAL), 0, 1);
    const half = Math.PI / 4 - TH_MIN + (TH_END - (Math.PI / 4 - TH_MIN)) * progress ** 2;
    const angle = clamp(heading, Math.PI / 4 - half, Math.PI / 4 + half);
    const raw = legsOf(dist, angle);
    const w = Math.min(raw, 1.2 * FINAL);
    const shown = w * (1 - STICK * (w / FINAL) ** 2);
    return [dist * (shown / raw), angle];
  };

  // where the tip comes to rest when nobody holds it
  const restR = () => (peeled ? R_FINAL : armed ? R_CURL : 0);

  const step = () => {
    const quiet = still();
    if (held) {
      const r0 = r;
      const th0 = th;
      const f = quiet ? 1 : FOLLOW;
      r += (aim[0] - r) * f;
      th += (aim[1] - th) * f;
      vr = r - r0;
      vth = th - th0;
    } else if (quiet) {
      r = restR();
      th = Math.PI / 4;
      vr = vth = 0;
    } else {
      vr += -K * (r - restR()) - (peeled ? C_SETTLE : C) * vr;
      r += vr;
      if (r < 0) {
        r = 0; // it fell flat: a little bounce off the page
        vr = -vr * 0.3;
      }
      vth += -KT * (th - Math.PI / 4) - CT * vth;
      th += vth;
    }
    th = clamp(th, TH_MIN, TH_MAX);
    if (!peeled && r > 0.6 && legsOf(r, th) >= LOCK * FINAL) lock();
  };

  const busy = () => {
    if (held) return true;
    return Math.abs(r - restR()) > 0.05 || Math.abs(vr) > 0.01 || Math.abs(th - Math.PI / 4) > 0.002 || Math.abs(vth) > 0.0001;
  };

  const frame = (now) => {
    raf = 0;
    const dt = clamp((now - last) / 1000, 0, 0.05);
    last = now;
    if (held) aim = aimAt();
    acc += dt;
    while (acc >= STEP) {
      acc -= STEP;
      step();
    }
    if (!busy()) {
      r = restR();
      th = Math.PI / 4;
      vr = vth = 0;
    }
    render();
    if (busy()) raf = requestAnimationFrame(frame);
  };

  const ensureLoop = () => {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  // ------------------------------------------------------------------ locking

  const showSay = () => {
    say.hidden = false;
    void say.offsetWidth; // so that it grows in, instead of just being there
    say.classList.add("is-shown");
    setTimeout(() => say.classList.add("is-quiet"), 9000);
  };

  // Pulled far enough: the corner stays where it is (the spring only settles it into its final fold,
  // a few pixels away) and can't be taken hold of again.
  const lock = () => {
    if (holdId !== null) {
      try { zone.releasePointerCapture(holdId); } catch (err) { /* already let go */ }
    }
    held = false;
    holdId = null;
    fetchDuck();
    peeled = true;
    armed = false;
    touchArmed = false;
    root.classList.remove("is-armed", "is-held");
    root.classList.add("is-open");
    setTimeout(showSay, still() ? 0 : 450);
    ensureLoop();
  };

  // ------------------------------------------------------------------ pointer

  const arm = (byTouch) => {
    clearTimeout(disarmTimer);
    if (armed || peeled) return;
    fetchDuck();
    armed = true;
    touchArmed = byTouch;
    root.classList.add("is-armed");
    ensureLoop();
  };

  const disarm = () => {
    clearTimeout(disarmTimer);
    if (!armed || held || peeled) return;
    armed = false;
    touchArmed = false;
    root.classList.remove("is-armed");
    ensureLoop();
  };

  zone.addEventListener("pointerenter", (e) => {
    if (e.pointerType === "touch" || peeled) return;
    clearTimeout(disarmTimer);
    if (atEnd()) arm(false);
  });

  zone.addEventListener("pointerleave", (e) => {
    if (e.pointerType === "touch" || held || peeled) return;
    disarmTimer = setTimeout(disarm, 250);
  });

  zone.addEventListener("pointerdown", (e) => {
    if (peeled || held || e.button !== 0 || !atEnd()) return;
    const touch = e.pointerType === "touch";
    if (!armed) {
      // A mouse that pressed without having hovered first (the page scrolled under it) just lifts the
      // corner. A finger might be about to scroll, so wait to see whether it is a tap.
      if (touch) tap = { id: e.pointerId, x: e.clientX, y: e.clientY };
      else arm(false);
      return;
    }
    const [s, t] = cornerOf(e.clientX, e.clientY);
    const tipS = r * Math.cos(th);
    const tipT = r * Math.sin(th);
    if (Math.hypot(s - tipS, t - tipT) > GRAB) return;
    held = true;
    holdId = e.pointerId;
    grabS = s - tipS;
    grabT = t - tipT;
    ptrX = e.clientX;
    ptrY = e.clientY;
    try { zone.setPointerCapture(e.pointerId); } catch (err) { /* not capturable: fine */ }
    root.classList.add("is-held");
    e.preventDefault(); // no text selection, no image drag
    aim = aimAt();
    ensureLoop();
  });

  zone.addEventListener("pointermove", (e) => {
    if (e.pointerId !== holdId) return;
    ptrX = e.clientX;
    ptrY = e.clientY;
  });

  const release = (e) => {
    if (tap && e.pointerId === tap.id) {
      const wasTap = e.type === "pointerup" && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 10;
      tap = null;
      if (wasTap && atEnd()) arm(true);
    }
    if (e.pointerId !== holdId) return;
    held = false;
    holdId = null;
    root.classList.remove("is-held");
    // let go away from the corner: it falls back (a mouse that has left it puts it down altogether)
    if (e.pointerType !== "touch" && !zone.matches(":hover")) disarmTimer = setTimeout(disarm, 250);
    ensureLoop();
  };
  zone.addEventListener("pointerup", release);
  zone.addEventListener("pointercancel", release);

  // A long press on the corner would open the browser's menu and cancel the pull
  zone.addEventListener("contextmenu", (e) => {
    if (held) e.preventDefault();
  });

  // A tap anywhere else puts a tap-lifted corner back down
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (armed && touchArmed && !held && !(e.target instanceof Node && zone.contains(e.target))) disarm();
    },
    true
  );

  // Scrolling away puts the corner down (it is only there at the end of the page); scrolling to the
  // end with the mouse already resting on the corner lifts it
  window.addEventListener(
    "scroll",
    () => {
      if (peeled) return;
      if (armed && !held && !atEnd()) disarm();
      else if (!armed && canHover.matches && atEnd() && zone.matches(":hover")) arm(false);
    },
    { passive: true }
  );

  // ------------------------------------------------------------------ size

  const layout = () => {
    k = clamp((window.innerWidth * 0.52) / FINAL, 150 / FINAL, 1);
    root.style.setProperty("--k", k.toFixed(4));
    render();
  };

  // Only a change of width counts: a phone's address bar sliding in and out changes the height
  let laidOutWidth = window.innerWidth;
  window.addEventListener("resize", () => {
    if (window.innerWidth === laidOutWidth) return;
    laidOutWidth = window.innerWidth;
    layout();
  });

  layout();
})();
