import gsap from "gsap";
import { createNoise4D } from "simplex-noise";
import * as THREE from "three";

import { memoryPhotos } from "../content/memories";

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
    // (set from BlackHole.update(), see computePointScale()) folds in
    // both device pixel ratio and how the current responsive fov
    // compares to the baseline it was designed at, so a particle reads
    // as the same relative size on every screen.
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

// Real simplex noise (via `simplex-noise`) instead of the hand-rolled
// sine-product field this used to be — no periodic/grid-aligned artifacts,
// genuinely organic drift. Each axis samples the same 4D field at a large
// fixed offset so the three components stay decorrelated (one field,
// three independent-looking readings) without needing three separate
// noise instances. This is a noise-as-velocity field, not full
// mathematical curl (which needs ~4x the noise samples per particle) —
// a deliberate quality/performance trade-off for particle counts in the
// tens of thousands on mobile.
const noise4D = createNoise4D();

function flowField(x, y, z, t) {
  const s = 0.5;
  const tt = t * 0.3;

  return {
    x: noise4D(x * s, y * s, z * s, tt),
    y: noise4D(x * s + 37.2, y * s - 18.9, z * s, tt),
    z: noise4D(x * s, y * s + 91.7, z * s - 52.4, tt),
  };
}

// The classic heart parametric curve, traced once into a polygon and used
// for point-in-polygon rejection sampling — gives the actual recognizable
// heart silhouette (proper twin lobes, sharp bottom point) instead of the
// rounder algebraic curve, while still keeping uniform density (true 2D
// rejection, not radial scaling, so no streaks).
const HEART_POLY = (() => {
  const poly = [];
  const segments = 120;

  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;

    const hx = Math.pow(Math.sin(t), 3);
    const hy =
      (13 * Math.cos(t) -
        5 * Math.cos(2 * t) -
        2 * Math.cos(3 * t) -
        Math.cos(4 * t)) /
      16;

    poly.push({ x: hx, y: hy });
  }

  return poly;
})();

function isInsideHeart(x, y) {
  let inside = false;

  for (let i = 0, j = HEART_POLY.length - 1; i < HEART_POLY.length; j = i++) {
    const xi = HEART_POLY[i].x;
    const yi = HEART_POLY[i].y;
    const xj = HEART_POLY[j].x;
    const yj = HEART_POLY[j].y;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

function sampleHeartXY() {
  let x = 0;
  let y = 0;
  let attempts = 0;

  do {
    x = THREE.MathUtils.randFloat(-1.05, 1.05);
    y = THREE.MathUtils.randFloat(-1.1, 0.9);
    attempts++;
  } while (!isInsideHeart(x, y) && attempts < 50);

  return { x, y };
}

// Renders text to a hidden canvas once, and reads back which pixels are
// "ink" — used only to compute particle target positions. The canvas is
// never applied as a texture to anything that gets rendered.
function sampleTextPositions(text, count, worldWidth) {
  const width = 900;
  const height = 220;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 120px 'Segoe UI', Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, width / 2, height / 2);

  const data = ctx.getImageData(0, 0, width, height).data;

  const candidates = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      if (data[idx] > 128) {
        candidates.push({ x, y });
      }
    }
  }

  const worldHeight = (worldWidth * height) / width;

  const points = [];

  for (let i = 0; i < count; i++) {
    const c = candidates[Math.floor(Math.random() * candidates.length)];

    points.push({
      x: (c.x / width - 0.5) * worldWidth,
      y: -(c.y / height - 0.5) * worldHeight,
      z: THREE.MathUtils.randFloatSpread(0.06),
    });
  }

  return points;
}

// Placeholder "photo" card for memories that don't have a real image yet —
// a soft gradient with a thin frame, generated once per photo. Swapping to
// a real customer photo later only means loading `entry.src` through
// THREE.TextureLoader instead of this function; nothing else changes.
function createPlaceholderTexture(colorA, colorB) {
  const size = 256;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, colorA);
  gradient.addColorStop(1, colorB);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, size - 8, size - 8);

  return new THREE.CanvasTexture(canvas);
}

function loadPhotoTexture(entry) {
  if (entry.src) {
    return new THREE.TextureLoader().load(entry.src);
  }

  return createPlaceholderTexture(entry.colors[0], entry.colors[1]);
}

// A soft round glow, cached per color — sat behind every memory sprite
// so a photo/sticker reads as embedded, glowing light within the
// particle field rather than a flat opaque card floating on top of it.
const glowTextureCache = new Map();

function createGlowTexture(color) {
  if (glowTextureCache.has(color)) return glowTextureCache.get(color);

  const size = 128;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");

  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );

  gradient.addColorStop(0, color);
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  glowTextureCache.set(color, texture);

  return texture;
}

// A speckled, semi-transparent grain — the whole reason the Saturn-style
// ring can visibly spin at all. A flat solid color is rotationally
// symmetric (spinning it around its own axis produces zero visible
// change); this texture varies in every direction and repeats several
// times around the ring, so individual specks visibly sweep past as it
// rotates, the same way real ring particles or Saturn's own banding
// would.
function createRingSparkleTexture() {
  const size = 256;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");

  for (let i = 0; i < 2200; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = Math.random() * 1.6 + 0.3;
    const alpha = Math.random() * 0.55 + 0.2;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 205, 222, ${alpha})`;
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 2);

  return texture;
}

// ===========================
// Colors — one red family throughout, so it always reads as "the same
// particles" evolving, never a different system taking over.
// ===========================

const RED_DEEP = new THREE.Color("#6b0f2a");
const RED_CRIMSON = new THREE.Color("#c8203f");
const RED_ROSE = new THREE.Color("#ff4d6d");
const RED_BRIGHT = new THREE.Color("#ff8fa8");
const SPARK_WHITE = new THREE.Color("#fff0f2");

function randomRed() {
  const r = Math.random();

  if (r < 0.05) return SPARK_WHITE;
  if (r < 0.32) return RED_DEEP;
  if (r < 0.62) return RED_CRIMSON;
  if (r < 0.86) return RED_ROSE;

  return RED_BRIGHT;
}

// ===========================
// The particle pool: one continuous cast of particles that scatters,
// orbits, spirals into the black hole, and is later re-morphed into the
// heart and then the text. Never destroyed and recreated — always the
// same pool, which is what makes the journey feel connected.
// ===========================

class ParticleCluster {
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
      const radiusFrac = this.orbitRadiusBase[i] / BlackHole.DISK_OUTER_RADIUS;

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

export default class BlackHole {
  // Overall band the accretion disk occupies. The black hole's core
  // settles to well under 1 unit of radius (see stabilizeAfterAbsorption)
  // — this band is still several times that, so the disk dwarfs the
  // core, but kept compact so the camera can sit close and let the
  // whole system dominate the frame instead of shrinking the core to a
  // speck to fit a sprawling disk in.
  static DISK_INNER_RADIUS = 1.5;
  static DISK_OUTER_RADIUS = 6.8;

  // Must match Config.camera.fov in src/engine/core/Config.js — that's
  // the vertical fov engine/camera/Camera.js's responsive system treats
  // as the baseline for a widescreen shot, and computePointScale() below
  // needs the same reference point to know how far the CURRENT fov has
  // been pushed from it. Not imported directly to keep this template
  // self-contained from the engine layer (the same reason no other
  // template file imports from engine/); if the engine's baseline fov
  // ever changes, update this constant to match.
  static BASE_VERTICAL_FOV = 35;

  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    this.isActive = false;

    this.time = 0;

    this.orbitMode = false;
    this.attractionMode = false;

    this.group = new THREE.Group();

    this.scene.add(this.group);

    this.group.position.set(0, 0, -5);

    // The black hole core is the one non-particle element in this scene:
    // it represents an absence of light, not a lit surface, so a flat
    // black sphere reads correctly where a "black" particle cluster would
    // simply vanish against the background.
    const coreGeometry = new THREE.SphereGeometry(1.28, 64, 64);
    const coreMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

    this.core = new THREE.Mesh(coreGeometry, coreMaterial);
    this.core.scale.setScalar(0.001);
    this.group.add(this.core);

    // A thin Saturn-style ring. The FIXED tilt lives on a separate pivot
    // (`ringPivot`) while the ring mesh itself spins continuously around
    // its own local Z (its normal) in update() — keeping those two
    // rotations on different objects is what lets the ring hold a
    // stable, elegant tilt while still visibly spinning, instead of the
    // whole tilted ellipse wobbling/precessing around. A child of
    // `this.core`, so it scales and fades in together with the core's
    // own reveal/settle animation.
    this.ringPivot = new THREE.Object3D();
    this.ringPivot.rotation.x = THREE.MathUtils.degToRad(-70);
    this.core.add(this.ringPivot);

    const ringGeometry = new THREE.RingGeometry(2.0, 2.5, 96);

    const ringMaterial = new THREE.MeshBasicMaterial({
      map: createRingSparkleTexture(),
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.saturnRing = new THREE.Mesh(ringGeometry, ringMaterial);
    this.ringPivot.add(this.saturnRing);

    // one continuous pool of particles for the whole journey
    this.main = new ParticleCluster(50000);
    this.group.add(this.main.points);

    this.group.visible = false;
  }

  play() {
    if (this.isActive) return;

    this.isActive = true;
    this.group.visible = true;

    const cam = this.camera;

    this.cameraBase = cam.position.clone();
    this.lookTarget = this.group.position.clone();

    const camStart = this.cameraBase.clone();
    const totalDist = camStart.distanceTo(this.lookTarget);
    const dir = this.lookTarget.clone().sub(camStart).normalize();

    const waypoint = (frac) =>
      camStart.clone().addScaledVector(dir, totalDist * frac);

    const up = new THREE.Vector3(0, 1, 0);
    const perp = new THREE.Vector3().crossVectors(dir, up).normalize();

    // `arc` bows the path sideways off the straight dolly line — a real
    // curve through space instead of a locked track, so the camera reads
    // as looking around the scene rather than sliding on a rail.
    const dolly = (frac, duration, delay, arc = 0) => {
      const p = waypoint(frac).addScaledVector(perp, arc);

      gsap.to(this.cameraBase, {
        x: p.x,
        y: p.y,
        z: p.z,
        duration,
        delay,
        ease: "sine.inOut",
      });
    };

    // ===========================
    // Stillness, then gravity awakens and gathers into a spiral ring.
    // The opening holds almost no motion at all — the ramp only truly
    // begins after a real pause, so there is something to contrast
    // against. (roughly 0.4s -> 3.2s)
    // ===========================

    this.main.setStyle(() => ({
      color: randomRed(),
      size: THREE.MathUtils.randFloat(2.4, 4.8),
      alpha: THREE.MathUtils.randFloat(0.8, 1),
    }));

    this.main.initOrbit(2.8, 11.5, 0.9);
    this.main.spin = 0.05;
    this.main.shrink = 2.6;
    this.main.chaos = 0;
    this.orbitMode = true;

    this.main.fadeTo(0.85, 2.6, 0.4);

    gsap.to(this.main, {
      shrink: 1,
      duration: 2.4,
      delay: 0.8,
      ease: "sine.inOut",
    });

    gsap.to(this.main, {
      spin: 2.3,
      duration: 2.4,
      delay: 0.8,
      ease: "sine.inOut",
    });

    gsap.to(this.core.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 2.1,
      delay: 1.1,
      ease: "back.out(1.15)",
    });

    dolly(0.24, 3.4, 0.4, 0.55);

    // A quick surge toward the black hole right as it fully forms — the
    // reveal beat. Overrides the tail of the gather dolly above.
    dolly(0.34, 0.9, 2.9);

    // A brief hesitation right before the plunge — held breath, not a
    // ramp that never stops.
    gsap.to(this.main, {
      spin: 1.9,
      duration: 0.25,
      delay: 2.95,
      ease: "sine.inOut",
    });

    // ===========================
    // Collapse — the ring spirals in violently, spinning much faster and
    // turning turbulent as it funnels into the core. (roughly 3.2s -> 6.0s)
    // ===========================

    gsap.to(this.main, {
      shrink: 0.016,
      duration: 2.8,
      delay: 3.2,
      ease: "power2.in",
    });

    gsap.to(this.main, {
      spin: 4.6,
      duration: 2.8,
      delay: 3.2,
      ease: "power1.in",
    });

    gsap.to(this.main, {
      chaos: 1,
      duration: 1.4,
      delay: 4.6,
      ease: "power1.in",
    });

    this.main.fadeTo(0.15, 1.6, 4.4);

    dolly(0.44, 2.6, 3.4, -0.35);

    // ===========================
    // Silence — a held breath, not a hard cut. Positions are simply left
    // wherever the collapse brought them (already tight around the
    // center) — nothing is reset or snapped, so the heart formation that
    // follows picks up from exactly where this left off.
    // ===========================

    gsap.delayedCall(6.0, () => {
      this.orbitMode = false;

      this.main.fadeTo(0.1, 0.5);

      gsap.to(this.core.scale, {
        x: 0.001,
        y: 0.001,
        z: 0.001,
        duration: 1.0,
        delay: 0.2,
        ease: "power2.in",
      });
    });

    // ===========================
    // Birth of the heart — slow, organic, staggered emergence, continuing
    // directly from the collapsed position with no reset. (roughly
    // 6.35s -> 9.0s)
    // ===========================

    const heartScale = 2.0;

    gsap.delayedCall(6.35, () => {
      this.attractionMode = true;

      this.main.morphTo(
        () => {
          const { x, y } = sampleHeartXY();

          return {
            x: x * heartScale,
            y: y * heartScale,
            z: THREE.MathUtils.randFloatSpread(0.14),
          };
        },
        () => ({
          color: randomRed(),
          size: THREE.MathUtils.randFloat(1.6, 3.1),
          alpha: THREE.MathUtils.randFloat(0.75, 1),
        }),
      );

      this.heartTargets = this.main.targets.slice();

      // Grows outward from a point low in the heart, rather than every
      // particle converging from wherever it happens to be — this is
      // what makes it read as being *born*, not assembled.
      this.main.setGrowthStagger(0, -1.2, 0, 2.9);

      this.main.attract = 0;
      this.main.flow = 1.2;
      this.main.fadeTo(1, 2.2, 0);

      gsap.to(this.main, {
        attract: 1.15,
        duration: 1.8,
        ease: "sine.out",
      });
      gsap.to(this.main, {
        flow: 0.25,
        duration: 2.0,
        ease: "sine.out",
      });

      gsap.delayedCall(8.2, () => {
        this.heartFormed = true;
      });
    });

    dolly(0.56, 3.4, 6.35);

    // ===========================
    // Heartbeat, then "I LOVE YOU" — some particles leave the heart to
    // spell it out, the rest remain behind as the heart. (~10.0s onward)
    // ===========================

    gsap.delayedCall(11.0, () => {
      gsap.to(this.main.points.scale, {
        x: 1.07,
        y: 1.07,
        z: 1.07,
        duration: 0.35,
        yoyo: true,
        repeat: 1,
        ease: "sine.inOut",
        onComplete: () => gsap.delayedCall(1.0, () => this.formText()),
      });
    });

    dolly(0.63, 2.6, 10.0);
  }

  formText() {
    const textCount = Math.floor(this.main.count * 0.1);
    const textPoints = sampleTextPositions("I LOVE YOU", textCount, 3.2);

    textPoints.forEach((p) => {
      p.y += 1.55;
    });

    const chosen = new Set();

    while (chosen.size < textCount) {
      chosen.add(Math.floor(Math.random() * this.main.count));
    }

    const chosenArr = Array.from(chosen);
    const textFor = new Map();

    chosenArr.forEach((particleIndex, ti) => {
      textFor.set(particleIndex, textPoints[ti]);
    });

    this.main.morphTo(
      (i) => {
        if (textFor.has(i)) return textFor.get(i);

        return {
          x: this.heartTargets[i * 3],
          y: this.heartTargets[i * 3 + 1],
          z: this.heartTargets[i * 3 + 2],
        };
      },
      (i) => {
        if (textFor.has(i)) {
          return {
            color: randomRed(),
            size: THREE.MathUtils.randFloat(2.1, 3.4),
            alpha: THREE.MathUtils.randFloat(0.85, 1),
          };
        }

        return {
          color: randomRed(),
          size: THREE.MathUtils.randFloat(1.4, 2.3),
          alpha: THREE.MathUtils.randFloat(0.4, 0.75),
        };
      },
    );

    this.main.setStagger(1.2);

    this.main.attract = 0;
    this.main.flow = 1.1;

    gsap.to(this.main, { attract: 2.5, duration: 2.6, ease: "power2.out" });
    gsap.to(this.main, { flow: 0.06, duration: 2.6, ease: "power2.out" });

    gsap.delayedCall(1.7, () => {
      this.textFormed = true;

      gsap.delayedCall(2.5, () => this.startMemoryGalaxy());
    });
  }

  // Moves the camera some fraction of the way from wherever it currently
  // is toward the black hole, without needing the original journey's
  // start/direction vectors — a lighter-weight cousin of play()'s dolly,
  // for the calmer moves Scene 3 needs.
  approachTarget(frac, duration, delay = 0) {
    const targetX = THREE.MathUtils.lerp(
      this.cameraBase.x,
      this.lookTarget.x,
      frac,
    );
    const targetY = THREE.MathUtils.lerp(
      this.cameraBase.y,
      this.lookTarget.y,
      frac,
    );
    const targetZ = THREE.MathUtils.lerp(
      this.cameraBase.z,
      this.lookTarget.z,
      frac,
    );

    gsap.to(this.cameraBase, {
      x: targetX,
      y: targetY,
      z: targetZ,
      duration,
      delay,
      ease: "sine.inOut",
    });
  }

  // Hands the camera off from the dolly+sway language of Scenes 1-2 to a
  // continuous slow orbit — derived from wherever the camera already is,
  // so there's no jump. This becomes the resting state for the rest of
  // the experience.
  beginCameraOrbit(speed) {
    const dx = this.camera.position.x - this.lookTarget.x;
    const dz = this.camera.position.z - this.lookTarget.z;

    this.cameraOrbitAngle = Math.atan2(dz, dx);
    this.cameraOrbitRadius = Math.sqrt(dx * dx + dz * dz);
    this.cameraOrbitHeight = this.camera.position.y - this.lookTarget.y;
    this.cameraOrbitSpeed = speed;
    this.cameraOrbitMode = true;
  }

  // ===========================
  // SCENE 3 — The Memory Galaxy. Calmer than Scene 2 on purpose: this is
  // the emotional journey, not the climax. Reuses the same ParticleCluster,
  // shader and orbital mechanics Scene 2 established throughout.
  // ===========================

  startMemoryGalaxy() {
    // ---- Phase 1: The Last Heartbeat — calm, one final slow pulse ----

    gsap.to(this.main.points.scale, {
      x: 1.05,
      y: 1.05,
      z: 1.05,
      duration: 1.0,
      yoyo: true,
      repeat: 1,
      ease: "sine.inOut",
    });

    this.approachTarget(0.12, 3.5, 0.3);

    // ---- Phase 2: Love Returns to the Universe — the heart/text loosen
    // and drift gently apart. They stay fully visible the whole time;
    // nothing fades out and nothing pops. ----

    gsap.delayedCall(2.3, () => {
      this.main.morphTo(
        (i) => {
          const cx = this.main.targets[i * 3];
          const cy = this.main.targets[i * 3 + 1];
          const cz = this.main.targets[i * 3 + 2];

          const dist = Math.sqrt(cx * cx + cy * cy + cz * cz) || 0.01;
          const extra = THREE.MathUtils.randFloat(1.5, 3.5);

          return {
            x: cx + (cx / dist) * extra,
            y: cy + (cy / dist) * extra,
            z: cz + (cz / dist) * extra,
          };
        },
        () => ({
          color: randomRed(),
          size: THREE.MathUtils.randFloat(1.3, 2.4),
          alpha: THREE.MathUtils.randFloat(0.6, 0.95),
        }),
      );

      this.main.setStagger(1.2);

      this.main.attract = 0;
      this.main.flow = 0.4;

      gsap.to(this.main, { attract: 1.1, duration: 2.6, ease: "power2.out" });
      gsap.to(this.main, { flow: 0.15, duration: 2.8, ease: "power2.out" });
    });

    // ---- Phase 3: Return to the Black Hole — elegant, not violent.
    // Picks up orbital motion from wherever Phase 2 left the particles,
    // so there is no snap. ----

    gsap.delayedCall(5.1, () => {
      this.attractionMode = false;

      this.main.initOrbitFromCurrentPositions();
      this.main.spin = 0;
      this.main.shrink = 1;
      this.main.chaos = 0;
      this.orbitMode = true;

      gsap.to(this.core.scale, {
        x: 0.6,
        y: 0.6,
        z: 0.6,
        duration: 2,
        ease: "sine.inOut",
      });

      gsap.to(this.main, { spin: 1.2, duration: 3.2, ease: "sine.inOut" });
      gsap.to(this.main, {
        shrink: 0.02,
        duration: 3.2,
        ease: "sine.inOut",
        onComplete: () => {
          this.orbitMode = false;

          // The last particle has just been absorbed — hand off to the
          // black hole's own scene below.
          this.beginMemoryEmergence();
        },
      });

      this.main.fadeTo(0, 2.4, 1.2);
    });

    this.approachTarget(0.22, 5, 5.1);
  }

  // ===========================
  // From Destruction to Creation — picks up the instant the heart's
  // absorption into the black hole finishes (see the onComplete hook at
  // the end of Phase 3 above) and carries the black hole from "just
  // consumed the heart" into "now generating an orbit of memories":
  // stabilize -> new camera angle -> particles emerge into an irregular
  // ring -> memories emerge one by one and join that ring.
  // ===========================

  // Step 1: a held breath before the black hole visibly reacts to what
  // it just absorbed.
  beginMemoryEmergence() {
    gsap.delayedCall(0.4, () => this.stabilizeAfterAbsorption());
  }

  // Steps 2 & 3: the core settles to ~70-80% of its current size — never
  // vanishing, just stabilizing — while the camera glides to a new,
  // elevated 3/4 angle built for viewing an orbit rather than a single
  // point. Both run in parallel. The burst itself is gated on the CORE
  // finishing its settle (plus a brief 0.2-0.3s beat), not on the camera
  // arriving — the eruption should feel immediate, and the camera is
  // still free to still be gliding into place when it happens, which
  // reads as more alive than everything waiting for a static frame.
  stabilizeAfterAbsorption() {
    const settleScale = this.core.scale.x * THREE.MathUtils.randFloat(0.7, 0.8);

    gsap.to(this.core.scale, {
      x: settleScale,
      y: settleScale,
      z: settleScale,
      duration: 1.8,
      ease: "sine.inOut",
      onComplete: () => {
        gsap.delayedCall(THREE.MathUtils.randFloat(0.2, 0.3), () =>
          this.buildAccretionDisk(),
        );
      },
    });

    this.transitionToMemoryCameraAngle(2.6);
  }

  // A close, dominant establishing shot — the black hole and its disk
  // should fill the frame, not sit small in the middle of empty space.
  // Still a real ELEVATION angle above the disk plane rather than a
  // level one (a disk viewed near edge-on reads as a line, not a disk),
  // but a shallower one than a top-down look — a "beautiful cinematic
  // view", not a map view. Only the horizontal angle is inherited from
  // wherever the camera already is, so the turn still feels continuous
  // rather than a hard cut. Runs independently of the particle burst
  // (see stabilizeAfterAbsorption) rather than gating it — the camera
  // can still be arriving when particles erupt.
  transitionToMemoryCameraAngle(duration) {
    const offset = this.cameraBase.clone().sub(this.lookTarget);
    const currentAngle = Math.atan2(offset.z, offset.x);
    const targetAngle = currentAngle + THREE.MathUtils.degToRad(35);

    const aspect = window.innerWidth / window.innerHeight;

    const viewDistance = THREE.MathUtils.lerp(
      9.8,
      8.4,
      THREE.MathUtils.clamp((aspect - 0.6) / (1.78 - 0.6), 0, 1),
    );
    const elevation = THREE.MathUtils.degToRad(
      THREE.MathUtils.lerp(
        16,
        10,
        THREE.MathUtils.clamp((aspect - 0.6) / (1.78 - 0.6), 0, 1),
      ),
    );

    const horizontalDistance = viewDistance * Math.cos(elevation);
    const heightOffset = viewDistance * Math.sin(elevation);

    gsap.to(this.cameraBase, {
      x: this.lookTarget.x + Math.cos(targetAngle) * horizontalDistance,
      y: this.lookTarget.y + heightOffset,
      z: this.lookTarget.z + Math.sin(targetAngle) * horizontalDistance,
      duration,
      ease: "power2.inOut",
    });
  }

  // The accretion disk, built as ONE unified ParticleCluster — not
  // several independent ones. This is the actual fix for "visible
  // layers/stripes/wedges": there is nothing left to see a seam
  // BETWEEN. Density, height and (via existing physics) angular speed
  // all vary CONTINUOUSLY with each particle's own radius instead of
  // jumping between a handful of hand-picked per-layer values:
  //  - initOrbitBurst's `densityBias` skews radius sampling toward the
  //    inner edge, so the disk is naturally densest near the core and
  //    thins out toward the rim — a real gradient, not a step.
  //  - stepOrbit() divides angular velocity by each particle's own
  //    radius (`rSpeed`), so one shared `spin` target already makes
  //    inner particles rotate faster than outer ones, continuously,
  //    with no per-radius bands required.
  //  - height tapers with radius inside initOrbitBurst itself (thin
  //    near the core, gently flaring outward).
  // Formation is a fast, energetic burst: shrink races from collapsed
  // to full radius in well under a second on "expo.out" (nearly all the
  // motion in the first few frames), with a brief spike of turbulence
  // that settles away right as it finishes — dynamic while forming,
  // perfectly smooth the instant it settles. Once the disk is fully
  // formed AND stabilized (the `chaos` decay's onComplete, the last of
  // the two tweens to finish), beginMemoriesReveal() takes over after a
  // short pause; the camera's final permanent orbit only begins once
  // every memory has finished emerging.
  buildAccretionDisk() {
    const innerR = BlackHole.DISK_INNER_RADIUS;
    const outerR = BlackHole.DISK_OUTER_RADIUS;
    const count = 80000;
    const burstDuration = 0.9;

    const disk = new ParticleCluster(count);

    disk.initOrbitBurst(innerR, outerR, 0.55, 1.6);
    disk.points.rotation.x = THREE.MathUtils.degToRad(16);

    disk.spin = 0;
    disk.shrink = 0.0001; // collapsed inside the black hole
    disk.chaos = 0;

    // Brighter and slightly larger near the core, fading and shrinking
    // toward the rim — the "hot inner edge" an accretion disk reads by,
    // computed as one continuous gradient off each particle's own
    // radius rather than a per-layer brightness jump.
    disk.setStyle((i) => {
      const t = (disk.orbitRadiusBase[i] - innerR) / (outerR - innerR);

      return {
        color: randomRed(),
        size:
          THREE.MathUtils.lerp(3.8, 1.3, t) +
          THREE.MathUtils.randFloat(-0.25, 0.25),
        alpha:
          THREE.MathUtils.lerp(0.55, 0.18, t) +
          THREE.MathUtils.randFloat(-0.05, 0.05),
      };
    });

    this.group.add(disk.points);
    this.accretionDisk = disk;

    // A fast fade-in — the burst should read as suddenly THERE, not
    // materializing gradually.
    disk.fadeTo(0.55, 0.35, 0);

    // A quick spike of turbulence right as it erupts, settling back to
    // nothing as it finishes expanding — "dynamic, then stable" — using
    // ParticleCluster's existing wobble rather than new physics.
    gsap.to(disk, { chaos: 0.9, duration: 0.18, ease: "power2.out" });
    // `chaos` is the last thing to settle (it starts decaying 0.18s
    // after `shrink` begins, so it finishes 0.18s after `shrink` does)
    // — its onComplete is the true "fully formed AND stabilized" event,
    // which is what the memory reveal below is gated on.
    gsap.to(disk, {
      chaos: 0,
      duration: burstDuration,
      delay: 0.18,
      ease: "sine.out",
      onComplete: () => {
        gsap.delayedCall(THREE.MathUtils.randFloat(0.5, 0.8), () =>
          this.beginMemoriesReveal(),
        );
      },
    });

    gsap.to(disk, {
      shrink: 1,
      duration: burstDuration,
      ease: "expo.out",
    });

    gsap.to(disk, {
      spin: 0.3,
      duration: burstDuration,
      ease: "sine.out",
    });
  }

  // ===========================
  // MEMORIES — reconnected to the accretion disk, sharing its actual
  // orbit mechanics rather than approximating them independently:
  //  - PLANE: each photo's wrapper is parented directly to
  //    `disk.points` (see emergeMemory), so it inherits the disk's own
  //    tilt via ordinary transform inheritance — it physically sits in
  //    the same plane the particles do, not a flat plane that merely
  //    looks similar.
  //  - RADIUS/HEIGHT: sampled from an ACTUAL particle already living in
  //    `disk.orbitRadiusBase`/`orbitHeightBase` (see emergeMemory), not
  //    a hand-picked band — it settles exactly where real particles
  //    already are.
  //  - ANGULAR SPEED: computed every frame (see update()) with the
  //    exact same formula stepOrbit() uses — spin * own speed variance
  //    / radius — read fresh from the disk's live `spin` each frame, so
  //    it always turns the same direction and stays in sync even if the
  //    disk's spin ever changes later.
  // A photo has no independent orbital physics of its own; it reads the
  // disk's, at its own sampled radius/height/speed.
  // ===========================

  // Reveals memories one at a time with a short random gap between each
  // (never all at once). The permanent camera orbit only begins once
  // the very last one has actually finished emerging (counted via
  // `remaining`, not a guessed total duration).
  beginMemoriesReveal() {
    this.memoryItems = [];

    const emergeDuration = 2.0;

    let remaining = memoryPhotos.length;
    let cumulativeDelay = 0;

    memoryPhotos.forEach((entry) => {
      gsap.delayedCall(cumulativeDelay, () => {
        this.emergeMemory(entry, emergeDuration, () => {
          remaining -= 1;

          if (remaining === 0) {
            this.beginCameraOrbit(0.02);
          }
        });
      });

      cumulativeDelay += THREE.MathUtils.randFloat(0.3, 0.5);
    });
  }

  // One memory's journey out of the black hole. The path has two
  // distinct phases sharing the same `emergeDuration`, driven by
  // separate eases on a plain `item.emerge` data object (never touching
  // `wrapper.position` directly — update() is the single place that
  // happens, same convention the particle clusters use):
  //  - RADIUS: "power4.out" — nearly all the distance covered in the
  //    first instants, reading as ejected with force.
  //  - ANGLE: starts `curveAmount` behind the photo's final resting
  //    angle and eases toward it on "power2.in" — almost no angular
  //    motion at first (a straight radial launch), which only picks up
  //    and accelerates as the radius finishes arriving — the "gravity
  //    catches it and curves it into the orbit" feel. The curve bends
  //    in the SAME direction the disk is already spinning.
  // Once both finish, `item.orbiting = true` hands off to update()'s
  // orbit branch at the exact angle/radius the emerge phase ended on —
  // no pop, and the photo never stops or hovers: it goes straight from
  // "arriving" to "orbiting forever" in the same frame.
  emergeMemory(entry, emergeDuration, onSettled) {
    const disk = this.accretionDisk;
    const sourceIndex = Math.floor(Math.random() * disk.count);

    const radius = disk.orbitRadiusBase[sourceIndex];
    const height = disk.orbitHeightBase[sourceIndex];
    const angle = Math.random() * Math.PI * 2;
    const speedVar = THREE.MathUtils.randFloat(0.85, 1.15);
    const bobPhase = Math.random() * Math.PI * 2;

    const curveDirection = Math.sign(disk.spin) || 1;
    const curveAmount = THREE.MathUtils.randFloat(0.9, 1.6) * curveDirection;

    const texture = loadPhotoTexture(entry);

    const photoMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      rotation: THREE.MathUtils.degToRad(
        THREE.MathUtils.randFloat(20, 40) * (Math.random() < 0.5 ? -1 : 1),
      ),
    });

    const photo = new THREE.Sprite(photoMaterial);

    // A soft glow behind the photo, so it reads as a glowing part of the
    // particle field rather than a flat card sitting on top of it.
    const glowMaterial = new THREE.SpriteMaterial({
      map: createGlowTexture("#ff7fa3"),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const glow = new THREE.Sprite(glowMaterial);
    glow.scale.setScalar(1.9);
    glow.position.z = -0.01;

    // Parented to `disk.points` itself, NOT `this.group` — this is what
    // actually puts the photo in the disk's plane. `disk.points` carries
    // the disk's fixed tilt (`buildAccretionDisk`'s
    // `disk.points.rotation.x`), so every position we set on `wrapper`
    // from here on is automatically expressed in that same tilted plane
    // for free, via ordinary parent-child transform inheritance — the
    // same reason the particles themselves all land on that plane. Local
    // (0,0,0) in this parent is still exactly the black hole's center,
    // since `disk.points` carries no position offset of its own.
    const wrapper = new THREE.Object3D();
    wrapper.add(glow);
    wrapper.add(photo);
    wrapper.scale.setScalar(0.001);
    disk.points.add(wrapper);

    const item = {
      wrapper,
      radius,
      height,
      angle,
      speedVar,
      bobPhase,
      orbiting: false,
      emerge: { radius: 0, height: 0, angleOffset: -curveAmount },
    };

    this.memoryItems.push(item);

    gsap.to(item.emerge, {
      radius,
      duration: emergeDuration,
      ease: "power4.out",
    });

    gsap.to(item.emerge, {
      height,
      duration: emergeDuration,
      ease: "power2.out",
    });

    gsap.to(item.emerge, {
      angleOffset: 0,
      duration: emergeDuration,
      ease: "power2.in",
      onComplete: () => {
        item.orbiting = true;

        if (onSettled) onSettled();
      },
    });

    gsap.to(wrapper.scale, {
      x: 0.42,
      y: 0.42,
      z: 0.42,
      duration: emergeDuration,
      ease: "back.out(1.4)",
    });

    gsap.to(photoMaterial, {
      opacity: 1,
      rotation: 0,
      duration: emergeDuration,
      ease: "power2.out",
    });

    gsap.to(glowMaterial, {
      opacity: 0.6,
      duration: emergeDuration,
      ease: "power2.out",
    });
  }

  // Recomputed every frame (cheap — a handful of scalars) rather than
  // once at setup, so it stays correct through a live window resize or
  // phone rotation mid-scene without needing any resize event wired
  // into this class. Combines two independent corrections:
  //  - device pixel ratio, since gl_PointSize is specified in actual
  //    device pixels;
  //  - how far the camera's current (responsive) fov has been pushed
  //    from BASE_VERTICAL_FOV — the same baseline Camera.js's own
  //    responsive-fov system is built around (see engine/camera/Camera.js)
  //    — so particles shrink/grow in step with everything else in frame
  //    as the fov compensates for aspect ratio, instead of holding a
  //    fixed pixel size regardless of how zoomed the shot currently is.
  computePointScale() {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    const baseHalfFovRad = THREE.MathUtils.degToRad(
      BlackHole.BASE_VERTICAL_FOV / 2,
    );
    const currentHalfFovRad = THREE.MathUtils.degToRad(this.camera.fov / 2);

    const fovCompensation =
      Math.tan(baseHalfFovRad) / Math.tan(currentHalfFovRad);

    return pixelRatio * fovCompensation;
  }

  update(delta) {
    if (!this.isActive) return;

    this.time += delta;

    if (this.orbitMode) {
      this.main.stepOrbit(delta, this.time);
    } else if (this.attractionMode) {
      this.main.step(delta, this.time);
    }

    const pointScale = this.computePointScale();

    this.main.setPointScale(pointScale);

    if (this.accretionDisk) {
      this.accretionDisk.setPointScale(pointScale);
    }

    this.main.setTime(this.time);

    // Spins around the ring's OWN normal (unaffected by ringPivot's
    // fixed tilt), so the sparkle texture visibly sweeps around while
    // the ring's overall tilt/ellipse shape stays perfectly stable.
    this.saturnRing.rotation.z += delta * 0.25;

    if (this.accretionDisk) {
      this.accretionDisk.stepOrbit(delta, this.time);
      this.accretionDisk.setTime(this.time);
    }

    if (this.memoryItems) {
      this.memoryItems.forEach((item) => {
        if (item.orbiting) {
          // The exact same angular-velocity formula stepOrbit() uses
          // (spin * own speed variance, divided by radius) — read fresh
          // from the disk every frame, so a photo turns the same
          // direction and stays in sync with it permanently, not just
          // at the moment it joined.
          const angularVel =
            (this.accretionDisk.spin * item.speedVar) /
            Math.max(item.radius, 0.7);

          item.angle += delta * angularVel;

          // A small independent bob on top of the orbit itself — "slight
          // floating motion" per the brief, not just an orbit path.
          const bob = Math.sin(this.time * 0.6 + item.bobPhase) * 0.08;

          item.wrapper.position.x = Math.cos(item.angle) * item.radius;
          item.wrapper.position.y = item.height + bob;
          item.wrapper.position.z = Math.sin(item.angle) * item.radius;
        } else {
          // Still emerging — position comes from item.emerge, which the
          // gsap tweens in emergeMemory() are mutating in the
          // background (see emergeMemory's comment for the two-phase
          // radius/angle shaping).
          const currentAngle = item.angle + item.emerge.angleOffset;

          item.wrapper.position.x = Math.cos(currentAngle) * item.emerge.radius;
          item.wrapper.position.y = item.emerge.height;
          item.wrapper.position.z = Math.sin(currentAngle) * item.emerge.radius;
        }
      });
    }

    if (this.cameraOrbitMode) {
      this.cameraOrbitAngle += delta * this.cameraOrbitSpeed;

      const breathe = Math.sin(this.time * 0.08) * 0.6;
      const r = this.cameraOrbitRadius + breathe;

      this.camera.position.set(
        this.lookTarget.x + Math.cos(this.cameraOrbitAngle) * r,
        this.lookTarget.y + this.cameraOrbitHeight,
        this.lookTarget.z + Math.sin(this.cameraOrbitAngle) * r,
      );

      this.camera.lookAt(this.lookTarget);
    } else {
      const swayX =
        Math.sin(this.time * 0.35) * 0.12 + Math.sin(this.time * 0.13) * 0.05;
      const swayY = Math.cos(this.time * 0.28) * 0.08;
      const swayZ = Math.sin(this.time * 0.19) * 0.06;

      this.camera.position.set(
        this.cameraBase.x + swayX,
        this.cameraBase.y + swayY,
        this.cameraBase.z + swayZ,
      );

      this.camera.lookAt(this.lookTarget);
    }
  }

  destroy() {
    this.main.dispose();

    this.core.geometry.dispose();
    this.core.material.dispose();

    this.saturnRing.geometry.dispose();
    this.saturnRing.material.map.dispose();
    this.saturnRing.material.dispose();

    if (this.accretionDisk) {
      this.accretionDisk.dispose();
    }

    if (this.memoryItems) {
      this.memoryItems.forEach((item) => {
        const [glow, photo] = item.wrapper.children;

        // The glow's texture is a small shared/cached one (see
        // createGlowTexture) — only its per-item material is disposed,
        // not the cached map, which stays alive for reuse.
        glow.material.dispose();

        photo.material.map?.dispose();
        photo.material.dispose();
      });
    }

    this.scene.remove(this.group);
  }
}
