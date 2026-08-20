import * as THREE from "three";

import {
  particleVertexShader,
  particleFragmentShader,
  rainVertexShader,
  rainFragmentShader,
  heartParticleVertexShader,
  heartParticleFragmentShader,
} from "./shaders";

// easeInOutCubic — the only easing this engine needs; kept local instead
// of pulling in a dependency for one function.
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Reusable core particle engine for the `hyatei` template.
//
// Rendering is a single THREE.Points draw call. Per-particle position
// interpolation happens on the GPU (vertex shader mixes aStart -> aTarget
// by a uProgress uniform), so update() only advances one float per
// frame — no per-particle work, no buffer re-upload, on the animation
// loop's hot path. The O(particleCount) work (writing new start/target
// attributes) only happens when morphTo()/scatter()/reset() are called,
// i.e. on transition boundaries, not every frame.
//
// Deliberately has no knowledge of any specific shape, text, or
// sequence — callers supply target positions.
export default class ParticleEngine {
  constructor({
    count = 2000,
    size = 0.08,
    color = 0xffffff,
    opacity = 1,
    duration = 1.2,
    // "morph" (default, unchanged) interpolates aStart -> aTarget by a
    // shared uProgress uniform via morphTo()/scatter()/reset(). "fall"
    // (see initFallData()) instead drives position from continuous
    // elapsed time plus per-particle static attributes and an optional
    // glyph texture atlas — for continuously-falling rain that never
    // "arrives" anywhere, which a shared progress value can't express.
    // "heart" (see initHeartVaryings()) is the same aStart/aControl/
    // aTarget/aDelay morph as "morph", plus per-particle aSize/aColor and
    // a textured sprite instead of a procedural dot — see
    // heartParticleVertexShader/heartParticleFragmentShader.
    mode = "morph",
    texture = null,
    glyphCount = 1,
    fallRange = 40,
    topEdge = 0,
    // fall mode only — see uAttraction in rainVertexShader. Ramps
    // 0 -> attractionMax with a smoothstep easing, starting after
    // attractionRampDelay seconds of plain falling. attractionMax = 0
    // (default) keeps the pull permanently off.
    attractionMax = 0,
    attractionRampDelay = 0,
    attractionRampDuration = 1,
    // morph mode only — see uCoreFraction in particleFragmentShader.
    // Fraction of the point sprite's radius that's the bright dot core;
    // the rest (coreFraction..1) is the glow halo. Sprite size (uSize)
    // can then be made bigger than the "true" dot footprint to leave
    // room for that halo without growing the dot itself.
    coreFraction = 0.55,
    // heart mode only — see heartParticleVertexShader. Small, always-on
    // whole-shape breathe (sin-driven scale of pos.xy about the origin)
    // and per-particle bob (sin/cos of uTime + aPhase).
    breatheAmp = 0.02,
    breatheSpeed = 0.35,
    bobAmp = 0.015,
    bobSpeed = 0.6,
    // heart mode only — see heartParticleFragmentShader's
    // uUseTextureColor. false (default) is the tintable white-mask
    // sprite every existing heart-mode caller uses; true is for an
    // already-fully-colored sprite (heart/LayeredHeartAtlas.js).
    useTextureColor = false,
  } = {}) {
    this.count = count;
    this.duration = duration;
    this.mode = mode;
    this.attractionMax = attractionMax;
    this.attractionRampDelay = attractionRampDelay;
    this.attractionRampDuration = attractionRampDuration;

    this.geometry = new THREE.BufferGeometry();

    const initial = new Float32Array(count * 3);

    if (mode === "fall") {
      this.geometry.setAttribute(
        "aStart",
        new THREE.BufferAttribute(initial.slice(), 3),
      );
      this.geometry.setAttribute(
        "aTarget",
        new THREE.BufferAttribute(initial.slice(), 3),
      );
      this.geometry.setAttribute(
        "aVary",
        new THREE.BufferAttribute(new Float32Array(count * 3), 3),
      );
      this.geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(initial, 3),
      );

      this._elapsed = 0;

      this.material = new THREE.ShaderMaterial({
        vertexShader: rainVertexShader,
        fragmentShader: rainFragmentShader,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uFallRange: { value: fallRange },
          uTopEdge: { value: topEdge },
          uSpeedMult: { value: 1 },
          uSize: { value: size },
          uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
          uColor: { value: new THREE.Color(color) },
          uOpacity: { value: opacity },
          uAtlas: { value: texture },
          uGlyphCount: { value: glyphCount },
          uAttraction: { value: 0 },
        },
      });
    } else if (mode === "heart") {
      this._progress = 1; // 1 = idle at target, 0 = just started a transition
      this._currentPositions = new Float32Array(count * 3);
      this._elapsed = 0;

      this.geometry.setAttribute(
        "aStart",
        new THREE.BufferAttribute(initial.slice(), 3),
      );
      this.geometry.setAttribute(
        "aTarget",
        new THREE.BufferAttribute(initial.slice(), 3),
      );
      this.geometry.setAttribute(
        "aControl",
        new THREE.BufferAttribute(initial.slice(), 3),
      );
      this.geometry.setAttribute(
        "aDelay",
        new THREE.BufferAttribute(new Float32Array(count), 1),
      );
      // Per-particle sprite size/tint — see createHeartTargets() in
      // heart/HeartFormation.js. aPhase decorrelates the per-particle
      // bob in heartParticleVertexShader so the swarm doesn't bob as one
      // rigid block.
      this.geometry.setAttribute(
        "aSize",
        new THREE.BufferAttribute(new Float32Array(count), 1),
      );
      this.geometry.setAttribute(
        "aColor",
        new THREE.BufferAttribute(new Float32Array(count * 3), 3),
      );
      this.geometry.setAttribute(
        "aPhase",
        new THREE.BufferAttribute(new Float32Array(count), 1),
      );
      this.geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(initial, 3),
      );

      this.material = new THREE.ShaderMaterial({
        vertexShader: heartParticleVertexShader,
        fragmentShader: heartParticleFragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uProgress: { value: 1 },
          uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
          uOpacity: { value: opacity },
          uTexture: { value: texture },
          uTime: { value: 0 },
          uUseTextureColor: { value: useTextureColor ? 1 : 0 },
          uBreatheAmp: { value: breatheAmp },
          uBreatheSpeed: { value: breatheSpeed },
          uBobAmp: { value: bobAmp },
          uBobSpeed: { value: bobSpeed },
        },
      });
    } else {
      this._progress = 1; // 1 = idle at target, 0 = just started a transition
      this._currentPositions = new Float32Array(count * 3); // scratch buffer, reused on every morph start to avoid per-call allocation churn

      this.geometry.setAttribute(
        "aStart",
        new THREE.BufferAttribute(initial.slice(), 3),
      );
      this.geometry.setAttribute(
        "aTarget",
        new THREE.BufferAttribute(initial.slice(), 3),
      );
      // Quadratic Bezier control point — see particleVertexShader. Left
      // equal to aStart/aTarget (both still all-zero here) until the
      // first reset()/morphTo() call fills in real data.
      this.geometry.setAttribute(
        "aControl",
        new THREE.BufferAttribute(initial.slice(), 3),
      );
      // Per-particle stagger — see particleVertexShader. All-zero by
      // default (every morphTo() call re-zeroes it unless it explicitly
      // passes `delays`), so ordinary morphs are unaffected.
      this.geometry.setAttribute(
        "aDelay",
        new THREE.BufferAttribute(new Float32Array(count), 1),
      );
      // Required by THREE for frustum culling / bounding sphere math even
      // though the shader reads aStart/aTarget instead of `position`.
      this.geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(initial, 3),
      );

      this.material = new THREE.ShaderMaterial({
        vertexShader: particleVertexShader,
        fragmentShader: particleFragmentShader,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uProgress: { value: 1 },
          uSize: { value: size },
          uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
          uColor: { value: new THREE.Color(color) },
          uOpacity: { value: opacity },
          uCoreFraction: { value: coreFraction },
        },
      });
    }

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
  }

  // fall mode only — one-time fill of the per-particle static data the
  // rain shader reads every frame. Arrays are plain JS arrays/typed
  // arrays of length `count`, one entry per particle. `phase` is each
  // particle's own offset (0..fallRange) INSIDE the shader's mod() —
  // that's what keeps every particle wrapping within the same shared
  // [topEdge - fallRange, topEdge] band forever (a phase offset, not a
  // shifted band), so the population never drifts as a block over time.
  initFallData({ x, phase, z, fallSpeed, spawnDelay, rotation, type, brightness, sizeMult }) {
    const aStart = this.geometry.attributes.aStart.array;
    const aTarget = this.geometry.attributes.aTarget.array;
    const aVary = this.geometry.attributes.aVary.array;

    for (let i = 0; i < this.count; i++) {
      aStart[i * 3] = x[i];
      aStart[i * 3 + 1] = phase[i];
      aStart[i * 3 + 2] = z[i];

      aTarget[i * 3] = fallSpeed[i];
      aTarget[i * 3 + 1] = spawnDelay[i];
      aTarget[i * 3 + 2] = rotation[i];

      aVary[i * 3] = type[i];
      aVary[i * 3 + 1] = brightness[i];
      aVary[i * 3 + 2] = sizeMult[i];
    }

    this.geometry.attributes.aStart.needsUpdate = true;
    this.geometry.attributes.aTarget.needsUpdate = true;
    this.geometry.attributes.aVary.needsUpdate = true;
  }

  // heart mode only — one-time fill of the per-particle sprite size/tint/
  // bob-phase (see createHeartTargets() in heart/HeartFormation.js).
  // aStart/aTarget/aControl/aDelay (the actual positions) go through the
  // normal reset()/morphTo() calls instead, same as morph mode.
  initHeartVaryings({ size, color, phase }) {
    const aSize = this.geometry.attributes.aSize.array;
    const aColor = this.geometry.attributes.aColor.array;
    const aPhase = this.geometry.attributes.aPhase.array;

    for (let i = 0; i < this.count; i++) {
      aSize[i] = size[i];
      aColor[i * 3] = color[i * 3];
      aColor[i * 3 + 1] = color[i * 3 + 1];
      aColor[i * 3 + 2] = color[i * 3 + 2];
      aPhase[i] = phase[i];
    }

    this.geometry.attributes.aSize.needsUpdate = true;
    this.geometry.attributes.aColor.needsUpdate = true;
    this.geometry.attributes.aPhase.needsUpdate = true;
  }

  // fall mode only — dials the fall speed up/down without touching any
  // per-particle attribute (a single uniform), e.g. to ease off slightly
  // while the "3" is forming/dissolving.
  setSpeedMult(mult) {
    this.material.uniforms.uSpeedMult.value = mult;
  }

  setSize(size) {
    this.material.uniforms.uSize.value = size;
  }

  setOpacity(opacity) {
    this.material.uniforms.uOpacity.value = opacity;
  }

  setColor(color) {
    this.material.uniforms.uColor.value.set(color);
  }

  // Snapshot of where particles currently are (quadratic Bezier of
  // aStart/aControl/aTarget at the current progress, per-particle
  // re-timed by aDelay exactly like particleVertexShader does — see
  // there for why; degenerates to a plain aStart/aTarget mix whenever
  // aControl is the two's midpoint and aDelay is 0, which is every morph
  // that doesn't ask for a curved/staggered path), computed on demand —
  // not maintained per frame.
  getCurrentPositions() {
    const start = this.geometry.attributes.aStart.array;
    const control = this.geometry.attributes.aControl.array;
    const target = this.geometry.attributes.aTarget.array;
    const delay = this.geometry.attributes.aDelay.array;
    const progress = easeInOutCubic(this._progress);

    for (let p = 0; p < this.count; p++) {
      let local = (progress - delay[p]) / Math.max(1 - delay[p], 0.0001);
      local = Math.min(1, Math.max(0, local));
      local = local * local * (3 - 2 * local);

      const u = 1 - local;
      const uu = u * u;
      const ut2 = 2 * u * local;
      const tt = local * local;

      for (let k = 0; k < 3; k++) {
        const i = p * 3 + k;
        this._currentPositions[i] =
          uu * start[i] + ut2 * control[i] + tt * target[i];
      }
    }

    return this._currentPositions;
  }

  // Begins a smooth transition of every particle toward `positions`
  // (a flat Float32Array/number[] of length count * 3). Freezes the
  // current interpolated position as the new start, so calling this
  // mid-transition redirects smoothly instead of snapping.
  //
  // `controlPositions`, if given (same shape as `positions`), bows each
  // particle's path away from the straight line between its start and
  // target — a cinematic swept/curved motion instead of a flat morph.
  // Omitted (the default), each particle's control point is just the
  // start/target midpoint, which makes the Bezier collapse to the same
  // straight-line motion this method always had.
  //
  // `delays`, if given (a Float32Array/number[] of length count, each in
  // 0..1), makes particles depart at staggered moments instead of in
  // lockstep — see aDelay in particleVertexShader. Omitted (the
  // default), aDelay is reset to all-zero, so a transition that doesn't
  // ask for stagger is never affected by a previous one that did.
  morphTo(
    positions,
    { duration = this.duration, controlPositions = null, delays = null } = {},
  ) {
    const current = this.getCurrentPositions();

    const startAttr = this.geometry.attributes.aStart;
    const controlAttr = this.geometry.attributes.aControl;
    const targetAttr = this.geometry.attributes.aTarget;
    const delayAttr = this.geometry.attributes.aDelay;

    startAttr.array.set(current);
    targetAttr.array.set(positions);

    if (controlPositions) {
      controlAttr.array.set(controlPositions);
    } else {
      for (let i = 0; i < controlAttr.array.length; i++) {
        controlAttr.array[i] = (current[i] + positions[i]) / 2;
      }
    }

    if (delays) {
      delayAttr.array.set(delays);
    } else {
      delayAttr.array.fill(0);
    }

    startAttr.needsUpdate = true;
    controlAttr.needsUpdate = true;
    targetAttr.needsUpdate = true;
    delayAttr.needsUpdate = true;

    this._progress = 0;
    this._activeDuration = duration;
    this.material.uniforms.uProgress.value = 0;
  }

  // Scatters particles outward from their current positions to random
  // points within `radius` of `center` — the generic dissolve/scatter
  // capability. Callers decide when/why to invoke it.
  scatter({ radius = 6, center = [0, 0, 0], duration = this.duration } = {}) {
    const targets = new Float32Array(this.count * 3);

    for (let i = 0; i < this.count; i++) {
      const dir = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
      ).normalize();
      const dist = Math.random() * radius;

      targets[i * 3] = center[0] + dir.x * dist;
      targets[i * 3 + 1] = center[1] + dir.y * dist;
      targets[i * 3 + 2] = center[2] + dir.z * dist;
    }

    this.morphTo(targets, { duration });
  }

  // Instantly snaps every particle to `positions` with no interpolation
  // — for (re)initializing the engine without animating.
  reset(positions) {
    const startAttr = this.geometry.attributes.aStart;
    const controlAttr = this.geometry.attributes.aControl;
    const targetAttr = this.geometry.attributes.aTarget;
    const delayAttr = this.geometry.attributes.aDelay;

    startAttr.array.set(positions);
    controlAttr.array.set(positions);
    targetAttr.array.set(positions);
    delayAttr.array.fill(0);

    startAttr.needsUpdate = true;
    controlAttr.needsUpdate = true;
    targetAttr.needsUpdate = true;
    delayAttr.needsUpdate = true;

    this._progress = 1;
    this.material.uniforms.uProgress.value = 1;
  }

  update(delta) {
    if (this.mode === "fall") {
      this._elapsed += delta;
      this.material.uniforms.uTime.value = this._elapsed;

      if (this.attractionMax > 0) {
        const t = Math.min(
          1,
          Math.max(0, (this._elapsed - this.attractionRampDelay) / this.attractionRampDuration),
        );
        const eased = t * t * (3 - 2 * t); // smoothstep
        this.material.uniforms.uAttraction.value = eased * this.attractionMax;
      }
      return;
    }

    // heart mode's breathe/bob (heartParticleVertexShader) are driven by
    // uTime continuously, independent of uProgress — kept running here
    // even once a morph has finished (the `return` below) so the
    // settled heart keeps breathing forever, not just mid-transition.
    if (this.mode === "heart") {
      this._elapsed += delta;
      this.material.uniforms.uTime.value = this._elapsed;
    }

    if (this._progress >= 1) return;

    // Clamped so one abnormally slow frame (a GC pause, a synchronous
    // main-thread block elsewhere — e.g. GlyphSampler's canvas rasterize)
    // can't skip most/all of a multi-second transition in a single tick.
    // Time.js's delta is otherwise unclamped; a longer, farther-
    // travelling morph (like the countdown's cinematic entrance) makes
    // that single-tick jump far more visible than the short morphs this
    // engine originally only had to survive. Harmless in the normal
    // case: 1/30s is well above a real ~16ms frame.
    const clampedDelta = Math.min(delta, 1 / 30);

    this._progress = Math.min(
      1,
      this._progress + clampedDelta / (this._activeDuration || this.duration),
    );

    this.material.uniforms.uProgress.value = easeInOutCubic(this._progress);
  }

  destroy() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
