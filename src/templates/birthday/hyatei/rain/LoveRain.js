import gsap from "gsap";
import * as THREE from "three";

import ParticleEngine from "../particles/ParticleEngine";
import { getRainGlyphAtlas } from "./GlyphAtlas";
import {
  RAIN_COLOR,
  RAIN_GLYPHS,
  RAIN_GLYPH_WEIGHTS,
  RAIN_COUNT_BY_PERFORMANCE,
  RAIN_SIZE,
  RAIN_SPEED_MIN,
  RAIN_SPEED_MAX,
  RAIN_SIZE_MULT_MIN,
  RAIN_SIZE_MULT_MAX,
  RAIN_BRIGHTNESS_MIN,
  RAIN_BRIGHTNESS_MAX,
  RAIN_ATTRACTION_MAX,
  RAIN_ATTRACTION_RAMP_DELAY,
  RAIN_ATTRACTION_RAMP_DURATION,
  RAIN_FADE_OPACITY,
  RAIN_FADE_DURATION,
} from "../Constants";

function weightedGlyphIndex() {
  const total = RAIN_GLYPH_WEIGHTS.reduce((sum, w) => sum + w, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < RAIN_GLYPH_WEIGHTS.length; i++) {
    roll -= RAIN_GLYPH_WEIGHTS[i];
    if (roll <= 0) return i;
  }
  return RAIN_GLYPH_WEIGHTS.length - 1;
}

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

// Group A from the brief — the continuous, chaotic LOVE-letter/heart
// rain that falls behind the "3" for the whole scene. Owns one
// ParticleEngine in "fall" mode (see ParticleEngine.js); position is
// entirely GPU/time-driven after setup, so update() only advances a
// clock uniform, matching the same "cheap per-frame, real work only at
// setup" shape as the morph engine.
export default class LoveRain {
  constructor({ camera, performanceLevel = "medium" }) {
    this.camera = camera;

    const { halfWidth, halfHeight } = this._getVisibleBounds();

    const count = RAIN_COUNT_BY_PERFORMANCE[performanceLevel] ?? RAIN_COUNT_BY_PERFORMANCE.medium;

    const topEdge = halfHeight * 1.15;
    const fallRange = halfHeight * 2.4;

    this.engine = new ParticleEngine({
      count,
      mode: "fall",
      size: RAIN_SIZE,
      color: RAIN_COLOR,
      texture: getRainGlyphAtlas(RAIN_GLYPHS),
      glyphCount: RAIN_GLYPHS.length,
      fallRange,
      topEdge,
      attractionMax: RAIN_ATTRACTION_MAX,
      attractionRampDelay: RAIN_ATTRACTION_RAMP_DELAY,
      attractionRampDuration: RAIN_ATTRACTION_RAMP_DURATION,
    });

    const x = new Float32Array(count);
    const phase = new Float32Array(count);
    const z = new Float32Array(count);
    const fallSpeed = new Float32Array(count);
    const spawnDelay = new Float32Array(count);
    const rotation = new Float32Array(count);
    const type = new Float32Array(count);
    const brightness = new Float32Array(count);
    const sizeMult = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      x[i] = randRange(-halfWidth * 1.05, halfWidth * 1.05);
      // A random offset INSIDE the shader's mod() (see rainVertexShader) —
      // every particle wraps within the same shared [topEdge - fallRange,
      // topEdge] band forever; this only staggers WHERE each one currently
      // sits in that shared cycle, so the field is fully populated at
      // t=0 and stays that way, with no population-wide drift over time.
      phase[i] = Math.random() * fallRange;
      z[i] = randRange(-1.2, 1.2);
      fallSpeed[i] = randRange(RAIN_SPEED_MIN, RAIN_SPEED_MAX);
      // Unused — rainVertexShader no longer reads this slot. No particle
      // ever fades in/out; every particle is at full per-particle
      // brightness from uTime=0, continuously, for the whole scene.
      spawnDelay[i] = 0;
      rotation[i] = randRange(0, Math.PI * 2);
      type[i] = weightedGlyphIndex();
      brightness[i] = randRange(RAIN_BRIGHTNESS_MIN, RAIN_BRIGHTNESS_MAX);
      sizeMult[i] = randRange(RAIN_SIZE_MULT_MIN, RAIN_SIZE_MULT_MAX);
    }

    this.engine.initFallData({
      x, phase, z, fallSpeed, spawnDelay, rotation, type, brightness, sizeMult,
    });

    this.points = this.engine.points;
  }

  _getVisibleBounds() {
    const distance = Math.abs(this.camera.position.z);
    const verticalHalfFovRad = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const halfHeight = Math.tan(verticalHalfFovRad) * distance;
    const halfWidth = halfHeight * this.camera.aspect;
    return { halfWidth, halfHeight };
  }

  setSpeedMult(mult) {
    this.engine.setSpeedMult(mult);
  }

  // Dims the rain to RAIN_FADE_OPACITY (a partial fade, not full removal
  // — the rain keeps quietly falling underneath, just far less visually
  // dominant) once the particle heart takes over as the scene's main
  // focus. Never called from within LoveRain itself — a caller (e.g.
  // HyateiScene, once HeartFormation signals it's done) decides when.
  fadeOut() {
    gsap.to(this.engine.material.uniforms.uOpacity, {
      value: RAIN_FADE_OPACITY,
      duration: RAIN_FADE_DURATION,
      ease: "power1.out",
    });
  }

  update(delta) {
    this.engine.update(delta);
  }

  destroy() {
    this.engine.destroy();
  }
}
