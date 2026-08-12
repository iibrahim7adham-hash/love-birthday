import gsap from "gsap";

import "./StandardFloatingText.css";

import {
  FLOATING_TEXT_PHRASES,
  FLOATING_TEXT_COLORS,
  FLOATING_TEXT_CENTER_LEFT,
  FLOATING_TEXT_CENTER_TOP,
  FLOATING_TEXT_RADIUS_X_MIN,
  FLOATING_TEXT_RADIUS_X_MAX,
  FLOATING_TEXT_RADIUS_Y_MIN,
  FLOATING_TEXT_RADIUS_Y_MAX,
  FLOATING_TEXT_LEFT_BOUNDS,
  FLOATING_TEXT_TOP_BOUNDS,
  FLOATING_TEXT_BREAKPOINT_MOBILE,
  FLOATING_TEXT_BREAKPOINT_TABLET,
  FLOATING_TEXT_POOL_SIZE_MOBILE,
  FLOATING_TEXT_POOL_SIZE_TABLET,
  FLOATING_TEXT_POOL_SIZE_DESKTOP,
  FLOATING_TEXT_INTRO_BASE_DELAY,
  FLOATING_TEXT_INTRO_STAGGER_MIN,
  FLOATING_TEXT_INTRO_STAGGER_MAX,
  FLOATING_TEXT_FADE_IN_DURATION_MIN,
  FLOATING_TEXT_FADE_IN_DURATION_MAX,
  FLOATING_TEXT_HOLD_DURATION_MIN,
  FLOATING_TEXT_HOLD_DURATION_MAX,
  FLOATING_TEXT_FADE_OUT_DURATION_MIN,
  FLOATING_TEXT_FADE_OUT_DURATION_MAX,
  FLOATING_TEXT_RECYCLE_DELAY_MIN,
  FLOATING_TEXT_RECYCLE_DELAY_MAX,
  FLOATING_TEXT_FLOAT_DISTANCE_MIN,
  FLOATING_TEXT_FLOAT_DISTANCE_MAX,
  FLOATING_TEXT_ROTATION_MIN,
  FLOATING_TEXT_ROTATION_MAX,
  FLOATING_TEXT_SCALE_MIN,
  FLOATING_TEXT_SCALE_MAX,
  FLOATING_TEXT_PEAK_OPACITY_MIN,
  FLOATING_TEXT_PEAK_OPACITY_MAX,
  FLOATING_TEXT_COLLISION_PADDING,
  FLOATING_TEXT_PLACEMENT_MAX_ATTEMPTS,
} from "./StandardFloatingTextConstants";

// A pooled, gradually-introduced layer of short romantic/birthday
// phrases, floating alongside the heart balloons — same "pool size IS
// the max active count, recycling never grows it" contract
// StandardBalloons.js already establishes, adapted to plain DOM
// elements since text reads far more cleanly as a CSS overlay than as
// 3D geometry (this project loads no fonts a Three.js TextGeometry
// could use anyway). Built (inert) as soon as the celebration stage
// begins; does not become visible until start() is called —
// StandardCandleBlowout.js calls it once, alongside
// StandardBalloons.js's own start(), so phrases are never present
// during the normal cake/candle state.
export default class StandardFloatingText {
  constructor() {
    this._started = false;
    this._timers = [];

    const width = window.innerWidth;
    if (width < FLOATING_TEXT_BREAKPOINT_MOBILE) {
      this.poolSize = FLOATING_TEXT_POOL_SIZE_MOBILE;
    } else if (width < FLOATING_TEXT_BREAKPOINT_TABLET) {
      this.poolSize = FLOATING_TEXT_POOL_SIZE_TABLET;
    } else {
      this.poolSize = FLOATING_TEXT_POOL_SIZE_DESKTOP;
    }

    this.element = document.createElement("div");
    this.element.id = "standard-floating-text";
    document.body.appendChild(this.element);

    this.pool = [];
    for (let i = 0; i < this.poolSize; i++) {
      const el = document.createElement("div");
      el.className = "standard-floating-phrase";
      this.element.appendChild(el);
      this.pool.push({ el, lastPhrase: null, active: false });
    }
  }

  // A loose, randomized ring around the cake: any angle, plus an
  // independently randomized X/Y radius (an ellipse, matching the
  // viewport's own shape rather than a perfect circle) — never below
  // its own MIN (keeps clear of the cake itself) or above its own MAX
  // (keeps phrases feeling like they belong to the cake's own
  // surrounding area, not scattered to the screen edges). No two
  // consecutive picks land on an obvious pattern since angle/radius are
  // both freshly randomized every call.
  _pickPosition() {
    const angle = Math.random() * Math.PI * 2;
    const radiusX = gsap.utils.random(FLOATING_TEXT_RADIUS_X_MIN, FLOATING_TEXT_RADIUS_X_MAX);
    const radiusY = gsap.utils.random(FLOATING_TEXT_RADIUS_Y_MIN, FLOATING_TEXT_RADIUS_Y_MAX);

    const left = gsap.utils.clamp(
      FLOATING_TEXT_LEFT_BOUNDS[0],
      FLOATING_TEXT_LEFT_BOUNDS[1],
      FLOATING_TEXT_CENTER_LEFT + Math.cos(angle) * radiusX,
    );
    const top = gsap.utils.clamp(
      FLOATING_TEXT_TOP_BOUNDS[0],
      FLOATING_TEXT_TOP_BOUNDS[1],
      FLOATING_TEXT_CENTER_TOP + Math.sin(angle) * radiusY,
    );

    return { left, top };
  }

  // This slot's own current rendered box, expanded by the glow padding
  // on every side — the actual measured box (not a fixed guess), so a
  // long sentence naturally claims more space than a short one.
  _paddedRect(el) {
    const r = el.getBoundingClientRect();
    return {
      left: r.left - FLOATING_TEXT_COLLISION_PADDING,
      right: r.right + FLOATING_TEXT_COLLISION_PADDING,
      top: r.top - FLOATING_TEXT_COLLISION_PADDING,
      bottom: r.bottom + FLOATING_TEXT_COLLISION_PADDING,
    };
  }

  _rectsOverlap(a, b) {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  }

  // Places `slot`'s already-set phrase (el.textContent must already be
  // current) at a position from the same loose elliptical ring
  // _pickPosition() draws from, retrying until it finds one whose
  // MEASURED bounding box (via getBoundingClientRect, so real text
  // length/font-size is respected) doesn't overlap any other currently
  // visible slot's own padded box. Falls back to the least-overlapping
  // candidate tried if the ring is too crowded to ever find a clean
  // spot — bounded, so this can never hang.
  _pickNonOverlappingPosition(slot) {
    const otherRects = this.pool.filter((s) => s !== slot && s.active).map((s) => this._paddedRect(s.el));

    if (otherRects.length === 0) {
      const { left, top } = this._pickPosition();
      slot.el.style.left = `${left}vw`;
      slot.el.style.top = `${top}vh`;
      return;
    }

    let fallback = null;
    let fallbackOverlapArea = Infinity;

    for (let attempt = 0; attempt < FLOATING_TEXT_PLACEMENT_MAX_ATTEMPTS; attempt++) {
      const { left, top } = this._pickPosition();
      slot.el.style.left = `${left}vw`;
      slot.el.style.top = `${top}vh`;
      const candidate = this._paddedRect(slot.el);

      let totalOverlapArea = 0;
      for (const rect of otherRects) {
        if (this._rectsOverlap(candidate, rect)) {
          const overlapW = Math.min(candidate.right, rect.right) - Math.max(candidate.left, rect.left);
          const overlapH = Math.min(candidate.bottom, rect.bottom) - Math.max(candidate.top, rect.top);
          totalOverlapArea += overlapW * overlapH;
        }
      }

      if (totalOverlapArea === 0) return; // left/top are already applied — done.

      if (totalOverlapArea < fallbackOverlapArea) {
        fallbackOverlapArea = totalOverlapArea;
        fallback = { left, top };
      }
    }

    // Every attempt overlapped something (only possible if the pool is
    // packed tighter than the ring can cleanly fit) — use the least-bad one.
    slot.el.style.left = `${fallback.left}vw`;
    slot.el.style.top = `${fallback.top}vh`;
  }

  _pickPhrase(slot) {
    let phrase = FLOATING_TEXT_PHRASES[Math.floor(Math.random() * FLOATING_TEXT_PHRASES.length)];
    // A single reroll if it repeats the same slot's own last phrase —
    // enough to avoid the obvious "same spot says the same thing twice
    // in a row" case without a heavier no-repeat pool.
    if (phrase === slot.lastPhrase && FLOATING_TEXT_PHRASES.length > 1) {
      phrase = FLOATING_TEXT_PHRASES[Math.floor(Math.random() * FLOATING_TEXT_PHRASES.length)];
    }
    slot.lastPhrase = phrase;
    return phrase;
  }

  // One full lifecycle for a pooled slot: random phrase/position/color/
  // size/rotation/drift -> fade in -> gentle float -> fade out -> a
  // random gap -> recurse. Every property is rolled independently per
  // cycle, so no two appearances (even from the same slot) look or move
  // the same way.
  _runCycle(slot) {
    const { el } = slot;
    const color = FLOATING_TEXT_COLORS[Math.floor(Math.random() * FLOATING_TEXT_COLORS.length)];
    const scale = gsap.utils.random(FLOATING_TEXT_SCALE_MIN, FLOATING_TEXT_SCALE_MAX);
    const rotation = gsap.utils.random(FLOATING_TEXT_ROTATION_MIN, FLOATING_TEXT_ROTATION_MAX);
    const floatDistance = gsap.utils.random(FLOATING_TEXT_FLOAT_DISTANCE_MIN, FLOATING_TEXT_FLOAT_DISTANCE_MAX);
    const peakOpacity = gsap.utils.random(FLOATING_TEXT_PEAK_OPACITY_MIN, FLOATING_TEXT_PEAK_OPACITY_MAX);
    const fadeInDuration = gsap.utils.random(FLOATING_TEXT_FADE_IN_DURATION_MIN, FLOATING_TEXT_FADE_IN_DURATION_MAX);
    const holdDuration = gsap.utils.random(FLOATING_TEXT_HOLD_DURATION_MIN, FLOATING_TEXT_HOLD_DURATION_MAX);
    const fadeOutDuration = gsap.utils.random(FLOATING_TEXT_FADE_OUT_DURATION_MIN, FLOATING_TEXT_FADE_OUT_DURATION_MAX);

    el.textContent = this._pickPhrase(slot);
    el.style.color = color;
    // Neutral transform while we measure/choose a spot — matches the
    // settled (peak-scale) footprint closely (scale only ranges
    // 0.85–1.15) without last cycle's leftover y/rotation skewing the
    // measured box.
    gsap.set(el, { rotation: 0, y: 0, scale: 1 });
    slot.active = true;
    this._pickNonOverlappingPosition(slot);

    gsap.set(el, { opacity: 0, scale: scale * 0.92, y: floatDistance * 0.4, rotation });

    const tl = gsap.timeline({
      onComplete: () => {
        slot.active = false;
        const delay = gsap.utils.random(FLOATING_TEXT_RECYCLE_DELAY_MIN, FLOATING_TEXT_RECYCLE_DELAY_MAX);
        this._timers.push(gsap.delayedCall(delay, () => this._runCycle(slot)));
      },
    });

    tl.to(el, { opacity: peakOpacity, scale, y: 0, duration: fadeInDuration, ease: "power1.out" }, 0);
    // A slow, gentle upward drift across the whole hold+fade span —
    // never a rigid back-and-forth, just a soft continuous rise.
    tl.to(el, { y: -floatDistance, duration: holdDuration + fadeOutDuration, ease: "sine.inOut" }, 0);
    tl.to(el, { opacity: 0, duration: fadeOutDuration, ease: "power1.in" }, fadeInDuration + holdDuration);
  }

  // Called once by StandardCandleBlowout.js, alongside
  // StandardBalloons.js's own start(). Staggers each pool slot's own
  // first appearance so phrases never all pop in together. Idempotent.
  start() {
    if (this._started) return;
    this._started = true;

    let delay = FLOATING_TEXT_INTRO_BASE_DELAY;
    this.pool.forEach((slot) => {
      this._timers.push(gsap.delayedCall(delay, () => this._runCycle(slot)));
      delay += gsap.utils.random(FLOATING_TEXT_INTRO_STAGGER_MIN, FLOATING_TEXT_INTRO_STAGGER_MAX);
    });
  }

  // Safe to call more than once.
  destroy() {
    this._timers.forEach((timer) => timer.kill());
    this._timers = [];
    gsap.killTweensOf(this.pool.map((slot) => slot.el));
    this.element.remove();
  }
}
