import "./FinalHeartFall.css";
import { HEART_COLORS } from "../heartburst/HeartBurstConstants";
import {
  HEARTFALL_TARGET_CONCURRENT,
  HEARTFALL_MIN_SIZE,
  HEARTFALL_MAX_SIZE,
  HEARTFALL_MIN_DURATION,
  HEARTFALL_MAX_DURATION,
  HEARTFALL_DRIFT_MAX,
  HEARTFALL_ROTATE_MAX,
  HEARTFALL_MIN_OPACITY,
  HEARTFALL_MAX_OPACITY,
  HEARTFALL_COLUMN_COUNT,
  HEARTFALL_SETTLE_DURATION,
  HEARTFALL_SETTLE_JITTER_X,
  HEARTFALL_SETTLE_ROTATE_MAX,
  HEARTFALL_FOOTPRINT_MIN,
  HEARTFALL_FOOTPRINT_MAX,
  HEARTFALL_NEIGHBOR_SPREAD,
  HEARTFALL_PILE_TOP_MARGIN,
  HEARTFALL_FULL_MIN_COLUMN_FRACTION,
  HEARTFALL_CAP_ZONE_FRACTION,
} from "./FinalHeartFallConstants";

const AVG_FALL_DURATION = (HEARTFALL_MIN_DURATION + HEARTFALL_MAX_DURATION) / 2;
// Time between successive hearts' fall-start, spreading the pool's own
// initial spawn across roughly one average fall duration — so the very
// first moments of the rain already read as dense/already-moving rather
// than needing time to fill from an empty screen (see play() below).
// After that initial fill, every recycle (see _bakeSettledHeart) is a
// direct one-out-one-in swap, so the concurrent-falling count naturally
// stays put without needing this stagger again.
const SPAWN_STAGGER = AVG_FALL_DURATION / HEARTFALL_TARGET_CONCURRENT;

// Same weighted-random pick HeartField's own particle system uses
// (white/gold as minorities, medium pink as the most common) — reusing
// HEART_COLORS directly rather than a separate copy so this layer's
// palette can never drift from the scene's own existing hearts.
const TOTAL_WEIGHT = HEART_COLORS.reduce((sum, entry) => sum + entry.weight, 0);
function pickHeartColor() {
  let roll = Math.random() * TOTAL_WEIGHT;
  for (const entry of HEART_COLORS) {
    roll -= entry.weight;
    if (roll <= 0) return entry.color;
  }
  return HEART_COLORS[HEART_COLORS.length - 1].color;
}

// The same weave the old CSS keyframes drew (0 -> 25 -> 50 -> 75 -> 100%,
// linear timing), just replayed as plain piecewise-linear interpolation
// so a heart's live y-position can be compared against the pile's
// current surface every frame. `yVh` mirrors the old translateY stops,
// `xMul`/`rotMul` multiply the heart's own drift/rotate range.
const FALL_STOPS = [
  { p: 0, yVh: 0, xMul: 0, rotMul: 0 },
  { p: 0.25, yVh: 28, xMul: 0.5, rotMul: 0.3 },
  { p: 0.5, yVh: 56, xMul: -0.35, rotMul: -0.25 },
  { p: 0.75, yVh: 84, xMul: 0.65, rotMul: 0.5 },
  { p: 1, yVh: 112, xMul: 0.2, rotMul: 1 },
];
// Opacity fades in by 8% and (would have) faded out from 92% — kept so
// a heart landing early (short pile) still fades in the same way a
// heart landing late does; the fade-out tail is irrelevant since every
// heart is intercepted by the pile well before 92%.
const OPACITY_STOPS = [
  { p: 0, v: 0 },
  { p: 0.08, v: 1 },
  { p: 0.92, v: 1 },
  { p: 1, v: 0 },
];

function lerpStops(stops, t, key) {
  if (t <= stops[0].p) return stops[0][key];
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i].p) {
      const a = stops[i - 1];
      const b = stops[i];
      const span = b.p - a.p;
      const localT = span <= 0 ? 1 : (t - a.p) / span;
      return a[key] + (b[key] - a[key]) * localT;
    }
  }
  return stops[stops.length - 1][key];
}

function easeOutCubic(t) {
  const inv = 1 - t;
  return 1 - inv * inv * inv;
}

// Part 19 — the exact same heart silhouette FinalHeartFall.css masks its
// live DOM hearts with (two circular lobes + a bottom wedge, same 128x128
// coordinate space), just re-expressed as a Path2D so the accumulation
// canvas below can fill the identical shape instead of relying on a CSS
// mask. Built once and reused for every baked heart.
const HEART_PATH2D = new Path2D();
HEART_PATH2D.moveTo(64, 112.64);
HEART_PATH2D.lineTo(12.8, 53.76);
HEART_PATH2D.lineTo(64, 38.4);
HEART_PATH2D.lineTo(115.2, 53.76);
HEART_PATH2D.closePath();
HEART_PATH2D.moveTo(37.12 + 28.16, 44.8);
HEART_PATH2D.arc(37.12, 44.8, 28.16, 0, Math.PI * 2);
HEART_PATH2D.moveTo(90.88 + 28.16, 44.8);
HEART_PATH2D.arc(90.88, 44.8, 28.16, 0, Math.PI * 2);

// Rolls a fresh set of randomized properties onto one heart — used both
// for a heart's very first spawn AND every later recycle once it settles
// (see _bakeSettledHeart below). `spawnOffset` staggers this heart's own
// fall-start into the future (0 for the initial dense burst and for every
// recycle, increasing only for hearts further back in the initial pool —
// see play()) so the pool feeds a steady trickle instead of one huge
// upfront wave.
function randomizeFalling(heart, el, now, spawnOffset) {
  heart.size = HEARTFALL_MIN_SIZE + Math.random() * (HEARTFALL_MAX_SIZE - HEARTFALL_MIN_SIZE);
  heart.duration = HEARTFALL_MIN_DURATION + Math.random() * (HEARTFALL_MAX_DURATION - HEARTFALL_MIN_DURATION);
  heart.leftPercent = Math.random() * 100;
  heart.drift = (Math.random() * 2 - 1) * HEARTFALL_DRIFT_MAX;
  heart.rotate = (Math.random() * 2 - 1) * HEARTFALL_ROTATE_MAX;
  heart.opacity = HEARTFALL_MIN_OPACITY + Math.random() * (HEARTFALL_MAX_OPACITY - HEARTFALL_MIN_OPACITY);
  heart.color = pickHeartColor();
  heart.state = "falling";
  // The first HEARTFALL_TARGET_CONCURRENT-ish hearts start already
  // partway through their own fall (spawnOffset ~0) so the pool reads as
  // an already-dense, already-moving rain from the very first frame
  // instead of needing time to fill from an empty screen. Later hearts
  // carry a positive spawnOffset and simply wait (invisible, parked —
  // see _updateFalling's `t <= 0` guard) until their turn.
  heart.fallStart = now + spawnOffset - Math.random() * heart.duration * 0.85;
  // Explicitly cleared rather than left at whatever a just-recycled
  // heart's inline style held (its final settled position/opacity) —
  // the CSS class's own `opacity: 0` default then keeps it invisibly
  // parked until _updateFalling's `t <= 0` guard lets its first real
  // frame through, exactly like a brand-new heart.
  el.style.opacity = 0;

  el.style.setProperty("--left", `${heart.leftPercent}%`);
  el.style.setProperty("--size", `${heart.size}px`);
  el.style.setProperty("--color", heart.color);
}

// Part 17/18/19 — the DENSE, CONTINUOUS heart-rain played once "اي رضيت"
// is pressed (see GiftBox.js's own _answerYes()), which then accumulates
// into a growing pile at the bottom of the screen instead of hearts
// disappearing once they reach it.
//
// Two rendering layers:
//
// 1. A FIXED pool of HEARTFALL_TARGET_CONCURRENT plain DOM elements —
//    the only hearts ever animated per-frame — driven by ONE shared
//    requestAnimationFrame loop that writes a plain inline `transform`.
//    Once one of them settles onto the pile, its final look is baked
//    once into the accumulation canvas (layer 2) and the SAME element is
//    immediately recycled as a brand-new falling heart from the top —
//    the live DOM/animated count never grows past this fixed pool size,
//    no matter how large the pile gets. Once the pile has visually
//    filled the screen (see _checkFull), recycling stops and every
//    still-falling/still-settling heart simply finishes its own current
//    landing instead — once the last one does, the shared rAF loop
//    itself stops for good (see _stopRain/_activeCount).
// 2. One shared <canvas> holding every settled heart as plain pixels.
//    Drawn to exactly once per settle event (never redrawn wholesale,
//    never touched per-frame) — so a pile of hundreds or thousands of
//    hearts costs the compositor nothing beyond one static bitmap layer.
//
// Entirely separate from, and never touching, HeartField's own ongoing
// background particle system. Runs until it stops itself (fully landed)
// or destroy() is called (see GiftBox.js's own destroy()).
export default class FinalHeartFall {
  // Part 21 — `onFull` is a pure notification hook, called (once) the
  // moment _checkFull() below first flips _state to "FULL", used only
  // by GiftBox.js to fade in the final "I love you" message (see
  // FinalMessage.js) at the same moment the pile itself settles. Never
  // read from anywhere in this file's own accumulation/animation logic
  // — optional and inert if omitted.
  constructor({ onFull } = {}) {
    this._onFull = onFull || null;
    this.container = null;
    this._pool = [];
    this._settledData = [];
    this._columns = null;
    this._maxColumnHeight = 0;
    // Part 20 — ACCUMULATING while the pile still has room to grow,
    // FULL once every column has caught up to (near) the top of the
    // viewport. Flips exactly once and never back — see _checkFull.
    // FULL only stops new hearts from being recycled in (see
    // _updateSettling); every heart still mid-fall/mid-settle at that
    // moment keeps going and still lands/bakes normally, so whatever
    // gaps existed in the pile at the exact instant FULL was reached
    // still get filled in rather than being frozen forever. Once every
    // pooled heart has landed (see _activeCount), _stopRain() cancels
    // the shared rAF loop for good.
    this._state = "ACCUMULATING";
    this._activeCount = 0;
    this._canvas = null;
    this._ctx = null;
    this._viewportW = 0;
    this._viewportH = 0;
    this._rafId = null;
    this._onResize = () => this._measureViewport();
  }

  play() {
    if (this.container) return;

    const container = document.createElement("div");
    container.id = "boom-heartfall";
    document.body.appendChild(container);
    this.container = container;

    // Added before the active hearts below so it paints underneath them
    // in DOM order — the settled pile sits behind the still-falling/
    // still-settling live hearts.
    const canvas = document.createElement("canvas");
    canvas.className = "boom-heartfall-canvas";
    container.appendChild(canvas);
    this._canvas = canvas;
    this._ctx = canvas.getContext("2d");
    this._settledData = [];

    this._measureViewport();
    window.addEventListener("resize", this._onResize);

    const now = performance.now() / 1000;
    for (let i = 0; i < HEARTFALL_TARGET_CONCURRENT; i++) {
      const el = document.createElement("div");
      el.className = "boom-heartfall-heart";
      container.appendChild(el);

      const heart = { el };
      randomizeFalling(heart, el, now, i * SPAWN_STAGGER);
      this._pool.push(heart);
    }
    this._activeCount = this._pool.length;

    this._rafId = requestAnimationFrame(this._tick);
  }

  _measureViewport() {
    this._viewportW = window.innerWidth;
    this._viewportH = window.innerHeight;
    this._maxColumnHeight = Math.max(0, this._viewportH - HEARTFALL_PILE_TOP_MARGIN);
    this._columns = new Float32Array(HEARTFALL_COLUMN_COUNT);
    if (this._canvas) this._resizeCanvas();
  }

  // Resizing a canvas element clears its bitmap, so the accumulated pile
  // is kept separately in `_settledData` (plain numbers/strings, not DOM
  // nodes) and replayed once here — not every frame — whenever the
  // viewport itself changes size.
  _resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, this._viewportW < 768 ? 1.5 : 2);
    this._canvas.width = Math.round(this._viewportW * dpr);
    this._canvas.height = Math.round(this._viewportH * dpr);
    this._canvas.style.width = `${this._viewportW}px`;
    this._canvas.style.height = `${this._viewportH}px`;
    this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    for (const record of this._settledData) this._drawHeart(record);
  }

  _drawHeart({ centerX, centerY, size, rotateDeg, color, opacity }) {
    const ctx = this._ctx;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(centerX, centerY);
    ctx.rotate((rotateDeg * Math.PI) / 180);
    const scale = size / 128;
    ctx.scale(scale, scale);
    ctx.fillStyle = color;
    ctx.fill(HEART_PATH2D);
    ctx.restore();
  }

  _tick = () => {
    const now = performance.now() / 1000;

    for (const heart of this._pool) {
      if (heart.state === "falling") {
        this._updateFalling(heart, now);
      } else if (heart.state === "settling") {
        this._updateSettling(heart, now);
      }
      // "done" hearts (see _updateSettling) are already baked/hidden —
      // nothing left to animate on them, so they're simply skipped.
    }

    // A heart landing this frame can call _stopRain() (once every pooled
    // heart has finished — see _updateSettling/_activeCount), which
    // cancels/nulls this._rafId. Without this guard, the line below
    // would unconditionally overwrite that null with a fresh frame
    // request every time, so the loop would never actually stop.
    if (this._rafId !== null) {
      this._rafId = requestAnimationFrame(this._tick);
    }
  };

  _updateFalling(heart, now) {
    const t = Math.min((now - heart.fallStart) / heart.duration, 1);
    // Not its turn yet — stays parked off-screen (opacity 0, see
    // OPACITY_STOPS) and must never be checked against the pile surface,
    // otherwise a tall pile could "settle" it before it has visibly
    // fallen at all.
    if (t <= 0) return;

    const yVh = lerpStops(FALL_STOPS, t, "yVh");
    const xMul = lerpStops(FALL_STOPS, t, "xMul");
    const rotMul = lerpStops(FALL_STOPS, t, "rotMul");
    const opacityMul = lerpStops(OPACITY_STOPS, t, "v");

    const translateX = xMul * heart.drift;
    const translateY = -0.1 * this._viewportH + (yVh / 100) * this._viewportH;
    const rotateDeg = rotMul * heart.rotate;

    heart.el.style.opacity = heart.opacity * opacityMul;
    heart.el.style.transform = `translate3d(${translateX.toFixed(1)}px, ${translateY.toFixed(1)}px, 0) rotate(${rotateDeg.toFixed(1)}deg)`;

    const screenX = (heart.leftPercent / 100) * this._viewportW + translateX;
    const col = this._columnFor(screenX);
    const surfaceY = this._viewportH - this._columns[col] - heart.size * 0.5;

    if (translateY >= surfaceY) {
      this._beginSettling(heart, col, translateX, translateY, rotateDeg, now);
    }
  }

  // Part 20 — the screen is considered FULL once every column (all
  // HEARTFALL_COLUMN_COUNT of them, a small fixed-size array — cheap to
  // scan) has independently caught up to near the pile's own height cap,
  // not just whichever column this particular heart happened to land
  // in. Only ever called while still ACCUMULATING (see _beginSettling),
  // so this scan itself stops the moment the state flips.
  _checkFull() {
    let minHeight = Infinity;
    for (let i = 0; i < this._columns.length; i++) {
      if (this._columns[i] < minHeight) minHeight = this._columns[i];
    }
    if (minHeight >= this._maxColumnHeight * HEARTFALL_FULL_MIN_COLUMN_FRACTION) {
      this._state = "FULL";
      if (this._onFull) {
        this._onFull();
        this._onFull = null;
      }
    }
  }

  // Called once every pooled heart has landed and been baked after FULL
  // was reached (see _updateSettling/_activeCount) — at that point there
  // is nothing left to animate, so the shared rAF loop is cancelled for
  // good instead of continuing to run forever for a static, already-full
  // pile. The settled pile itself is untouched — it stays exactly as
  // already baked onto the canvas.
  _stopRain() {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  _columnFor(screenX) {
    const ratio = screenX / this._viewportW;
    return Math.min(HEARTFALL_COLUMN_COUNT - 1, Math.max(0, Math.floor(ratio * HEARTFALL_COLUMN_COUNT)));
  }

  _beginSettling(heart, col, fromX, fromY, fromRot, now) {
    const footprint = heart.size * (HEARTFALL_FOOTPRINT_MIN + Math.random() * (HEARTFALL_FOOTPRINT_MAX - HEARTFALL_FOOTPRINT_MIN));

    // Near/at its hard cap, a column's own landing surface has climbed
    // to meet its heart's own spawn point, so its cycle time collapses
    // and a disproportionate share of the pool's total settle events
    // end up targeting this one column right as it (and its neighbors)
    // approach the cap — see HEARTFALL_CAP_ZONE_FRACTION for why that
    // volume needs to scatter across a whole proportional zone instead
    // of the column's own near-frozen height, or it reads as an ugly
    // solid seam instead of a natural pile surface.
    const capZoneHeight = this._maxColumnHeight * HEARTFALL_CAP_ZONE_FRACTION;
    const inCapZone = this._columns[col] >= this._maxColumnHeight - capZoneHeight;
    const targetY = inCapZone
      ? this._viewportH - this._maxColumnHeight + Math.random() * capZoneHeight
      : this._viewportH - this._columns[col] - heart.size * (0.4 + Math.random() * 0.25);
    const targetX = fromX + (Math.random() * 2 - 1) * HEARTFALL_SETTLE_JITTER_X;
    const targetRot = (Math.random() * 2 - 1) * HEARTFALL_SETTLE_ROTATE_MAX;

    // Capped at _maxColumnHeight (see HEARTFALL_PILE_TOP_MARGIN) so a
    // column's surface can never climb past the viewport — past that
    // point, further landings on it just keep it pinned at the cap
    // instead of pushing its surface further above the screen.
    this._columns[col] = Math.min(this._columns[col] + footprint, this._maxColumnHeight);
    const spread = footprint * HEARTFALL_NEIGHBOR_SPREAD;
    if (col > 0) this._columns[col - 1] = Math.min(this._columns[col - 1] + spread, this._maxColumnHeight);
    if (col < HEARTFALL_COLUMN_COUNT - 1) {
      this._columns[col + 1] = Math.min(this._columns[col + 1] + spread, this._maxColumnHeight);
    }

    this._checkFull();

    heart.state = "settling";
    heart.settleStart = now;
    heart.fromX = fromX;
    heart.fromY = fromY;
    heart.fromRot = fromRot;
    heart.targetX = targetX;
    heart.targetY = targetY;
    heart.targetRot = targetRot;
  }

  _updateSettling(heart, now) {
    const t = Math.min((now - heart.settleStart) / HEARTFALL_SETTLE_DURATION, 1);
    const eased = easeOutCubic(t);

    const x = heart.fromX + (heart.targetX - heart.fromX) * eased;
    const y = heart.fromY + (heart.targetY - heart.fromY) * eased;
    const rot = heart.fromRot + (heart.targetRot - heart.fromRot) * eased;

    heart.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${rot.toFixed(1)}deg)`;

    if (t >= 1) {
      this._bakeSettledHeart(heart);
      if (this._state === "FULL") {
        // The pile is already full — this heart's own weight is now
        // permanent pixels on the canvas, so the live element has
        // nothing left to do. Mark it done and hide it instead of
        // recycling a new faller in its place; once every pooled heart
        // has reached this point the rain stops for good (_stopRain()).
        heart.state = "done";
        heart.el.style.opacity = 0;
        this._activeCount--;
        if (this._activeCount <= 0) this._stopRain();
      } else {
        // Permanent as PIXELS, not as a DOM element — this same element
        // is immediately handed back to the falling pool so the rain
        // never stops and the live/animated element count never grows.
        randomizeFalling(heart, heart.el, now, 0);
      }
    }
  }

  // Draws this heart's final look once into the accumulation canvas and
  // records it in `_settledData` (for resize replay — see
  // _resizeCanvas), then the caller recycles the DOM element. Never
  // touched again after this.
  _bakeSettledHeart(heart) {
    const screenLeft = (heart.leftPercent / 100) * this._viewportW;
    const record = {
      centerX: screenLeft + heart.targetX + heart.size / 2,
      centerY: heart.targetY + heart.size / 2,
      size: heart.size,
      rotateDeg: heart.targetRot,
      color: heart.color,
      opacity: heart.opacity,
    };
    this._settledData.push(record);
    this._drawHeart(record);
  }

  destroy() {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    window.removeEventListener("resize", this._onResize);

    this._pool.length = 0;
    this._settledData = [];
    this._columns = null;
    this._canvas = null;
    this._ctx = null;

    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}
