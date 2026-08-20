import gsap from "gsap";

import ParticleEngine from "../particles/ParticleEngine";
import { getTextGridCells, gridCellToWorld } from "./GlyphSampler";
import {
  COUNTDOWN_COLOR,
  COUNTDOWN_GRID_BY_PERFORMANCE,
  COUNTDOWN_MOBILE_FILL_SCALE,
  COUNTDOWN_MOBILE_GLOW_SCALE,
  COUNTDOWN_DIGIT_SIZE,
  COUNTDOWN_SCATTER_RADIUS,
  COUNTDOWN_ENTER_DELAY,
  COUNTDOWN_APPEAR_DURATION,
  COUNTDOWN_OPACITY,
  COUNTDOWN_ASSEMBLE_DURATION,
  COUNTDOWN_TRANSFORM_DURATION,
  COUNTDOWN_HOLD_DURATION,
  COUNTDOWN_FINAL_HOLD_DURATION,
  COUNTDOWN_BURST_DURATION,
  COUNTDOWN_BURST_REACH_MIN_FRACTION,
  COUNTDOWN_BURST_REACH_MAX_FRACTION,
  COUNTDOWN_SCATTERED_HOLD_DURATION,
  COUNTDOWN_TEXT,
  COUNTDOWN_TEXT_ASPECT,
  COUNTDOWN_GATHER_DURATION,
} from "../Constants";

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

// The countdown's entire visual surface: "3" -> "2" -> "1" -> a big
// explosion across the whole visible space -> gathering back into the
// word "You", each stage built from and transforming into the next out
// of the SAME set of round glowing particles (never rebuilt/re-spawned — see
// morphTo() below). Owns one ParticleEngine in "morph" mode, rendered as
// its own THREE.Points sitting in front of HyateiScene's LoveRain — it
// never touches LoveRain's engine, uniforms, or timing.
export default class NumberParticles {
  constructor({ camera, performanceLevel = "medium", isMobile = false }) {
    const grid =
      COUNTDOWN_GRID_BY_PERFORMANCE[performanceLevel] ?? COUNTDOWN_GRID_BY_PERFORMANCE.medium;

    this.cols = grid.cols;
    this.rows = grid.rows;
    this.spacing = COUNTDOWN_DIGIT_SIZE / this.rows;

    // The word grid shares the digits' row count (and therefore the
    // same per-cell spacing/letter-height as the digits) but is much
    // wider, so a multi-character word isn't squeezed into a
    // single-digit's roughly-square footprint.
    this.textCols = Math.round(this.rows * COUNTDOWN_TEXT_ASPECT);

    // Every digit/word is sampled onto its own cols x rows lattice, so
    // each formed shape is always an exact grid of evenly-spaced cells
    // (see GlyphSampler.js). The particle budget is fixed at the
    // densest shape's "on" cell count — sparser ones (e.g. "1") round-
    // robin multiple particles onto the same, still exactly-on-grid,
    // cells rather than ever landing off-lattice.
    const cells3 = getTextGridCells(3, this.cols, this.rows);
    const cells2 = getTextGridCells(2, this.cols, this.rows);
    const cells1 = getTextGridCells(1, this.cols, this.rows);
    const cellsText = getTextGridCells(COUNTDOWN_TEXT, this.textCols, this.rows);

    this.count = Math.max(cells3.length, cells2.length, cells1.length, cellsText.length) / 2;

    // Visible half-width/half-height at the camera's fixed distance —
    // used so the final burst genuinely reaches edge-to-edge of the
    // actual screen (see playSequence's burst call) instead of a fixed
    // world-unit distance that would look tiny on a wide screen or
    // overflow a narrow one.
    const verticalHalfFovRad = (camera.fov / 2) * (Math.PI / 180);
    const halfHeight = Math.tan(verticalHalfFovRad) * Math.abs(camera.position.z);
    const halfWidth = halfHeight * camera.aspect;
    this._burstReach = Math.hypot(halfWidth, halfHeight);

    // The dot's own solid footprint, vs. the (bigger) rendered point
    // sprite that leaves room around it for the glow halo — see
    // particleFragmentShader's uCoreFraction. fillRatio/glowMargin come
    // from the same per-tier `grid` config (coarser grids get smaller
    // ratios so their much-bigger cells don't swallow each other). On a
    // narrow/mobile viewport, an extra scale-down is applied on top —
    // that's a screen-size problem (fewer physical pixels across the
    // same world-space gap), not a GPU-tier one, so it's independent of
    // which `grid` tier got picked.
    const fillScale = isMobile ? COUNTDOWN_MOBILE_FILL_SCALE : 1;
    const glowScale = isMobile ? COUNTDOWN_MOBILE_GLOW_SCALE : 1;

    const dotSize = this.spacing * grid.fillRatio * fillScale;
    const spriteSize = dotSize * grid.glowMargin * glowScale;
    const coreFraction = 1 / (grid.glowMargin * glowScale);

    this.engine = new ParticleEngine({
      count: this.count,
      mode: "morph",
      size: spriteSize,
      color: COUNTDOWN_COLOR,
      // Starts fully invisible — nothing is on screen until
      // COUNTDOWN_ENTER_DELAY, when playSequence() fades this up to
      // COUNTDOWN_OPACITY. Positions are still set up front (below) so
      // that fade-in reveals the already-scattered layout instantly
      // rather than popping particles into existence at (0,0,0) first.
      opacity: 0,
      duration: COUNTDOWN_ASSEMBLE_DURATION,
      coreFraction,
    });
    this.points = this.engine.points;

    // Sampled once up front so each transform is a straight morph
    // between two already-known layouts, not a re-rasterize mid-sequence.
    this._digitTargets = {
      3: this._buildGridTargets(cells3, this.cols),
      2: this._buildGridTargets(cells2, this.cols),
      1: this._buildGridTargets(cells1, this.cols),
      text: this._buildGridTargets(cellsText, this.textCols),
    };

    // Starts scattered around the digit's own area (not the whole
    // screen) so the first assemble reads as "gathering in", not
    // "flying in from everywhere". Only the SCATTER state is random —
    // every _digitTargets entry above is already exact grid coordinates.
    this.engine.reset(this._scatterPositions());
  }

  // Maps `this.count` particles onto `cells` (a flat [i, j, i, j, ...]
  // "on" cell list, sampled at `cols` columns x this.rows rows) round-
  // robin, so every particle's target is always an exact grid coordinate
  // — cells receiving more than one particle just get harmless exact-
  // overlap duplicates, never an off-grid point.
  _buildGridTargets(cells, cols) {
    const cellCount = cells.length / 2;
    const targets = new Float32Array(this.count * 3);
    const world = [0, 0, 0];

    for (let p = 0; p < this.count; p++) {
      const c = p % cellCount;
      gridCellToWorld(cells[c * 2], cells[c * 2 + 1], cols, this.rows, this.spacing, world);
      targets[p * 3] = world[0];
      targets[p * 3 + 1] = world[1];
      targets[p * 3 + 2] = world[2];
    }

    return targets;
  }

  _scatterPositions() {
    const positions = new Float32Array(this.count * 3);
    const r = COUNTDOWN_SCATTER_RADIUS;

    for (let i = 0; i < this.count; i++) {
      positions[i * 3] = randRange(-r, r);
      positions[i * 3 + 1] = randRange(-r, r);
      positions[i * 3 + 2] = randRange(-0.6, 0.6);
    }

    return positions;
  }

  // Explodes each particle outward from wherever it currently sits (the
  // formed "1"), not from a shared origin — that's what makes it read as
  // the number itself breaking apart rather than particles being fired
  // from a point, and randomized per-particle distance means particles
  // covering more ground move faster over the same duration, giving
  // "some faster, some slower" variation without a dedicated per-
  // particle velocity system. Only used by the final burst.
  _explodeTargets(minDist, maxDist, zJitter) {
    const current = this.engine.getCurrentPositions();
    const targets = new Float32Array(this.count * 3);

    for (let i = 0; i < this.count; i++) {
      const x = current[i * 3];
      const y = current[i * 3 + 1];
      const len = Math.hypot(x, y) || 1;

      const jitter = randRange(-0.35, 0.35);
      const cos = Math.cos(jitter);
      const sin = Math.sin(jitter);
      const dirX = (x / len) * cos - (y / len) * sin;
      const dirY = (x / len) * sin + (y / len) * cos;

      const dist = randRange(minDist, maxDist);

      targets[i * 3] = x + dirX * dist;
      targets[i * 3 + 1] = y + dirY * dist;
      targets[i * 3 + 2] = current[i * 3 + 2] + randRange(-zJitter, zJitter);
    }

    return targets;
  }

  // One master timeline for scatter -> 3 -> 2 -> 1 -> explode -> "You",
  // the same "single gsap.timeline, nothing on setTimeout" shape as
  // standard's own Countdown.js. `onComplete` fires once "You" has
  // fully formed — this is the sequence's END STATE, not a transient
  // beat: the word stays formed, nothing here fades it out or destroys
  // it afterward (HyateiScene only tears it down when the whole scene
  // itself is destroyed).
  playSequence(onComplete) {
    const tl = gsap.timeline({ onComplete: () => onComplete && onComplete() });
    this._timeline = tl;

    let cursor = COUNTDOWN_ENTER_DELAY;

    // Nothing is visible before this point. At `cursor`, the already-
    // scattered particles fade into view in place (no movement yet) —
    // "appearing randomly in space" — and only once that fade finishes
    // does the pull toward "3" begin.
    tl.to(
      this.engine.material.uniforms.uOpacity,
      { value: COUNTDOWN_OPACITY, duration: COUNTDOWN_APPEAR_DURATION, ease: "power1.out" },
      cursor,
    );
    cursor += COUNTDOWN_APPEAR_DURATION;

    tl.call(
      () => this.engine.morphTo(this._digitTargets[3], { duration: COUNTDOWN_ASSEMBLE_DURATION }),
      null,
      cursor,
    );
    cursor += COUNTDOWN_ASSEMBLE_DURATION + COUNTDOWN_HOLD_DURATION;

    tl.call(
      () => this.engine.morphTo(this._digitTargets[2], { duration: COUNTDOWN_TRANSFORM_DURATION }),
      null,
      cursor,
    );
    cursor += COUNTDOWN_TRANSFORM_DURATION + COUNTDOWN_HOLD_DURATION;

    tl.call(
      () => this.engine.morphTo(this._digitTargets[1], { duration: COUNTDOWN_TRANSFORM_DURATION }),
      null,
      cursor,
    );
    cursor += COUNTDOWN_TRANSFORM_DURATION + COUNTDOWN_FINAL_HOLD_DURATION;

    tl.call(
      () =>
        this.engine.morphTo(
          this._explodeTargets(
            this._burstReach * COUNTDOWN_BURST_REACH_MIN_FRACTION,
            this._burstReach * COUNTDOWN_BURST_REACH_MAX_FRACTION,
            3,
          ),
          { duration: COUNTDOWN_BURST_DURATION },
        ),
      null,
      cursor,
    );
    cursor += COUNTDOWN_BURST_DURATION + COUNTDOWN_SCATTERED_HOLD_DURATION;

    // Pulled back in from across the whole space into "You" — same
    // particles, same morphTo mechanism as every earlier beat.
    tl.call(
      () => this.engine.morphTo(this._digitTargets.text, { duration: COUNTDOWN_GATHER_DURATION }),
      null,
      cursor,
    );
    cursor += COUNTDOWN_GATHER_DURATION;

    return tl;
  }

  update(delta) {
    this.engine.update(delta);
  }

  destroy() {
    if (this._timeline) this._timeline.kill();
    this.engine.destroy();
  }
}
