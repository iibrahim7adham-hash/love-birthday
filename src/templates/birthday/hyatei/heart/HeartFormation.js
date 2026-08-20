import gsap from "gsap";
import * as THREE from "three";

import {
  HEART_BAND_BIAS_POWER,
  HEART_BAND_HALF_WIDTH_FRACTION,
  HEART_BOB_AMP,
  HEART_BOB_SPEED,
  HEART_BREATHE_AMP,
  HEART_BREATHE_SPEED,
  HEART_COLORS,
  HEART_COLOR_WEIGHTS,
  HEART_COUNT_BY_PERFORMANCE,
  HEART_FORMATION_DELAY_SPREAD,
  HEART_FORMATION_DURATION,
  HEART_FORMATION_LIFT_MAX,
  HEART_FORMATION_LIFT_MIN,
  HEART_FORMATION_SWIRL_MAX,
  HEART_FORMATION_SWIRL_MIN,
  HEART_HEIGHT_FRACTION,
  HEART_JITTER_ALONG_FRACTION,
  HEART_JITTER_NORMAL_FRACTION,
  HEART_APPEAR_DURATION,
  HEART_OPACITY,
  HEART_SCATTER_REACH_MAX_FRACTION,
  HEART_SCATTER_REACH_MIN_FRACTION,
  HEART_SCATTER_Z_SPREAD,
  HEART_SIZE_ACCENT_FRACTION,
  HEART_SIZE_ACCENT_MULT,
  HEART_SIZE_MAX,
  HEART_SIZE_MIN,
} from "../Constants";
import ParticleEngine from "../particles/ParticleEngine";
import { getHeartParticleTexture } from "./HeartAtlas";
import { buildHeartLUT, sampleHeartByArcLength, sampleHeartNormal } from "./HeartCurve";

// The golden angle and a handful of irrational fractional-part step
// sizes — same deterministic low-discrepancy convention as
// NumberParticles.js (GOLDEN_ANGLE/LD_STEPS/ld()), reused here rather
// than imported so this module stays fully self-contained (see
// CLAUDE.md: only touch what the heart system needs). Every "random-
// looking" per-particle value below (jitter, size, color, delay, swirl)
// comes from one of these channels, not Math.random — deterministic
// every run, still organic-looking, no visible repetition.
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const LD_STEPS = [
  0.6180339887498949, // golden ratio conjugate
  0.4142135623730951, // sqrt(2) - 1
  0.7320508075688772, // sqrt(3) - 1
  0.23606797749978969, // sqrt(5) - 2
  0.6457513110645907, // sqrt(7) - 2
  0.3166247903554, // sqrt(11) - 3
  0.16227766016837952, // sqrt(15) - 3.5ish, its own decorrelated channel
  0.5468050632911392,
];

function ld(i, channel) {
  const x = (i + 1) * LD_STEPS[channel];
  return x - Math.floor(x);
}

function weightedIndex(weights, roll) {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let r = roll * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

const HEART_COLOR_RGB = HEART_COLORS.map((hex) => {
  const c = new THREE.Color(hex);
  return [c.r, c.g, c.b];
});

// A big, cinematic particle-built heart, mathematically constructed from
// the exact parametric curve in HeartCurve.js (never a random cloud —
// see createHeartTargets()) and rendered with tiny glowing pink heart
// sprites (see HeartAtlas.js). Owns one ParticleEngine in "heart" mode,
// its own THREE.Points sitting alongside HyateiScene's LoveRain/
// NumberParticles — never touches either of their engines/uniforms.
export default class HeartFormation {
  constructor({ camera, performanceLevel = "medium" }) {
    this.camera = camera;

    const { halfWidth, halfHeight } = this._getVisibleBounds();
    this._scatterReach = Math.hypot(halfWidth, halfHeight);

    this.count = HEART_COUNT_BY_PERFORMANCE[performanceLevel] ?? HEART_COUNT_BY_PERFORMANCE.medium;

    // Sized off the SMALLER of the two visible half-extents, not just
    // half-height. This camera holds horizontal fov roughly constant and
    // widens vertical fov to compensate on narrow aspects (see
    // Camera.js's computeResponsiveFov) — on a portrait phone that makes
    // halfHeight far bigger than halfWidth, so a size based on height
    // alone way overshoots the actually-visible width and the heart
    // reads as huge/cropped. The heart curve's own width and height are
    // near-identical (see HeartCurve.js's bounding box), so capping by
    // min(halfWidth, halfHeight) keeps it fully on-screen, at a
    // consistent relative size, on any aspect ratio.
    this.heartWorldHeight = Math.min(halfWidth, halfHeight) * 2 * HEART_HEIGHT_FRACTION;

    this.engine = new ParticleEngine({
      count: this.count,
      mode: "heart",
      opacity: 0,
      texture: getHeartParticleTexture(),
      breatheAmp: HEART_BREATHE_AMP,
      breatheSpeed: HEART_BREATHE_SPEED,
      bobAmp: HEART_BOB_AMP,
      bobSpeed: HEART_BOB_SPEED,
    });
    this.points = this.engine.points;

    const { targets, sizes, colors, phases } = this.createHeartTargets();
    this._heartTargets = targets;

    this.engine.initHeartVaryings({ size: sizes, color: colors, phase: phases });
    this.engine.reset(this._buildScatterPositions());

    this._formed = false;
  }

  _getVisibleBounds() {
    const distance = Math.abs(this.camera.position.z);
    const verticalHalfFovRad = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const halfHeight = Math.tan(verticalHalfFovRad) * distance;
    const halfWidth = halfHeight * this.camera.aspect;
    return { halfWidth, halfHeight };
  }

  // The heart's target positions — the ONLY source of the silhouette.
  // Built from the mathematical curve (HeartCurve.js), sampled evenly by
  // arc length, offset across a CONTINUOUS band around the curve's local
  // normal (see HEART_BAND_HALF_WIDTH_FRACTION/HEART_BAND_BIAS_POWER in
  // Constants.js) so the contour reads as one soft thick band rather
  // than a single thin line, a filled disc, or — as an earlier discrete
  // inner/middle/outer version did — visibly separate parallel lines.
  // The interior stays empty because nothing samples it. Any per-
  // particle "noise" here is a small nudge around an already-computed
  // exact band position (spec section 2), never a free placement.
  createHeartTargets() {
    const lut = buildHeartLUT();
    const curveHeight = lut.maxY - lut.minY;
    const scale = this.heartWorldHeight / curveHeight;
    const centerX = (lut.minX + lut.maxX) / 2;
    const centerY = (lut.minY + lut.maxY) / 2;

    const targets = new Float32Array(this.count * 3);
    const sizes = new Float32Array(this.count);
    const colors = new Float32Array(this.count * 3);
    const phases = new Float32Array(this.count);

    for (let i = 0; i < this.count; i++) {
      // Evenly spread around the perimeter (index-driven) plus a small
      // controlled jitter so particles don't sit in a perfectly even
      // comb.
      const s = (i / this.count + (ld(i, 1) - 0.5) * HEART_JITTER_ALONG_FRACTION) % 1;
      const [cx, cy] = sampleHeartByArcLength(lut, s);
      const [nx, ny] = sampleHeartNormal(lut, s);

      // Signed, center-biased band offset: raising a signed 0..1 value
      // to HEART_BAND_BIAS_POWER before scaling packs most particles
      // close to the exact curve (band offset ~ 0) and thins smoothly
      // toward +/-HEART_BAND_HALF_WIDTH_FRACTION — a continuous density
      // gradient across the band's own width, not discrete strata, so
      // there's no gap for the eye to read as a separate line.
      const signed = ld(i, 0) * 2 - 1; // -1..1
      const bandOffset =
        Math.sign(signed) *
        Math.pow(Math.abs(signed), HEART_BAND_BIAS_POWER) *
        HEART_BAND_HALF_WIDTH_FRACTION *
        this.heartWorldHeight;
      const jitter = (ld(i, 2) - 0.5) * HEART_JITTER_NORMAL_FRACTION * this.heartWorldHeight;
      const normalOffset = bandOffset + jitter;

      const worldX = (cx - centerX) * scale + nx * normalOffset;
      const worldY = (cy - centerY) * scale + ny * normalOffset;
      // A shallow depth band, not a flat plane — reads as a 3D particle
      // formation floating in space (spec section 7) while staying
      // perfectly readable from the front (small range, no perspective-
      // distorting depth).
      const worldZ = (ld(i, 3) - 0.5) * this.heartWorldHeight * 0.06;

      targets[i * 3] = worldX;
      targets[i * 3 + 1] = worldY;
      targets[i * 3 + 2] = worldZ;

      // Size: smoothly biased toward the small end (pow > 1 skews the
      // low-discrepancy channel toward 0) so small particles dominate,
      // with a rare, still-continuous accent multiplier for the
      // "slightly larger heart particles" spec section 3 asks for.
      const sizeT = Math.pow(ld(i, 4), 2.4);
      let size = HEART_SIZE_MIN + sizeT * (HEART_SIZE_MAX - HEART_SIZE_MIN);
      if (ld(i, 5) < HEART_SIZE_ACCENT_FRACTION) {
        size *= HEART_SIZE_ACCENT_MULT;
      }
      sizes[i] = size;

      // Color: pick a weighted palette index, then blend a little toward
      // its neighbor for continuous per-particle variation instead of
      // exactly 4 flat colors.
      const colorIndex = weightedIndex(HEART_COLOR_WEIGHTS, ld(i, 6));
      const neighborIndex = (colorIndex + 1) % HEART_COLOR_RGB.length;
      const blend = ld(i, 7) * 0.35;
      const base = HEART_COLOR_RGB[colorIndex];
      const neighbor = HEART_COLOR_RGB[neighborIndex];
      colors[i * 3] = base[0] + (neighbor[0] - base[0]) * blend;
      colors[i * 3 + 1] = base[1] + (neighbor[1] - base[1]) * blend;
      colors[i * 3 + 2] = base[2] + (neighbor[2] - base[2]) * blend;

      // Per-particle bob phase — decorrelated from every other channel
      // above via its own golden-angle step, so the settled heart's
      // float doesn't read as a shared wave.
      phases[i] = (i * GOLDEN_ANGLE) % (Math.PI * 2);
    }

    return { targets, sizes, colors, phases };
  }

  // Where every particle starts: scattered across a wide volume well
  // beyond the visible frame (spec section 8 — "dispersed around the
  // scene"), spread over a golden-angle spiral for even coverage with no
  // clustering/no visible pattern, at a random-looking (but
  // deterministic) distance and depth so particles approach the heart
  // from many different directions rather than a shared shell.
  _buildScatterPositions() {
    const positions = new Float32Array(this.count * 3);

    for (let i = 0; i < this.count; i++) {
      const angle = i * GOLDEN_ANGLE;
      const reach =
        this._scatterReach *
        (HEART_SCATTER_REACH_MIN_FRACTION +
          ld(i, 0) * (HEART_SCATTER_REACH_MAX_FRACTION - HEART_SCATTER_REACH_MIN_FRACTION));

      positions[i * 3] = Math.cos(angle) * reach;
      positions[i * 3 + 1] = Math.sin(angle) * reach;
      positions[i * 3 + 2] = (ld(i, 1) - 0.5) * HEART_SCATTER_Z_SPREAD;
    }

    return positions;
  }

  // Bezier control points bowing each particle's flight from its
  // scattered start toward its exact heart target — same tangential-
  // sweep + forward-lift language as NumberParticles._buildEntranceControls
  // (a fixed-handedness 90 degree rotation of the travel direction for
  // every particle, so the whole gather reads as one coherent inward
  // swirl, plus a small toward-camera bulge before settling flat).
  _buildFormationControls(start, target) {
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

      const nx = -dy / dist;
      const ny = dx / dist;

      const along = 0.5 + ld(i, 2) * 0.25;
      const mag =
        dist *
        (HEART_FORMATION_SWIRL_MIN + ld(i, 3) * (HEART_FORMATION_SWIRL_MAX - HEART_FORMATION_SWIRL_MIN));
      const lift =
        dist *
        (HEART_FORMATION_LIFT_MIN + ld(i, 4) * (HEART_FORMATION_LIFT_MAX - HEART_FORMATION_LIFT_MIN));

      controls[i * 3] = sx + dx * along + nx * mag;
      controls[i * 3 + 1] = sy + dy * along + ny * mag;
      controls[i * 3 + 2] = (sz + tz) / 2 + lift;
    }

    return controls;
  }

  // Per-particle stagger (spec section 8 — "not all move simultaneously
  // at exactly the same speed"), deterministic per index, reused as-is
  // every time playFormation() is called.
  _buildFormationDelays() {
    const delays = new Float32Array(this.count);
    for (let i = 0; i < this.count; i++) {
      delays[i] = ld(i, 5) * HEART_FORMATION_DELAY_SPREAD;
    }
    return delays;
  }

  // Fades in already-scattered, then gathers every particle onto its
  // exact heart-curve target over HEART_FORMATION_DURATION with per-
  // particle stagger + swirl — SPACE -> CONVERGENCE -> HEART (spec
  // section 10). `onComplete`, if given, fires once particles have
  // actually finished arriving, not merely once the morph has been
  // kicked off — same "callback after the real end state" convention as
  // NumberParticles.playSequence(onComplete). Idempotent no-op once
  // already formed.
  playFormation(onComplete) {
    if (this._formed) return;
    this._formed = true;

    const tl = gsap.timeline({ onComplete: () => onComplete && onComplete() });
    this._timeline = tl;

    tl.to(this.engine.material.uniforms.uOpacity, {
      value: HEART_OPACITY,
      duration: HEART_APPEAR_DURATION,
      ease: "power1.out",
    });

    tl.call(() => {
      const current = this.engine.getCurrentPositions();
      this.engine.morphTo(this._heartTargets, {
        duration: HEART_FORMATION_DURATION,
        controlPositions: this._buildFormationControls(current, this._heartTargets),
        delays: this._buildFormationDelays(),
      });
    });

    // The morph itself runs on ParticleEngine's own per-frame progress
    // (see ParticleEngine.update()), not on this gsap timeline — without
    // this matching no-op tween, the timeline (and its onComplete) would
    // finish right after the call() above fires, well before particles
    // have actually arrived.
    tl.to({}, { duration: HEART_FORMATION_DURATION });

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
