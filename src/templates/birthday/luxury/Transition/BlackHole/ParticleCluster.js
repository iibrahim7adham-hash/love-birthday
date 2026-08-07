import gsap from "gsap";
import * as THREE from "three";

import { DISK_OUTER_RADIUS } from "./Constants";
import { flowField } from "./Utils";

// ===========================
// Shared particle shader (points only — no textures, no meshes)
// ===========================

const VERTEX_SHADER = `
  attribute float size;
  attribute float alpha;

  uniform float uOpacity;
  uniform float uTime;
  uniform float uJitterAmount;
  uniform float uPointScale;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = color;

    vec3 jitter = vec3(
      sin(uTime * 1.3 + position.x * 4.0),
      sin(uTime * 1.7 + position.y * 4.0),
      sin(uTime * 1.1 + position.z * 4.0)
    ) * uJitterAmount;

    vec3 jittered = position + jitter;

    vec4 mvPosition = modelViewMatrix * vec4(jittered, 1.0);

    float dist = max(-mvPosition.z, 2.0);

    float depthFade = smoothstep(20.0, 6.0, dist);

    vAlpha = alpha * uOpacity * mix(0.5, 1.0, depthFade);

    // gl_PointSize is specified in actual device pixels, bypassing the
    // normal projection-matrix scaling every other object goes through
    // — left alone, particles would render at a fixed pixel size
    // regardless of screen density or the camera's current fov, making
    // them look disproportionately bigger/smaller across devices even
    // when everything else in frame is correctly scaled. uPointScale
    // (set from BlackHole.update(), see ResponsiveScene.getPointScale())
    // folds in both device pixel ratio and how the current responsive
    // fov compares to the baseline it was designed at, so a particle
    // reads as the same relative size on every screen.
    gl_PointSize = clamp(size * (18.0 / dist) * uPointScale, 1.0, 16.0 * uPointScale);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv);

    if (d > 0.5) discard;

    float edge = smoothstep(0.5, 0.05, d);

    gl_FragColor = vec4(vColor, vAlpha * edge);
  }
`;

// ===========================
// The particle pool: one continuous cast of particles that scatters,
// orbits, spirals into the black hole, and is later re-morphed into the
// heart and then the text. Never destroyed and recreated — always the
// same pool, which is what makes the journey feel connected.
// ===========================

export default class ParticleCluster {
  constructor(count) {
    this.count = count;

    this.velocities = new Float32Array(count * 3);
    this.targets = new Float32Array(count * 3);
    this.baseAlpha = new Float32Array(count);

    this.attract = 0;
    this.flow = 0;

    this.spin = 0;
    this.shrink = 1;
    this.chaos = 0;

    this.settled = false;
    this.staggered = false;

    // Per-particle "personality" — assigned once and kept for the whole
    // journey, so the same particle that lagged behind in the ring is the
    // same one that overshoots gently while forming the heart. This is
    // what breaks the synchronized, mechanical look: every particle is
    // technically running the same rules, but each responds to them
    // differently.
    this.shrinkPower = new Float32Array(count);
    this.driftAmount = new Float32Array(count);
    this.springStiffness = new Float32Array(count);
    this.springDampingRatio = new Float32Array(count);
    this.flowMultiplier = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      this.shrinkPower[i] = THREE.MathUtils.randFloat(0.55, 1.9);
      this.driftAmount[i] = Math.pow(Math.random(), 2.2) * 1.5;
      this.springStiffness[i] = THREE.MathUtils.randFloat(0.7, 2.1);
      this.springDampingRatio[i] = THREE.MathUtils.randFloat(0.4, 1.3);
      this.flowMultiplier[i] = THREE.MathUtils.randFloat(0.5, 1.9);
    }

    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(count * 3), 3),
    );

    geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(new Float32Array(count * 3), 3),
    );

    geometry.setAttribute(
      "size",
      new THREE.BufferAttribute(new Float32Array(count), 1),
    );

    geometry.setAttribute(
      "alpha",
      new THREE.BufferAttribute(new Float32Array(count), 1),
    );

    this.geometry = geometry;

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: {
        uOpacity: { value: 0 },
        uTime: { value: 0 },
        uJitterAmount: { value: 0.015 },
        uPointScale: { value: 1 },
      },
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geometry, this.material);
  }

  // A uniform-random ring reads as a diffuse cloud — a galaxy reads as
  // designed because it has structure. Particles are grouped into a few
  // wide, organically-blurred spiral arms (radius-dependent twist, plus
  // real spread so it never looks like thin rigid lines) instead of an
  // even scatter around the circle.
  initOrbit(innerR, outerR, heightSpread, arms = 3) {
    this.orbitAngle = new Float32Array(this.count);
    this.orbitRadiusBase = new Float32Array(this.count);
    this.orbitHeightBase = new Float32Array(this.count);
    this.orbitSpeedVar = new Float32Array(this.count);

    for (let i = 0; i < this.count; i++) {
      const radius = THREE.MathUtils.randFloat(innerR, outerR);
      const radiusFrac = (radius - innerR) / (outerR - innerR);

      const armOffset = ((i % arms) / arms) * Math.PI * 2;
      const spiralTwist = arms > 1 ? radiusFrac * Math.PI * 1.4 : 0;
      const spread = THREE.MathUtils.randFloatSpread(arms > 1 ? 1.8 : 0.6);

      this.orbitAngle[i] = armOffset + spiralTwist + spread;
      this.orbitRadiusBase[i] = radius;
      this.orbitHeightBase[i] = THREE.MathUtils.randFloatSpread(heightSpread);
      this.orbitSpeedVar[i] = THREE.MathUtils.randFloat(0.5, 1.75);
    }
  }

  // Unlike initOrbit (which, with a single arm, clusters every particle
  // within one narrow wedge — great for a spiral gathering in, wrong for
  // a burst), every particle here gets a fully independent random angle
  // across the whole circle — this is what makes a burst read as
  // erupting in every direction at once instead of a wedge sweeping
  // around into a ring over time.
  //
  // `densityBias` (>1) skews the radius sample toward innerR — e.g. 2.2
  // means most particles land close to the inner edge and progressively
  // fewer as radius grows, which is what makes an accretion disk denser
  // near the core and gradually thinner toward the edge, as one
  // continuous gradient rather than a handful of per-layer density
  // values. Height is derived from that SAME per-particle radius (not a
  // flat spread), so the disk is naturally thin near the core and
  // gently flares outward — again continuous, not banded.
  initOrbitBurst(innerR, outerR, heightSpread, densityBias = 1) {
    this.orbitAngle = new Float32Array(this.count);
    this.orbitRadiusBase = new Float32Array(this.count);
    this.orbitHeightBase = new Float32Array(this.count);
    this.orbitSpeedVar = new Float32Array(this.count);

    for (let i = 0; i < this.count; i++) {
      this.orbitAngle[i] = Math.random() * Math.PI * 2;

      const u = Math.random();

      const radiusFrac =
        0.55 * Math.pow(u, densityBias) + 0.45 * Math.pow(u, 0.55);
      const radius = innerR + (outerR - innerR) * radiusFrac;

      this.orbitRadiusBase[i] = radius;
      const thickness = THREE.MathUtils.lerp(0.05, 0.45, radiusFrac);

      this.orbitHeightBase[i] = THREE.MathUtils.randFloatSpread(thickness);

      // A narrow per-particle variance — the visible "inner orbits
      // faster" effect should come from stepOrbit()'s radius-based
      // physics (see rSpeed), not from particles at the same radius
      // scattering wildly in speed relative to each other.
      this.orbitSpeedVar[i] = THREE.MathUtils.randFloat(0.8, 1.35);
    }
  }

  // Reads each particle's CURRENT position and derives orbital state from
  // it directly — used when handing particles back to stepOrbit() after
  // they've been doing something else (e.g. sitting as the heart), so the
  // return to orbiting starts exactly where they already are instead of
  // snapping to a fresh random ring.
  initOrbitFromCurrentPositions(heightScale = 1) {
    const pos = this.geometry.attributes.position;

    this.orbitAngle = new Float32Array(this.count);
    this.orbitRadiusBase = new Float32Array(this.count);
    this.orbitHeightBase = new Float32Array(this.count);
    this.orbitSpeedVar = new Float32Array(this.count);

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;

      const x = pos.array[i3];
      const y = pos.array[i3 + 1];
      const z = pos.array[i3 + 2];

      const radius = Math.max(Math.sqrt(x * x + z * z), 0.05);

      this.orbitAngle[i] = Math.atan2(z, x);
      this.orbitRadiusBase[i] = radius;
      this.orbitHeightBase[i] = y * heightScale;
      this.orbitSpeedVar[i] = THREE.MathUtils.randFloat(0.5, 1.75);
    }
  }

  // Cylindrical motion: `shrink` is the one global signal (>1 = scattered
  // wide, 1 = full ring, ~0 = collapsed), but every particle answers to it
  // through its own exponent (`shrinkPower`) — the same instant in the
  // story reads as "already gathered in" for one particle and "still
  // trailing wide" for another, without any of them being on a separate
  // timeline. Angular speed for the *visual* radius is unclamped (so
  // particles truly vanish at the center), but the speed *calculation*
  // uses a floor so it accelerates dramatically without ever strobing
  // into incoherence. A per-particle drift weight lets a minority of
  // particles visibly wander off the clean orbital arc. `chaos` adds
  // turbulence that only appears once the collapse is well underway.
  stepOrbit(delta, t) {
    const pos = this.geometry.attributes.position;

    for (let i = 0; i < this.count; i++) {
      const localShrink = Math.pow(
        Math.max(this.shrink, 0.0001),
        this.shrinkPower[i],
      );

      const rVisual = Math.max(this.orbitRadiusBase[i] * localShrink, 0.01);
      const rSpeed = Math.max(this.orbitRadiusBase[i] * localShrink, 0.7);

      const angularVel = (this.spin * this.orbitSpeedVar[i]) / rSpeed;

      this.orbitAngle[i] += angularVel * delta;

      const wobble =
        this.chaos > 0
          ? Math.sin(this.orbitAngle[i] * 2.0 + t * 2.5) * this.chaos * 0.12
          : 0;

      let px = Math.cos(this.orbitAngle[i]) * rVisual;
      let py = this.orbitHeightBase[i] * localShrink + wobble;
      let pz = Math.sin(this.orbitAngle[i]) * rVisual;

      const drift = this.driftAmount[i];
      const radiusFrac = this.orbitRadiusBase[i] / DISK_OUTER_RADIUS;

      if (drift > 0.02) {
        const f = flowField(
          px * 0.35,
          py * 0.35 + i * 0.00005,
          pz * 0.35,
          t * 0.4,
        );

        const driftStrength = drift * (0.08 + radiusFrac * 0.18);

        px += f.x * driftStrength;
        py += f.y * driftStrength * 0.08;
        pz += f.z * driftStrength;
      }

      const i3 = i * 3;

      pos.array[i3] = px;
      pos.array[i3 + 1] = py;
      pos.array[i3 + 2] = pz;
    }

    pos.needsUpdate = true;
  }

  resetPositionsToOrigin(jitter) {
    const pos = this.geometry.attributes.position;

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;

      pos.array[i3] = THREE.MathUtils.randFloatSpread(jitter);
      pos.array[i3 + 1] = THREE.MathUtils.randFloatSpread(jitter);
      pos.array[i3 + 2] = THREE.MathUtils.randFloatSpread(jitter);

      this.velocities[i3] = 0;
      this.velocities[i3 + 1] = 0;
      this.velocities[i3 + 2] = 0;
    }

    pos.needsUpdate = true;

    this.settled = false;
  }

  // Assign per-particle color/size/alpha without touching targets — used
  // once up front for the orbit phase, which never calls morphTo.
  setStyle(styleFn) {
    const colors = this.geometry.attributes.color;
    const sizes = this.geometry.attributes.size;
    const alphas = this.geometry.attributes.alpha;

    for (let i = 0; i < this.count; i++) {
      const style = styleFn(i);

      colors.array[i * 3] = style.color.r;
      colors.array[i * 3 + 1] = style.color.g;
      colors.array[i * 3 + 2] = style.color.b;

      sizes.array[i] = style.size;

      this.baseAlpha[i] = style.alpha;
      alphas.array[i] = style.alpha;
    }

    colors.needsUpdate = true;
    sizes.needsUpdate = true;
    alphas.needsUpdate = true;
  }

  // Reassign where every particle is headed, and what it looks like once
  // it gets there. This is the reusable hook: call it again later with a
  // different targetFn to reshape the same particles into something new.
  morphTo(targetFn, styleFn) {
    const colors = this.geometry.attributes.color;
    const sizes = this.geometry.attributes.size;
    const alphas = this.geometry.attributes.alpha;

    for (let i = 0; i < this.count; i++) {
      const target = targetFn(i);

      this.targets[i * 3] = target.x;
      this.targets[i * 3 + 1] = target.y;
      this.targets[i * 3 + 2] = target.z;

      const style = styleFn(i, target);

      colors.array[i * 3] = style.color.r;
      colors.array[i * 3 + 1] = style.color.g;
      colors.array[i * 3 + 2] = style.color.b;

      sizes.array[i] = style.size;

      this.baseAlpha[i] = style.alpha;
      alphas.array[i] = style.alpha;
    }

    colors.needsUpdate = true;
    sizes.needsUpdate = true;
    alphas.needsUpdate = true;

    this.settled = false;
  }

  // Gives every particle a random head-start delay before it begins
  // reacting to attraction — so a morph reads as particles individually
  // "waking up and setting off" rather than the whole cloud moving in
  // lockstep. Purely additive: flow keeps drifting them even before
  // their delay elapses.
  setStagger(maxDelay) {
    if (!this.arriveDelay) this.arriveDelay = new Float32Array(this.count);

    for (let i = 0; i < this.count; i++) {
      this.arriveDelay[i] = Math.random() * maxDelay;
    }

    this.staggered = true;
    this.formStartTime = null;
  }

  // Unlike setStagger's pure randomness, this delays each particle by how
  // far its *target* sits from a seed point — so the shape visibly grows
  // outward from that point instead of converging from everywhere at
  // once. Must be called after morphTo() (needs this.targets populated).
  setGrowthStagger(seedX, seedY, seedZ, maxDelay) {
    if (!this.arriveDelay) this.arriveDelay = new Float32Array(this.count);

    const dists = new Float32Array(this.count);
    let maxDist = 0;

    for (let i = 0; i < this.count; i++) {
      const dx = this.targets[i * 3] - seedX;
      const dy = this.targets[i * 3 + 1] - seedY;
      const dz = this.targets[i * 3 + 2] - seedZ;

      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);

      dists[i] = d;
      if (d > maxDist) maxDist = d;
    }

    for (let i = 0; i < this.count; i++) {
      const frac = maxDist > 0 ? dists[i] / maxDist : 0;

      this.arriveDelay[i] = frac * maxDelay + Math.random() * maxDelay * 0.15;
    }

    this.staggered = true;
    this.formStartTime = null;
  }

  clearStagger() {
    this.staggered = false;
  }

  step(delta, t) {
    if (this.settled) return;

    if (this.staggered && this.formStartTime === null) {
      this.formStartTime = t;
    }

    const pos = this.geometry.attributes.position;

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;

      let localAttract = this.attract;

      if (this.staggered) {
        const elapsed = t - this.formStartTime;

        if (elapsed < this.arriveDelay[i]) localAttract = 0;
      }

      const fx = pos.array[i3];
      const fy = pos.array[i3 + 1];
      const fz = pos.array[i3 + 2];

      const f = flowField(fx * 0.3, fy * 0.3, fz * 0.3, t);

      const tx = this.targets[i3];
      const ty = this.targets[i3 + 1];
      const tz = this.targets[i3 + 2];
      const dx = tx - fx;
      const dy = ty - fy;
      const dz = tz - fz;

      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq < 0.0008) {
        pos.array[i3] = tx;
        pos.array[i3 + 1] = ty;
        pos.array[i3 + 2] = tz;

        this.velocities[i3] = 0;
        this.velocities[i3 + 1] = 0;
        this.velocities[i3 + 2] = 0;

        continue;
      }
      // A real spring-damper per particle, not a scripted "arrive then
      // stop": each particle's own stiffness/damping ratio decides
      // whether it swoops past its target and settles back (underdamped,
      // ratio < 1 — most particles) or glides straight in (ratio >= 1 —
      // a minority). Nothing here is special-cased per particle; the
      // variety is a direct consequence of the physics.
      const attractSmooth = 1.0 - Math.exp(-localAttract * 0.9);
      const stiffness = this.springStiffness[i] * attractSmooth * 1.8;
      const dampCoeff =
        this.springDampingRatio[i] *
        1.45 *
        Math.sqrt(Math.max(stiffness, 0.0001));
      const flowAmt = this.flow * this.flowMultiplier[i];

      this.velocities[i3] +=
        (dx * stiffness - this.velocities[i3] * dampCoeff + f.x * flowAmt) *
        delta;
      this.velocities[i3 + 1] +=
        (dy * stiffness - this.velocities[i3 + 1] * dampCoeff + f.y * flowAmt) *
        delta;
      this.velocities[i3 + 2] +=
        (dz * stiffness - this.velocities[i3 + 2] * dampCoeff + f.z * flowAmt) *
        delta;

      pos.array[i3] = fx + this.velocities[i3] * delta;
      pos.array[i3 + 1] = fy + this.velocities[i3 + 1] * delta;
      pos.array[i3 + 2] = fz + this.velocities[i3 + 2] * delta;
    }

    pos.needsUpdate = true;
  }

  snapToTarget() {
    const pos = this.geometry.attributes.position;

    pos.array.set(this.targets);

    pos.needsUpdate = true;

    this.velocities.fill(0);
    this.settled = true;
    this.staggered = false;
  }

  setTime(t) {
    this.material.uniforms.uTime.value = t;
  }

  setPointScale(value) {
    this.material.uniforms.uPointScale.value = value;
  }

  fadeTo(value, duration, delay = 0) {
    gsap.to(this.material.uniforms.uOpacity, {
      value,
      duration,
      delay,
      ease: "sine.inOut",
    });
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
