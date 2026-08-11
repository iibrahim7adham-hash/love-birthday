import * as THREE from "three";
import gsap from "gsap";

import { CAMERA_HERO_POSITION, CAMERA_LOOK_TARGET_Y } from "./cake/CakeConstants";
import { getCakeCameraDistanceScale, getResponsiveSizeScale } from "./cake/CakeResponsive";
import {
  BALLOON_BREAKPOINT_MOBILE,
  BALLOON_BREAKPOINT_TABLET,
  BALLOON_BREAKPOINT_LAPTOP,
  BALLOON_POOL_SIZE_MOBILE,
  BALLOON_POOL_SIZE_TABLET,
  BALLOON_POOL_SIZE_LAPTOP,
  BALLOON_POOL_SIZE_DESKTOP,
  BALLOON_INTRO_FIRST_DELAY,
  BALLOON_INTRO_FIRST_WAVE_MIN,
  BALLOON_INTRO_FIRST_WAVE_MAX,
  BALLOON_INTRO_WAVE_MIN,
  BALLOON_INTRO_WAVE_MAX,
  BALLOON_INTRO_WAVE_INTERVAL_MIN,
  BALLOON_INTRO_WAVE_INTERVAL_MAX,
  BALLOON_FADE_IN_DURATION,
  BALLOON_FADE_OUT_TRAVEL_FRACTION,
  BALLOON_START_NY,
  BALLOON_END_NY,
  BALLOON_PROTECTED_HALF_WIDTH,
  BALLOON_HALF_WIDTH_SAFETY_MULT,
  BALLOON_NX_BANDS,
  BALLOON_MIN_NX_SEPARATION,
  BALLOON_CLUSTER_CHECK_TRAVEL_FRACTION,
  BALLOON_PLACEMENT_ATTEMPTS,
  BALLOON_TIERS,
  BALLOON_TIER_WEIGHTS,
  BALLOON_TIER_WEIGHTS_MOBILE,
  BALLOON_DRIFT_FREQ_MIN,
  BALLOON_DRIFT_FREQ_MAX,
  BALLOON_ROTATION_AMPLITUDE_MIN,
  BALLOON_ROTATION_AMPLITUDE_MAX,
  BALLOON_ROTATION_FREQ_MIN,
  BALLOON_ROTATION_FREQ_MAX,
  BALLOON_COLORS,
  BALLOON_SHAPE_WEIGHTS,
  BALLOON_MOBILE_SIZE_MULT,
  BALLOON_SPECIAL_CHANCE,
  BALLOON_SPECIAL_OPACITY_MULT,
  BALLOON_STRING_TOP_Y,
  BALLOON_STRING_BOTTOM_Y,
  BALLOON_STRING_CURVE_MULT,
  BALLOON_STRING_OPACITY,
  BALLOON_BODY_RADIUS,
} from "./StandardBalloonsConstants";

// A single shared sphere geometry for every pooled balloon body — safe
// to share across many meshes (only each instance's own MATERIAL needs
// to be unique, for per-balloon color/opacity), the same "cache once,
// reuse everywhere" convention this template's shared textures already
// follow. Both the "classic" and "elongated" shape variants reuse this
// exact geometry, just stretched differently via mesh.scale (see
// _initBalloon()) — no second geometry needed.
let sharedBodyGeometry = null;

function getBalloonBodyGeometry() {
  if (sharedBodyGeometry) return sharedBodyGeometry;
  sharedBodyGeometry = new THREE.SphereGeometry(BALLOON_BODY_RADIUS, 20, 20);
  return sharedBodyGeometry;
}

// A white heart silhouette on a transparent background, tinted per-
// balloon via SpriteMaterial.color — the same "white shape, tint via
// material.color" convention every other canvas-drawn texture in this
// template already uses. Used only for the rare heart-shaped balloon
// accents (see BALLOON_SHAPE_WEIGHTS).
let sharedHeartTexture = null;

function getBalloonHeartTexture() {
  if (sharedHeartTexture) return sharedHeartTexture;

  const size = 96;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  const topY = size * 0.32;

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(size / 2, topY);
  ctx.bezierCurveTo(size / 2, topY - size * 0.22, size * 0.08, topY - size * 0.15, size * 0.08, topY + size * 0.08);
  ctx.bezierCurveTo(size * 0.08, size * 0.48, size * 0.32, size * 0.68, size / 2, size * 0.9);
  ctx.bezierCurveTo(size * 0.68, size * 0.68, size * 0.92, size * 0.48, size * 0.92, topY + size * 0.08);
  ctx.bezierCurveTo(size * 0.92, topY - size * 0.15, size / 2, topY - size * 0.22, size / 2, topY);
  ctx.closePath();
  ctx.fill();

  sharedHeartTexture = new THREE.CanvasTexture(canvas);
  return sharedHeartTexture;
}

// Proportional weighted pick from an array of entries — the shared
// helper the tier/shape/color/band picks below all use (mirrors
// StandardFireworks.js's own _pickWeighted(), generalized to take
// explicit weight/value accessors since some callers work over
// Object.entries() and others over an array of { ..., weight }).
function pickWeighted(entries, weightFn, valueFn) {
  const total = entries.reduce((sum, entry) => sum + weightFn(entry), 0);
  let roll = Math.random() * total;

  for (const entry of entries) {
    roll -= weightFn(entry);
    if (roll <= 0) return valueFn(entry);
  }

  return valueFn(entries[entries.length - 1]);
}

// A pooled, gradually-introduced background celebration layer. Built
// (inert — every pooled balloon starts invisible/inactive) as soon as
// the celebration stage begins, but does NOT become visible until
// start() is called — StandardCandleBlowout.js calls it once, a beat
// after StandardFireworks.js's own playCinematicSequence() begins, so
// balloons are never present during the normal cake/candle state.
//
// Every pooled balloon (body mesh + heart sprite + string) is built
// exactly once in the constructor and never recreated — "activating" or
// "recycling" a balloon only ever mutates an existing pooled entry's
// own position/scale/color/material/visibility. Pool size IS the max
// active-balloon count for the current viewport (see the constructor's
// own responsive breakpoints) — recycling can never grow the on-screen
// count past it.
//
// Deliberately NOT coupled to StandardFireworks.js's own burst events
// (the brief's own "balloons may briefly brighten near an explosion" is
// explicitly a "can", not a "must", and wiring it would mean editing
// the fireworks file, which is off-limits here) — the visual hierarchy
// it asks for (fireworks > balloons) is instead achieved structurally:
// balloon bodies use plain (non-additive) blending and capped opacity,
// so they read as matte, grounded shapes that never compete with the
// fireworks' own additive glow.
export default class StandardBalloons {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this._started = false;
    this._introTimers = [];

    const width = window.innerWidth;
    let poolSize;
    let isMobile = false;

    if (width < BALLOON_BREAKPOINT_MOBILE) {
      poolSize = BALLOON_POOL_SIZE_MOBILE;
      isMobile = true;
    } else if (width < BALLOON_BREAKPOINT_TABLET) {
      poolSize = BALLOON_POOL_SIZE_TABLET;
    } else if (width < BALLOON_BREAKPOINT_LAPTOP) {
      poolSize = BALLOON_POOL_SIZE_LAPTOP;
    } else {
      poolSize = BALLOON_POOL_SIZE_DESKTOP;
    }

    this.poolSize = poolSize;
    this.isMobile = isMobile;
    this.tierWeights = isMobile ? BALLOON_TIER_WEIGHTS_MOBILE : BALLOON_TIER_WEIGHTS;

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.pool = [];
    for (let i = 0; i < this.poolSize; i++) {
      this.pool.push(this._buildSlot());
    }
  }

  // Same reference-camera-frustum technique CakeAtmosphere.js and
  // StandardFireworks.js each already use — this file is constructed
  // before CakeCamera's own dolly/pullback finishes, so the camera's
  // live transform isn't the settled one yet.
  _computeReferenceCameraBasis() {
    const distanceScale = getCakeCameraDistanceScale(this.camera);

    const position = new THREE.Vector3(
      CAMERA_HERO_POSITION.x * distanceScale,
      CAMERA_LOOK_TARGET_Y + (CAMERA_HERO_POSITION.y - CAMERA_LOOK_TARGET_Y) * distanceScale,
      CAMERA_HERO_POSITION.z * distanceScale,
    );
    const target = new THREE.Vector3(0, CAMERA_LOOK_TARGET_Y, 0);

    const forward = target.clone().sub(position).normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, forward).normalize();

    return { position, forward, right, up };
  }

  // Draws nx from one of BALLOON_NX_BANDS (a starting point for regional
  // variety), then rerolls (a new band each time, up to
  // BALLOON_PLACEMENT_ATTEMPTS times) unless the candidate clears BOTH:
  // (a) the cake's own true protected half-width PLUS this specific
  // balloon's own on-screen radius at its own chosen depth/scale — a
  // large, close balloon is visually wide, so its CENTER clearing a
  // band is not enough on its own to keep its EDGE off the cake (the
  // same lesson StandardFireworks.js's own burst-radius fix already
  // established); and (b) a minimum separation from any other balloon
  // still low in its own climb — the "no clusters" requirement. The
  // hard fallback (attempts exhausted) still pushes out to at least the
  // size-aware protected boundary, so the cake is never compromised even
  // if a neighbor ends up a little close.
  _pickSpawnNx(ownScale, ownHalfWidthNx, activeSiblings) {
    const requiredAbsNx = BALLOON_PROTECTED_HALF_WIDTH + ownHalfWidthNx * BALLOON_HALF_WIDTH_SAFETY_MULT;
    let candidate = 0;

    for (let attempt = 0; attempt < BALLOON_PLACEMENT_ATTEMPTS; attempt++) {
      const band = pickWeighted(BALLOON_NX_BANDS, (b) => b.weight, (b) => b);
      candidate = gsap.utils.random(band.min, band.max);

      if (Math.abs(candidate) < requiredAbsNx) continue;

      const tooClose = activeSiblings.some((other) => {
        if (other.travelFraction >= BALLOON_CLUSTER_CHECK_TRAVEL_FRACTION) return false;

        const minSeparation = BALLOON_MIN_NX_SEPARATION * (0.7 + 0.3 * ((ownScale + (other.scale ?? 1)) / 2));
        return Math.abs(candidate - other.nx) < minSeparation;
      });

      if (!tooClose) return candidate;
    }

    const side = candidate >= 0 ? 1 : -1;
    return side * Math.max(Math.abs(candidate), requiredAbsNx);
  }

  // Builds one pooled slot's persistent Three.js objects — a body
  // sphere (doubling as both the "classic" and "elongated" shapes, just
  // scaled differently), a heart sprite (only one of the two is ever
  // visible at a time, toggled per-activation in _initBalloon()), and a
  // 3-point string line. Starts fully inert (group.visible = false);
  // nothing here is ever rebuilt for the lifetime of the experience.
  _buildSlot() {
    const group = new THREE.Group();
    group.visible = false;

    const bodyMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
    const body = new THREE.Mesh(getBalloonBodyGeometry(), bodyMaterial);
    body.scale.set(1, 1.25, 1);
    group.add(body);

    const heartMaterial = new THREE.SpriteMaterial({
      map: getBalloonHeartTexture(),
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const heartSprite = new THREE.Sprite(heartMaterial);
    heartSprite.scale.set(0.85, 0.85, 1);
    heartSprite.visible = false;
    group.add(heartSprite);

    const stringGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, BALLOON_STRING_TOP_Y, 0),
      new THREE.Vector3(0, (BALLOON_STRING_TOP_Y + BALLOON_STRING_BOTTOM_Y) / 2, 0),
      new THREE.Vector3(0, BALLOON_STRING_BOTTOM_Y, 0),
    ]);
    const stringMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
    const string = new THREE.Line(stringGeometry, stringMaterial);
    group.add(string);

    this.group.add(group);

    return {
      group,
      body,
      bodyMaterial,
      heartSprite,
      heartMaterial,
      stringGeometry,
      stringMaterial,
      active: false,
      hasActivatedBefore: false,
    };
  }

  // (Re)activates one pooled slot with a brand-new random tier, shape,
  // color, position, and motion profile — used both for a balloon's
  // first entry during the gradual introduction and for every later
  // recycle once it finishes its climb, so every cycle looks different
  // (see the brief's own "randomized entry" + "no obvious repeating
  // patterns"). Every property below is rolled independently.
  _initBalloon(entry) {
    const tier = pickWeighted(
      Object.entries(this.tierWeights),
      ([, weight]) => weight,
      ([key]) => key,
    );
    const tierConfig = BALLOON_TIERS[tier];
    const color = pickWeighted(BALLOON_COLORS, (c) => c.weight, (c) => c.color);
    const shape = pickWeighted(
      Object.entries(BALLOON_SHAPE_WEIGHTS),
      ([, weight]) => weight,
      ([key]) => key,
    );
    const isHeart = shape === "heart";
    // "Special" (translucent glass / soft metallic sheen, via additive
    // blending — see below) only ever applies to a round body, never a
    // heart, keeping hearts a clean, simple accent rather than stacking
    // two special traits on one balloon.
    const isSpecial = !isHeart && Math.random() < BALLOON_SPECIAL_CHANCE;

    // Every tier's own scale/speed/drift ranges below are tuned against
    // the reference camera framing (see cake/CakeResponsive.js's own
    // getResponsiveSizeScale()) — multiplying by it here is what keeps a
    // "medium" balloon reading as the same fraction of the frame on a
    // narrow mobile portrait viewport as on a wide desktop one, instead
    // of shrinking/growing with the vertical fov Camera.js grows to
    // compensate aspect ratio. It's applied uniformly across every tier,
    // so the tiny/small/medium/large RATIOS to each other never change —
    // only the shared reference size does. A small extra trim on top,
    // mobile only.
    const responsiveScale = getResponsiveSizeScale(this.camera) * (this.isMobile ? BALLOON_MOBILE_SIZE_MULT : 1);
    const scale = gsap.utils.random(tierConfig.scaleMin, tierConfig.scaleMax) * responsiveScale;
    const depth = gsap.utils.random(tierConfig.depthMin, tierConfig.depthMax);
    const basis = this._computeReferenceCameraBasis();

    const fovRad = THREE.MathUtils.degToRad(this.camera.fov);
    const halfHeight = depth * Math.tan(fovRad / 2);
    const halfWidth = halfHeight * this.camera.aspect;

    // This balloon's own on-screen half-width, in normalized nx units,
    // at the depth/scale it just rolled — needed BEFORE nx is picked so
    // the cake-protection check (see _pickSpawnNx()) accounts for the
    // balloon's own visual size, not just its center point.
    const ownHalfWidthNx = (BALLOON_BODY_RADIUS * scale) / halfWidth;
    const activeSiblings = this.pool.filter((other) => other !== entry && other.active && other.travelFraction !== undefined);
    const nx = this._pickSpawnNx(scale, ownHalfWidthNx, activeSiblings);

    const originPosition = basis.position
      .clone()
      .add(basis.forward.clone().multiplyScalar(depth))
      .add(basis.right.clone().multiplyScalar(nx * halfWidth))
      .add(basis.up.clone().multiplyScalar(BALLOON_START_NY * halfHeight));

    const totalTravel = (BALLOON_END_NY - BALLOON_START_NY) * halfHeight;

    // Only a slot's very first-ever activation gets a randomized "head
    // start" partway up its own climb, so the initial population reads
    // as already scattered across the vertical range instead of every
    // balloon bunching near the bottom and slowly rising together.
    // Every later recycle returns cleanly from the bottom, matching the
    // brief's own described lifecycle ("...reach upper boundary -> fade
    // out -> recycle -> return from a NEW BOTTOM position").
    const risen = entry.hasActivatedBefore ? 0 : Math.random() * totalTravel * 0.8;
    entry.hasActivatedBefore = true;

    Object.assign(entry, {
      active: true,
      basis,
      originPosition,
      totalTravel,
      nx,
      scale,
      risen,
      // A head-started balloon shouldn't ALSO visibly fade in from
      // nothing — treat its own fade-in as already complete.
      elapsed: risen > 0 ? BALLOON_FADE_IN_DURATION : 0,
      travelFraction: risen / totalTravel,
      // riseSpeed also gets the same responsiveScale factor: totalTravel
      // (derived from halfHeight, a few lines up) already grows with the
      // same vertical-fov ballooning on narrow viewports, so scaling
      // speed by the identical factor keeps CLIMB DURATION (distance /
      // speed) constant across devices too — the fov term cancels out
      // algebraically, leaving the same felt pacing everywhere, not just
      // the same size.
      riseSpeed: gsap.utils.random(tierConfig.riseSpeedMin, tierConfig.riseSpeedMax) * responsiveScale,
      driftAmp: gsap.utils.random(tierConfig.driftAmpMin, tierConfig.driftAmpMax) * responsiveScale,
      driftFreq: gsap.utils.random(BALLOON_DRIFT_FREQ_MIN, BALLOON_DRIFT_FREQ_MAX),
      driftPhase: Math.random() * Math.PI * 2,
      rotAmp: gsap.utils.random(BALLOON_ROTATION_AMPLITUDE_MIN, BALLOON_ROTATION_AMPLITUDE_MAX),
      rotFreq: gsap.utils.random(BALLOON_ROTATION_FREQ_MIN, BALLOON_ROTATION_FREQ_MAX),
      rotPhase: Math.random() * Math.PI * 2,
      tierOpacity: tierConfig.opacity * (isSpecial ? BALLOON_SPECIAL_OPACITY_MULT : 1),
    });

    entry.group.visible = true;
    entry.group.scale.setScalar(scale);
    entry.group.position.copy(originPosition).add(basis.up.clone().multiplyScalar(risen));
    entry.group.rotation.z = 0;

    entry.body.visible = !isHeart;
    entry.body.scale.set(1, 1.25, 1);
    entry.heartSprite.visible = isHeart;

    const threeColor = new THREE.Color(color);
    entry.bodyMaterial.color.copy(threeColor);
    entry.bodyMaterial.opacity = 0;
    // Reset explicitly every (re)activation, not just when isSpecial is
    // true — a pooled slot that was special in a previous life must
    // have this cleared back to normal blending if this life's roll
    // isn't special, since the material itself is reused rather than
    // recreated.
    entry.bodyMaterial.blending = isSpecial ? THREE.AdditiveBlending : THREE.NormalBlending;
    entry.heartMaterial.color.copy(threeColor);
    entry.heartMaterial.opacity = 0;
    entry.stringMaterial.opacity = 0;
  }

  // Called once by StandardCandleBlowout.js, alongside
  // StandardFireworks.js's own playCinematicSequence(). Schedules the
  // first small wave after BALLOON_INTRO_FIRST_DELAY, then keeps
  // activating one or two more pooled balloons at a time (see
  // _runIntroWave()) until the whole (small, viewport-sized) pool is
  // active. Idempotent, the same "second call while already running is
  // a no-op" contract StandardFireworks.js's own playCinematicSequence()
  // follows.
  start() {
    if (this._started) return;
    this._started = true;

    this._introTimers.push(gsap.delayedCall(BALLOON_INTRO_FIRST_DELAY, () => this._runIntroWave(true)));
  }

  _runIntroWave(isFirst) {
    const inactive = this.pool.filter((entry) => !entry.active);
    if (inactive.length === 0) return;

    const waveMin = isFirst ? BALLOON_INTRO_FIRST_WAVE_MIN : BALLOON_INTRO_WAVE_MIN;
    const waveMax = isFirst ? BALLOON_INTRO_FIRST_WAVE_MAX : BALLOON_INTRO_WAVE_MAX;
    const count = Math.min(inactive.length, Math.round(gsap.utils.random(waveMin, waveMax)));

    for (let i = 0; i < count; i++) {
      this._initBalloon(inactive[i]);
    }

    const stillInactive = this.pool.some((entry) => !entry.active);
    if (stillInactive) {
      const delay = gsap.utils.random(BALLOON_INTRO_WAVE_INTERVAL_MIN, BALLOON_INTRO_WAVE_INTERVAL_MAX);
      this._introTimers.push(gsap.delayedCall(delay, () => this._runIntroWave(false)));
    }
  }

  update(delta) {
    if (!this._started) return;

    this.pool.forEach((entry) => {
      if (!entry.active) return;

      entry.elapsed += delta;
      entry.risen += entry.riseSpeed * delta;

      const phase = entry.elapsed * entry.driftFreq + entry.driftPhase;
      const drift = Math.sin(phase) * entry.driftAmp;
      const driftVelocity = Math.cos(phase) * entry.driftAmp * entry.driftFreq;
      const rotation = Math.sin(entry.elapsed * entry.rotFreq + entry.rotPhase) * entry.rotAmp;

      // Writes straight into the existing group.position rather than
      // building a chain of .clone()'d Vector3s (the previous version
      // allocated 3 new Vector3 instances per active balloon, every
      // frame — with several balloons active through the whole
      // celebration, that was a steady stream of short-lived garbage,
      // a real source of periodic GC micro-stutter). addScaledVector()
      // does the same "position + vector*scalar" math with zero
      // allocations.
      entry.group.position
        .copy(entry.originPosition)
        .addScaledVector(entry.basis.up, entry.risen)
        .addScaledVector(entry.basis.right, drift);
      entry.group.rotation.z = rotation;

      // Fade in on (re)activation, fade out over the final stretch of
      // the climb — never a hard pop-in or pop-out at either edge.
      // Persisted onto the entry (not just a local) so _pickSpawnNx()'s
      // own anti-clustering check can read every other active balloon's
      // latest travel progress when a new one spawns.
      const travelFraction = entry.risen / entry.totalTravel;
      entry.travelFraction = travelFraction;

      let opacityMult = Math.min(1, entry.elapsed / BALLOON_FADE_IN_DURATION);
      if (travelFraction > BALLOON_FADE_OUT_TRAVEL_FRACTION) {
        const outFraction = (travelFraction - BALLOON_FADE_OUT_TRAVEL_FRACTION) / (1 - BALLOON_FADE_OUT_TRAVEL_FRACTION);
        opacityMult = Math.min(opacityMult, 1 - THREE.MathUtils.clamp(outFraction, 0, 1));
      }

      const finalOpacity = entry.tierOpacity * opacityMult;
      entry.bodyMaterial.opacity = finalOpacity;
      entry.heartMaterial.opacity = finalOpacity;
      entry.stringMaterial.opacity = BALLOON_STRING_OPACITY * opacityMult;

      // The string's own midpoint/bottom trail the balloon's current
      // drift velocity a little, so it reads as a slight, animated
      // curve rather than a rigid straight segment.
      const trailOffset = -driftVelocity * BALLOON_STRING_CURVE_MULT;
      const positions = entry.stringGeometry.attributes.position;
      positions.setXYZ(1, trailOffset * 0.5, positions.getY(1), 0);
      positions.setXYZ(2, trailOffset, positions.getY(2), 0);
      positions.needsUpdate = true;

      if (travelFraction >= 1) {
        this._initBalloon(entry);
      }
    });
  }

  // Safe to call more than once. Per-instance materials/geometry (the
  // string, and every pooled slot's own body/heart materials) are
  // disposed; the shared body geometry and heart texture are module-
  // level caches meant to outlive any one instance, the same "never
  // dispose the shared cache" convention every other texture cache in
  // this template already follows.
  destroy() {
    this._introTimers.forEach((timer) => timer.kill());
    this._introTimers = [];

    this.pool.forEach((entry) => {
      entry.bodyMaterial.dispose();
      entry.heartMaterial.dispose();
      entry.stringGeometry.dispose();
      entry.stringMaterial.dispose();
    });

    this.scene.remove(this.group);
  }
}
