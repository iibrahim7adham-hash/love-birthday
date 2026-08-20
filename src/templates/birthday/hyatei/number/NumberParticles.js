import gsap from "gsap";

import {
  COUNTDOWN_APPEAR_DURATION,
  COUNTDOWN_ASSEMBLE_DURATION,
  COUNTDOWN_BURST_DURATION,
  COUNTDOWN_BURST_REACH_MAX_FRACTION,
  COUNTDOWN_BURST_REACH_MIN_FRACTION,
  COUNTDOWN_COLOR,
  COUNTDOWN_DIGIT_SIZE,
  COUNTDOWN_ENTER_DELAY,
  COUNTDOWN_ENTRANCE_BLOOM_LIFT_MAX,
  COUNTDOWN_ENTRANCE_BLOOM_LIFT_MIN,
  COUNTDOWN_ENTRANCE_CIRCLE_RADIUS,
  COUNTDOWN_ENTRANCE_DELAY_SPREAD,
  COUNTDOWN_ENTRANCE_SWIRL_MAX,
  COUNTDOWN_ENTRANCE_SWIRL_MIN,
  COUNTDOWN_ENTRANCE_Z_JITTER,
  COUNTDOWN_FINAL_HOLD_DURATION,
  COUNTDOWN_FINALE_DISPERSE_DURATION,
  COUNTDOWN_FINALE_DISPERSE_REACH_MAX_FRACTION,
  COUNTDOWN_FINALE_DISPERSE_REACH_MIN_FRACTION,
  COUNTDOWN_FINALE_FADE_DELAY_FRACTION,
  COUNTDOWN_FINALE_FADE_DURATION,
  COUNTDOWN_FINALE_HOLD_DURATION,
  COUNTDOWN_GATHER_DURATION,
  COUNTDOWN_GRID_BY_PERFORMANCE,
  COUNTDOWN_HOLD_DURATION,
  COUNTDOWN_MOBILE_FILL_SCALE,
  COUNTDOWN_MOBILE_GLOW_SCALE,
  COUNTDOWN_OPACITY,
  COUNTDOWN_SCATTERED_HOLD_DURATION,
  COUNTDOWN_TEXT,
  COUNTDOWN_TEXT_2,
  COUNTDOWN_TEXT_2_HOLD_DURATION,
  COUNTDOWN_TEXT_2_TRANSFORM_DURATION,
  COUNTDOWN_TEXT_3,
  COUNTDOWN_TEXT_3_HOLD_DURATION,
  COUNTDOWN_TEXT_3_TRANSFORM_DURATION,
  COUNTDOWN_TEXT_4,
  COUNTDOWN_TEXT_4_HOLD_DURATION,
  COUNTDOWN_TEXT_4_TRANSFORM_DURATION,
  COUNTDOWN_TEXT_ASPECT,
  COUNTDOWN_TRANSFORM_DURATION,
} from "../Constants";
import ParticleEngine from "../particles/ParticleEngine";
import { getTextGridCells, gridCellToWorld } from "./GlyphSampler";

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

// The golden angle — successive multiples of it, taken mod 2*PI, spread
// points around a circle with no clustering and no visible repeating
// pattern (the classic sunflower-seed spiral). Used instead of
// Math.random() for the entrance's spawn angle so the formation is
// deterministic (same every run) while still reading as organic.
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

// A handful of irrational fractional parts, each used as the step of its
// own low-discrepancy sequence (ld() below) — decorrelated from each
// other and from GOLDEN_ANGLE, so per-particle "jitter" values sampled
// from different channels don't covary. This is what makes
// _buildEntrancePositions()/_buildEntranceControls() deterministic (no
// Math.random anywhere in them) while still avoiding any obvious grid or
// repetition in the result.
const LD_STEPS = [
  0.6180339887498949, // golden ratio conjugate
  0.4142135623730951, // sqrt(2) - 1
  0.7320508075688772, // sqrt(3) - 1
  0.23606797749978969, // sqrt(5) - 2
  0.6457513110645907, // sqrt(7) - 2
  0.3166247903554, // sqrt(11) - 3
];

function ld(i, channel) {
  const x = (i + 1) * LD_STEPS[channel];
  return x - Math.floor(x);
}

// The countdown's entire visual surface: "3" -> "2" -> "1" -> a big
// explosion across the whole visible space -> gathering back into the
// word "You" -> "Are" -> "My" -> "Love" -> a soft final drift apart and
// fade to nothing, each stage built from and transforming into the next
// out of the SAME set of round glowing particles (never rebuilt/
// re-spawned — see morphTo() below). Owns one ParticleEngine in "morph"
// mode, rendered as its own THREE.Points sitting in front of
// HyateiScene's LoveRain — it never touches LoveRain's engine, uniforms,
// or timing.
export default class NumberParticles {
  constructor({ camera, performanceLevel = "medium", isMobile = false }) {
    const grid =
      COUNTDOWN_GRID_BY_PERFORMANCE[performanceLevel] ??
      COUNTDOWN_GRID_BY_PERFORMANCE.medium;

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
    const cellsText = getTextGridCells(
      COUNTDOWN_TEXT,
      this.textCols,
      this.rows,
    );
    const cellsText2 = getTextGridCells(
      COUNTDOWN_TEXT_2,
      this.textCols,
      this.rows,
    );
    const cellsText3 = getTextGridCells(
      COUNTDOWN_TEXT_3,
      this.textCols,
      this.rows,
    );
    const cellsText4 = getTextGridCells(
      COUNTDOWN_TEXT_4,
      this.textCols,
      this.rows,
    );

    this.count =
      Math.max(
        cells3.length,
        cells2.length,
        cells1.length,
        cellsText.length,
        cellsText2.length,
        cellsText3.length,
        cellsText4.length,
      ) / 2;

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
      // that fade-in reveals the already-in-place entrance formation
      // instantly rather than popping particles into existence at
      // (0,0,0) first.
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
      text2: this._buildGridTargets(cellsText2, this.textCols),
      text3: this._buildGridTargets(cellsText3, this.textCols),
      text4: this._buildGridTargets(cellsText4, this.textCols),
    };

    // Starts gathered at the digit's own center as one small circle —
    // see _buildEntrancePositions(). Only the ENTRANCE state is
    // generated this way; every _digitTargets entry above is already
    // exact grid coordinates.
    this.engine.reset(this._buildEntrancePositions());
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
      gridCellToWorld(
        cells[c * 2],
        cells[c * 2 + 1],
        cols,
        this.rows,
        this.spacing,
        world,
      );
      targets[p * 3] = world[0];
      targets[p * 3 + 1] = world[1];
      targets[p * 3 + 2] = world[2];
    }

    return targets;
  }

  // Where the entrance begins: every particle starts already gathered at
  // the digit's own center (x = y = z = 0), inside a single small circle
  // of COUNTDOWN_ENTRANCE_CIRCLE_RADIUS — not scattered, not off-screen —
  // so it reads as one small glowing orb that then blooms outward into
  // the "3", never a shape spanning the frame.
  //
  // The angle around that circle comes from GOLDEN_ANGLE stepped by
  // particle index — a deterministic spiral, not Math.random() — so the
  // orb is evenly covered with no clustering and no two runs differ,
  // while still reading as organic rather than a visible ring/grid.
  // Radius uses LINEAR (non-sqrt) per-particle density, which packs more
  // particles near the very center — a bright core with a softer edge,
  // like a small glowing orb, rather than an evenly-filled flat disc.
  _buildEntrancePositions() {
    const positions = new Float32Array(this.count * 3);

    for (let i = 0; i < this.count; i++) {
      const angle = i * GOLDEN_ANGLE;
      const radius = COUNTDOWN_ENTRANCE_CIRCLE_RADIUS * ld(i, 1);

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius;
      positions[i * 3 + 2] = (ld(i, 2) - 0.5) * COUNTDOWN_ENTRANCE_Z_JITTER;
    }

    return positions;
  }

  // Bezier control points for a swirled morph between any two already-
  // known position sets, one per particle — used for the entrance
  // (small center orb -> "3") and reused as-is for the finale's
  // dispersal ("Love" -> scattered apart), since the same curved,
  // per-particle-staggered motion language reads as "gentle" in either
  // direction. Two effects layered on the straight start->target line:
  //
  // 1. A tangential sweep — the control point is offset by the SAME 90
  //    degree rotation of that particle's own (start -> target) travel
  //    direction for every particle (not a random per-particle sign),
  //    which is what makes the whole bloom read as one coherent outward
  //    swirl rather than particles curving every which way and
  //    canceling out.
  // 2. A small forward lift — the control's z bulges slightly toward the
  //    camera before settling back onto the digit's flat z = 0 plane, a
  //    gentle "bloom forward, then settle" life to the unfurl instead of
  //    a perfectly flat outward slide.
  //
  // Magnitude/along-position/lift are each their own deterministic
  // low-discrepancy channel (see ld()) for organic per-particle variety
  // without any Math.random.
  _buildEntranceControls(start, target) {
    const controls = new Float32Array(this.count * 3);

    for (let i = 0; i < this.count; i++) {
      const sx = start[i * 3];
      const sy = start[i * 3 + 1];
      const sz = start[i * 3 + 2];
      const tx = target[i * 3];
      const ty = target[i * 3 + 1];
      const tz = target[i * 3 + 2];

      const dx = tx - sx;
      const dy = ty - sy;
      const dist = Math.hypot(dx, dy) || 0.0001;

      // 90 degree CCW rotation of the (dx, dy) travel direction — fixed
      // handedness, applied identically to every particle.
      const nx = -dy / dist;
      const ny = dx / dist;

      // Biased late (toward the target end) rather than centered — the
      // approach starts calm and mostly straight, with the gentle bend
      // arriving only in the back half of the flight, closer to journey's
      // end. A soft, unhurried curve rather than an early, sharper turn.
      const along = 0.5 + ld(i, 3) * 0.25; // 0.5..0.75
      const mag =
        dist *
        (COUNTDOWN_ENTRANCE_SWIRL_MIN +
          ld(i, 4) * (COUNTDOWN_ENTRANCE_SWIRL_MAX - COUNTDOWN_ENTRANCE_SWIRL_MIN));

      const lift =
        dist *
        (COUNTDOWN_ENTRANCE_BLOOM_LIFT_MIN +
          ld(i, 5) *
            (COUNTDOWN_ENTRANCE_BLOOM_LIFT_MAX - COUNTDOWN_ENTRANCE_BLOOM_LIFT_MIN));

      controls[i * 3] = sx + dx * along + nx * mag;
      controls[i * 3 + 1] = sy + dy * along + ny * mag;
      controls[i * 3 + 2] = (sz + tz) / 2 + lift;
    }

    return controls;
  }

  // Per-particle stagger — see aDelay in particleVertexShader. Used for
  // the entrance and reused as-is for the finale's dispersal. A
  // deterministic low-discrepancy channel (not Math.random), scaled to a
  // fraction of the morph's own duration: some particles depart
  // immediately, others hold briefly first, all still land exactly on
  // target the instant the morph completes.
  _buildEntranceDelays() {
    const delays = new Float32Array(this.count);

    for (let i = 0; i < this.count; i++) {
      delays[i] = ld(i, 0) * COUNTDOWN_ENTRANCE_DELAY_SPREAD;
    }

    return delays;
  }

  // Explodes each particle outward from wherever it currently sits (the
  // formed "1", or later "Love" at the finale), not from a shared
  // origin — that's what makes it read as the shape itself breaking
  // apart rather than particles being fired from a point, and
  // randomized per-particle distance means particles covering more
  // ground move faster over the same duration, giving "some faster,
  // some slower" variation without a dedicated per-particle velocity
  // system. Used by both the "1"->burst explosion and the finale's
  // dispersal.
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

  // One master timeline for entrance -> 3 -> 2 -> 1 -> explode -> "You"
  // -> "Are" -> "My" -> "Love" -> disperse -> fade to nothing, the same
  // "single gsap.timeline, nothing on setTimeout" shape as standard's
  // own Countdown.js. `onComplete` fires once the fade has fully
  // finished — this is the sequence's true END STATE; nothing here
  // reforms or resets the particles afterward (HyateiScene only tears
  // the whole scene down when it itself is destroyed).
  playSequence(onComplete) {
    const tl = gsap.timeline({ onComplete: () => onComplete && onComplete() });
    this._timeline = tl;

    let cursor = COUNTDOWN_ENTER_DELAY;

    // Nothing is visible before this point. At `cursor`, the particles
    // — already gathered into their small center circle, see
    // _buildEntrancePositions() — fade into view in place (no movement
    // yet), and only once that fade finishes does the bloom into "3"
    // begin.
    tl.to(
      this.engine.material.uniforms.uOpacity,
      {
        value: COUNTDOWN_OPACITY,
        duration: COUNTDOWN_APPEAR_DURATION,
        ease: "power1.out",
      },
      cursor,
    );
    cursor += COUNTDOWN_APPEAR_DURATION;

    tl.call(
      () => {
        const current = this.engine.getCurrentPositions();
        this.engine.morphTo(this._digitTargets[3], {
          duration: COUNTDOWN_ASSEMBLE_DURATION,
          controlPositions: this._buildEntranceControls(
            current,
            this._digitTargets[3],
          ),
          delays: this._buildEntranceDelays(),
        });
      },
      null,
      cursor,
    );
    cursor += COUNTDOWN_ASSEMBLE_DURATION + COUNTDOWN_HOLD_DURATION;

    tl.call(
      () =>
        this.engine.morphTo(this._digitTargets[2], {
          duration: COUNTDOWN_TRANSFORM_DURATION,
        }),
      null,
      cursor,
    );
    cursor += COUNTDOWN_TRANSFORM_DURATION + COUNTDOWN_HOLD_DURATION;

    tl.call(
      () =>
        this.engine.morphTo(this._digitTargets[1], {
          duration: COUNTDOWN_TRANSFORM_DURATION,
        }),
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
      () =>
        this.engine.morphTo(this._digitTargets.text, {
          duration: COUNTDOWN_GATHER_DURATION,
        }),
      null,
      cursor,
    );
    cursor += COUNTDOWN_GATHER_DURATION + COUNTDOWN_TEXT_2_HOLD_DURATION;

    // "You" -> "Are" -> "My" -> "Love": three more direct morphs, same
    // mechanism as "3"->"2"->"1" (no swirl/stagger, no explosion in
    // between).
    tl.call(
      () =>
        this.engine.morphTo(this._digitTargets.text2, {
          duration: COUNTDOWN_TEXT_2_TRANSFORM_DURATION,
        }),
      null,
      cursor,
    );
    cursor += COUNTDOWN_TEXT_2_TRANSFORM_DURATION + COUNTDOWN_TEXT_3_HOLD_DURATION;

    tl.call(
      () =>
        this.engine.morphTo(this._digitTargets.text3, {
          duration: COUNTDOWN_TEXT_3_TRANSFORM_DURATION,
        }),
      null,
      cursor,
    );
    cursor += COUNTDOWN_TEXT_3_TRANSFORM_DURATION + COUNTDOWN_TEXT_4_HOLD_DURATION;

    tl.call(
      () =>
        this.engine.morphTo(this._digitTargets.text4, {
          duration: COUNTDOWN_TEXT_4_TRANSFORM_DURATION,
        }),
      null,
      cursor,
    );
    cursor += COUNTDOWN_TEXT_4_TRANSFORM_DURATION + COUNTDOWN_FINALE_HOLD_DURATION;

    // The finale: "Love" holds, then drifts apart into open space — the
    // SAME swirl/stagger math as the opening entrance bloom
    // (_buildEntranceControls/_buildEntranceDelays), just mirrored
    // outward instead of inward, so the goodbye reads as the same
    // gentle, unhurried motion language as the arrival rather than the
    // sharper "1"->burst explosion earlier in the sequence. This is now
    // the sequence's true end state: nothing forms after this.
    tl.call(
      () => {
        const current = this.engine.getCurrentPositions();
        const targets = this._explodeTargets(
          this._burstReach * COUNTDOWN_FINALE_DISPERSE_REACH_MIN_FRACTION,
          this._burstReach * COUNTDOWN_FINALE_DISPERSE_REACH_MAX_FRACTION,
          1.5,
        );
        this.engine.morphTo(targets, {
          duration: COUNTDOWN_FINALE_DISPERSE_DURATION,
          controlPositions: this._buildEntranceControls(current, targets),
          delays: this._buildEntranceDelays(),
        });
      },
      null,
      cursor,
    );

    // Started partway through the drift (not only once it's fully
    // finished) so the particles are visibly still in gentle motion as
    // they dim, rather than coming to a dead stop and only then fading.
    tl.to(
      this.engine.material.uniforms.uOpacity,
      {
        value: 0,
        duration: COUNTDOWN_FINALE_FADE_DURATION,
        ease: "power1.in",
      },
      cursor + COUNTDOWN_FINALE_DISPERSE_DURATION * COUNTDOWN_FINALE_FADE_DELAY_FRACTION,
    );
    cursor +=
      Math.max(
        COUNTDOWN_FINALE_DISPERSE_DURATION,
        COUNTDOWN_FINALE_DISPERSE_DURATION * COUNTDOWN_FINALE_FADE_DELAY_FRACTION +
          COUNTDOWN_FINALE_FADE_DURATION,
      );

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
