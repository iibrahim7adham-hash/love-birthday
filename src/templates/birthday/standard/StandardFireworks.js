import * as THREE from "three";
import gsap from "gsap";

import { CAMERA_HERO_POSITION, CAMERA_LOOK_TARGET_Y } from "./cake/CakeConstants";
import { getCakeCameraDistanceScale, getResponsiveSizeScale } from "./cake/CakeResponsive";
import {
  FIREWORK_ENTER_DELAY,
  FIREWORK_SPAWN_INTERVAL_MIN,
  FIREWORK_SPAWN_INTERVAL_MAX,
  FIREWORK_DOUBLE_BURST_CHANCE,
  FIREWORK_DOUBLE_BURST_DELAY_MIN,
  FIREWORK_DOUBLE_BURST_DELAY_MAX,
  FIREWORK_MOBILE_BREAKPOINT,
  FIREWORK_MAX_CONCURRENT,
  FIREWORK_MAX_CONCURRENT_MOBILE,
  FIREWORK_ROCKET_RISE_DURATION_MIN,
  FIREWORK_ROCKET_RISE_DURATION_MAX,
  FIREWORK_LAUNCH_NY,
  FIREWORK_LAUNCH_NX_JITTER,
  FIREWORK_ROCKET_SCALE,
  FIREWORK_ROCKET_COLOR,
  FIREWORK_PEAK_PAUSE,
  FIREWORK_TRAIL_THICKNESS_MULT,
  FIREWORK_TRAIL_PEAK_OPACITY,
  FIREWORK_TRAIL_FADE_IN_FRACTION,
  FIREWORK_BURST_PARTICLE_COUNT,
  FIREWORK_BURST_RADIUS_MIN,
  FIREWORK_BURST_RADIUS_MAX,
  FIREWORK_BURST_DURATION,
  FIREWORK_BURST_PARTICLE_SCALE_MIN,
  FIREWORK_BURST_PARTICLE_SCALE_MAX,
  FIREWORK_BURST_PEAK_OPACITY,
  FIREWORK_STREAK_FRACTION,
  FIREWORK_STREAK_LENGTH_MULT,
  FIREWORK_FLASH_SCALE_MULT,
  FIREWORK_FLASH_DURATION,
  FIREWORK_FLASH_PEAK_OPACITY,
  FIREWORK_SECONDARY_SPARK_COUNT_FRACTION,
  FIREWORK_SECONDARY_SPARK_DELAY,
  FIREWORK_SECONDARY_SPARK_RADIUS_MULT,
  FIREWORK_SECONDARY_SPARK_SCALE_MULT,
  FIREWORK_SECONDARY_SPARK_DURATION_MULT,
  FIREWORK_RESIDUAL_COUNT_FRACTION,
  FIREWORK_RESIDUAL_SCALE_MULT,
  FIREWORK_RESIDUAL_RADIUS_MULT,
  FIREWORK_RESIDUAL_DURATION_MULT,
  FIREWORK_RESIDUAL_PEAK_OPACITY,
  FIREWORK_COLORS,
  FIREWORK_DEPTH_MIN,
  FIREWORK_DEPTH_MAX,
  FIREWORK_SCREEN_COVERAGE,
  FIREWORK_NY_MIN,
  FIREWORK_NY_MAX,
  FIREWORK_EXCLUSION_RADIUS_X,
  FIREWORK_EXCLUSION_RADIUS_Y,
  FIREWORK_MEGA_CHANCE,
  FIREWORK_MEGA_SCALE_MULT,
  FIREWORK_MEGA_PARTICLE_COUNT_MULT,
  FIREWORK_CINEMATIC_MAX_CONCURRENT_DESKTOP,
  FIREWORK_CINEMATIC_MAX_CONCURRENT_MOBILE,
  FIREWORK_CINEMATIC_WAVES,
  FIREWORK_CINEMATIC_WAVE_SPAWN_STAGGER_MIN,
  FIREWORK_CINEMATIC_WAVE_SPAWN_STAGGER_MAX,
  FIREWORK_CINEMATIC_SUSTAIN_DELAY_AFTER_LAST_WAVE,
  FIREWORK_CINEMATIC_SUSTAIN_DURATION,
  FIREWORK_CINEMATIC_SUSTAIN_INTERVAL_MIN,
  FIREWORK_CINEMATIC_SUSTAIN_INTERVAL_MAX,
  FIREWORK_CINEMATIC_SCREEN_COVERAGE,
  FIREWORK_CINEMATIC_NY_MIN,
  FIREWORK_CINEMATIC_NY_MAX,
  FIREWORK_CINEMATIC_EXCLUSION_RADIUS_X,
  FIREWORK_CINEMATIC_EXCLUSION_RADIUS_Y,
  FIREWORK_TIERS,
  FIREWORK_TIER_WEIGHTS,
  FIREWORK_SHAPE_WEIGHTS,
  FIREWORK_GLITTER_PARTICLE_COUNT_MULT,
  FIREWORK_GLITTER_SCALE_MULT,
  FIREWORK_GLITTER_DURATION_MULT,
  FIREWORK_DENSE_PARTICLE_COUNT_MULT,
  FIREWORK_DENSE_SCALE_MULT,
  FIREWORK_DENSE_RADIUS_MULT,
  FIREWORK_CINEMATIC_RADIUS_MULT,
  FIREWORK_CINEMATIC_SCALE_MULT,
} from "./StandardFireworksConstants";

// A soft radial-gradient sprite texture, built once and shared by every
// round rocket/burst particle — the same "cache a canvas gradient, reuse
// the map, tint via material.color" technique cake/FormationSparkles.js's
// own getSparkleTexture() and cake/CakeAtmosphere.js's own
// getGlowTexture() already use, kept local to this file per the same
// "each file builds its own small cache" convention.
let sharedGlowTexture = null;

function getFireworkGlowTexture() {
  if (sharedGlowTexture) return sharedGlowTexture;

  const size = 96;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  sharedGlowTexture = new THREE.CanvasTexture(canvas);
  return sharedGlowTexture;
}

// An elongated horizontal gradient — bright/soft-edged in the middle,
// fully transparent at both ends — shared by every rocket trail and
// every "streak" burst particle (see FIREWORK_STREAK_FRACTION below).
// A Sprite using this texture, stretched via scale.x and rotated via
// material.rotation, reads as a genuine glowing line without any actual
// line geometry — the same "canvas gradient + Sprite" convention as the
// round glow texture above, just an elongated variant.
let sharedTrailTexture = null;

function getTrailTexture() {
  if (sharedTrailTexture) return sharedTrailTexture;

  const width = 128;
  const height = 32;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
  gradient.addColorStop(0.5, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(width / 2, height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  sharedTrailTexture = new THREE.CanvasTexture(canvas);
  return sharedTrailTexture;
}

function pickFireworkColor() {
  const offset = Math.floor(Math.random() * FIREWORK_COLORS.length);
  return (i) => FIREWORK_COLORS[(i + offset) % FIREWORK_COLORS.length];
}

// Occasional small celebratory bursts in the celebration stage — a
// supporting background accent, never the visual focus — PLUS an
// on-demand cinematic escalating sequence (see playCinematicSequence(),
// called by StandardCandleBlowout.js once the candles are blown out) for
// the emotional-climax "the whole sky celebrates" moment. Both share the
// exact same rocket/burst machinery below (tier + shape options), so
// this stays one fireworks system rather than two.
//
// Each firework (bottom-of-frame launch -> rise with a real glowing
// trail -> brief pause -> layered burst -> fade) is a fully
// self-disposing one-shot GSAP timeline, the same one-shot-timeline
// pattern FormationSparkles.js's own burst() already establishes —
// nothing persists between fireworks except the two shared textures
// above. A recursive gsap.delayedCall spawner fires new ones at random
// intervals, occasionally scheduling a quick second burst so the pacing
// "breathes" rather than firing on a metronome; the cinematic sequence
// temporarily takes over that spawner (see playCinematicSequence()) and
// hands it back once it finishes.
export default class StandardFireworks {
  constructor(scene, camera, audio) {
    this.scene = scene;
    this.camera = camera;
    this.audio = audio;

    this._active = new Set();
    this._ambientMaxConcurrent =
      window.innerWidth < FIREWORK_MOBILE_BREAKPOINT ? FIREWORK_MAX_CONCURRENT_MOBILE : FIREWORK_MAX_CONCURRENT;
    this._maxConcurrent = this._ambientMaxConcurrent;

    this._cinematicTimers = [];
    this._cinematicActive = false;

    this._startAt = gsap.delayedCall(FIREWORK_ENTER_DELAY, () => this._scheduleNextSpawn());
  }

  // A stable forward/right/up basis matching the camera's own eventual
  // settled framing — the exact same technique/reasoning
  // cake/CakeAtmosphere.js's own _computeReferenceCameraBasis() already
  // uses (this file is constructed well before CakeCamera's own
  // dolly/pullback has finished, so the camera's live transform isn't
  // the settled one yet). Reuses getCakeCameraDistanceScale(), the same
  // responsive helper CakeCamera.js itself applies to
  // CAMERA_HERO_POSITION, so this always agrees with wherever the
  // camera actually ends up on any aspect ratio.
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

  // Converts a normalized (nx, ny) — both roughly within [-1, 1] — at a
  // given depth into a world-space point using `basis`, the same
  // frustum math cake/CakeAtmosphere.js's own star field placement
  // already relies on. Shared by both burst placement and rocket-launch
  // placement below so the two always agree on the same frame geometry.
  _positionFromNormalized(basis, depth, nx, ny) {
    const fovRad = THREE.MathUtils.degToRad(this.camera.fov);
    const halfHeight = depth * Math.tan(fovRad / 2);
    const halfWidth = halfHeight * this.camera.aspect;

    const position = basis.position
      .clone()
      .add(basis.forward.clone().multiplyScalar(depth))
      .add(basis.right.clone().multiplyScalar(nx * halfWidth))
      .add(basis.up.clone().multiplyScalar(ny * halfHeight));

    return { position, halfHeight, halfWidth };
  }

  // One random burst position somewhere across the camera's own visible
  // frame (biased toward the upper portion — real fireworks bloom above
  // the horizon), re-rolled up to a few times if it lands somewhere that
  // would put the cake at risk. Every bound is overridable so the
  // cinematic sequence can ask for wider coverage and a larger
  // cake-clear zone without a second placement method.
  //
  // The danger test is deliberately NOT a simple ellipse around the
  // peak point: every rocket launches from the bottom of the frame (see
  // FIREWORK_LAUNCH_NY in _spawnFirework()) at very nearly the SAME nx
  // as its own peak, so it rises in an almost-straight vertical line —
  // meaning any peak whose nx sits within the cake's own horizontal
  // footprint has its entire rocket+trail pass directly through the
  // cake's screen column on the way up, even if the peak's own ny ends
  // up safely above it. A peak is only actually safe from that if
  // EITHER its nx already clears the cake's width, OR the flight never
  // climbs as high as the cake's own bottom edge in the first place
  // (ny stays at/below -effectiveExclusionY, so it never reaches the
  // cake's height band at all).
  //
  // `burstRadius` is this specific firework's own estimated outward
  // particle travel distance (world units) — the exclusion radius is
  // inflated by that amount (converted to normalized units at each
  // candidate's own depth) before testing, so a wide/foreground burst
  // whose CENTER clears the cake's silhouette still can't radiate its
  // own particles back into it. Without this, only the center point was
  // ever protected, so any burst radius larger than the exclusion zone
  // itself (routine for foreground/mega fireworks) could still spray
  // particles over the cake/candles/title.
  _randomBurstPosition(
    basis,
    {
      depthMin = FIREWORK_DEPTH_MIN,
      depthMax = FIREWORK_DEPTH_MAX,
      coverage = FIREWORK_SCREEN_COVERAGE,
      nyMin = FIREWORK_NY_MIN,
      nyMax = FIREWORK_NY_MAX,
      exclusionX = FIREWORK_EXCLUSION_RADIUS_X,
      exclusionY = FIREWORK_EXCLUSION_RADIUS_Y,
      burstRadius = 0,
    } = {},
  ) {
    const fovRad = THREE.MathUtils.degToRad(this.camera.fov);

    let nx = 0;
    let ny = 0;
    let depth = depthMin;
    let dangerous = true;
    let effectiveExclusionX = exclusionX;

    for (let attempt = 0; attempt < 6; attempt++) {
      depth = gsap.utils.random(depthMin, depthMax);
      nx = gsap.utils.random(-1, 1) * coverage;
      ny = gsap.utils.random(nyMin, nyMax);

      const halfHeightAttempt = depth * Math.tan(fovRad / 2);
      const halfWidthAttempt = halfHeightAttempt * this.camera.aspect;
      effectiveExclusionX = exclusionX + (burstRadius * 1.15) / halfWidthAttempt;
      const effectiveExclusionY = exclusionY + (burstRadius * 1.15) / halfHeightAttempt;

      const withinCakeWidth = Math.abs(nx) < effectiveExclusionX;
      const flightReachesCakeHeight = ny > -effectiveExclusionY;
      dangerous = withinCakeWidth && flightReachesCakeHeight;

      if (!dangerous) break;
    }

    // A hard guarantee, not just a (usually-sufficient) probability: if
    // every random attempt above still landed in the danger zone — which
    // can happen for a very close/large burst whose own inflated
    // exclusion radius eats up most of the available coverage — force nx
    // out to the nearest safe edge rather than ever accepting a position
    // that would send the rocket's own trail straight through the cake.
    if (dangerous) {
      const side = nx >= 0 ? 1 : -1;
      nx = side * Math.min(effectiveExclusionX * 1.05, coverage);
    }

    const { position, halfHeight } = this._positionFromNormalized(basis, depth, nx, ny);
    return { position, halfHeight, depth, nx };
  }

  _scheduleNextSpawn() {
    const delay = gsap.utils.random(FIREWORK_SPAWN_INTERVAL_MIN, FIREWORK_SPAWN_INTERVAL_MAX);

    this._spawnCall = gsap.delayedCall(delay, () => {
      this._trySpawn();

      // Occasionally a quick second burst nearby in time, so the
      // pacing has some texture instead of a perfectly even metronome.
      if (Math.random() < FIREWORK_DOUBLE_BURST_CHANCE) {
        gsap.delayedCall(gsap.utils.random(FIREWORK_DOUBLE_BURST_DELAY_MIN, FIREWORK_DOUBLE_BURST_DELAY_MAX), () =>
          this._trySpawn(),
        );
      }

      this._scheduleNextSpawn();
    });
  }

  _trySpawn() {
    if (this._active.size >= this._maxConcurrent) return;
    this._spawnFirework();
  }

  // Picks a key from a { key: weight } map proportionally to its own
  // weight — the shared helper both the tier and shape picks below use,
  // so the cinematic sequence's own variety reads as a genuine
  // distribution rather than uniform random across a small enum.
  _pickWeighted(weights) {
    const entries = Object.entries(weights);
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = Math.random() * total;

    for (const [key, weight] of entries) {
      roll -= weight;
      if (roll <= 0) return key;
    }

    return entries[entries.length - 1][0];
  }

  // Builds and animates the rocket sprite + its own elongated glowing
  // trail sprite, from `launch` up to `peak`, over `riseDuration`. The
  // trail is a single Sprite using getTrailTexture(), positioned at the
  // launch->peak midpoint and scaled along X to the launch->peak
  // distance, rotated ONCE via material.rotation to the camera-relative
  // angle between the two points — since the rocket's own position tween
  // below uses a plain linear/power ease along a straight line, growing
  // the trail's own scale.x with a matching tween keeps it visually
  // "following" the rocket's true position without a per-frame
  // onUpdate readout. Both sprites are added to `tl` (the caller's own
  // rocket-and-burst timeline) so they share its single onComplete
  // disposal.
  _buildRocketAndTrail(tl, launch, peak, basis, riseDuration, tierConfig, combinedScaleMult) {
    const rocketMaterial = new THREE.SpriteMaterial({
      map: getFireworkGlowTexture(),
      color: new THREE.Color(FIREWORK_ROCKET_COLOR),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const rocket = new THREE.Sprite(rocketMaterial);
    rocket.position.copy(launch);
    rocket.scale.setScalar(FIREWORK_ROCKET_SCALE * combinedScaleMult);
    this.scene.add(rocket);

    const delta = peak.clone().sub(launch);
    const distance = delta.length();
    const angle = Math.atan2(delta.dot(basis.up), delta.dot(basis.right));
    const midpoint = launch.clone().add(delta.clone().multiplyScalar(0.5));

    const trailMaterial = new THREE.SpriteMaterial({
      map: getTrailTexture(),
      color: new THREE.Color(FIREWORK_ROCKET_COLOR),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      rotation: angle,
    });
    const trailScaleY = FIREWORK_ROCKET_SCALE * combinedScaleMult * FIREWORK_TRAIL_THICKNESS_MULT;
    const trail = new THREE.Sprite(trailMaterial);
    trail.position.copy(launch);
    trail.scale.set(0.001, trailScaleY, 1);
    this.scene.add(trail);

    const fadeInDuration = riseDuration * FIREWORK_TRAIL_FADE_IN_FRACTION;

    tl.to(rocketMaterial, { opacity: 0.9 * tierConfig.opacityMult, duration: riseDuration * 0.3, ease: "power1.out" }, 0);
    tl.to(rocket.position, { x: peak.x, y: peak.y, z: peak.z, duration: riseDuration, ease: "power1.out" }, 0);
    tl.to(rocketMaterial, { opacity: 0, duration: 0.15 }, riseDuration - 0.05);

    // The trail grows FROM the launch point TOWARD the rocket's own
    // current position — its own midpoint/scale.x both animate in
    // lockstep with the rocket's position tween above (same duration,
    // same ease), so the bright leading edge always reads as "where the
    // rocket currently is" and the trailing edge stays anchored at the
    // launch point.
    tl.to(trailMaterial, { opacity: FIREWORK_TRAIL_PEAK_OPACITY * tierConfig.opacityMult, duration: fadeInDuration, ease: "power1.out" }, 0);
    tl.to(
      trail.scale,
      { x: distance, duration: riseDuration, ease: "power1.out" },
      0,
    );
    tl.to(
      trail.position,
      { x: midpoint.x, y: midpoint.y, z: midpoint.z, duration: riseDuration, ease: "power1.out" },
      0,
    );
    tl.to(trailMaterial, { opacity: 0, duration: 0.25 }, riseDuration - 0.1);

    return {
      dispose: () => {
        this.scene.remove(rocket);
        rocketMaterial.dispose();
        this.scene.remove(trail);
        trailMaterial.dispose();
      },
    };
  }

  // One rocket-rise -> pause -> burst -> fade sequence, fully
  // self-disposing on completion. `tier` (background/midground/
  // foreground — see FIREWORK_TIERS) biases depth/particle-count/scale/
  // opacity/duration together so "closer" reads as one coherent bundle
  // of cues, the same depth-driven-together technique
  // CakeAtmosphere.js's own star field already uses. `shape` is passed
  // straight through to the eventual _burst() call. Placement bounds
  // (coverage/ny/exclusion) default to the ambient spawner's own
  // restrained values but can be widened by the cinematic sequence. The
  // rocket always launches from near the bottom of the frame (see
  // FIREWORK_LAUNCH_NY) at a horizontal offset near — but not identical
  // to — the burst's own nx, so it visibly angles up toward its target
  // rather than rising perfectly straight beneath it.
  _spawnFirework(options = {}) {
    const {
      tier = "midground",
      shape = "round",
      coverage,
      nyMin,
      nyMax,
      exclusionX,
      exclusionY,
      radiusMult = 1,
      scaleMult = 1,
    } = options;
    const tierConfig = FIREWORK_TIERS[tier];

    // The brief's own "occasional very large" firework — only ever
    // rolled for the already-larger foreground tier, so "very large"
    // stays genuinely rarer than "medium"/"large".
    const isMega = tier === "foreground" && Math.random() < FIREWORK_MEGA_CHANCE;
    const megaScaleMult = isMega ? FIREWORK_MEGA_SCALE_MULT : 1;
    const megaParticleMult = isMega ? FIREWORK_MEGA_PARTICLE_COUNT_MULT : 1;
    const combinedScaleMult = tierConfig.scaleMult * scaleMult * megaScaleMult;
    // Every size-driving constant (rocket/trail scale, burst particle
    // scale, flash scale, and — separately, further down — burst radius)
    // is tuned against the reference camera framing (see
    // cake/CakeResponsive.js's own getResponsiveSizeScale()) — this is
    // what keeps a firework's explosion reading as the same fraction of
    // the frame on a narrow mobile portrait viewport as on a wide
    // desktop one, instead of shrinking/growing with the vertical fov
    // Camera.js grows to compensate aspect ratio (the same fix applied
    // to StandardBalloons.js). Kept as a SEPARATE factor from
    // combinedScaleMult (applied once at each actual size usage below)
    // rather than folded into it — combinedScaleMult itself already gets
    // applied twice for the flash sprite specifically (see _burst()'s
    // own flashScale, which multiplies its own `scaleMax` — already
    // combinedScaleMult-scaled — by combinedScaleMult again); baking
    // responsiveScale into combinedScaleMult would get it SQUARED there,
    // wildly over-correcting the flash on narrow viewports.
    const responsiveScale = getResponsiveSizeScale(this.camera);

    const glitterBoost = shape === "glitter";
    const denseBoost = shape === "dense";
    const shapeRadiusMult = denseBoost ? FIREWORK_DENSE_RADIUS_MULT : 1;
    // The farthest this specific firework's own particles (main layer,
    // the largest radius layer) can realistically travel — used to keep
    // the cake-exclusion zone honest regardless of tier/shape (see
    // _randomBurstPosition()'s own burstRadius param). Also carries the
    // same responsiveScale factor, since it must match the ACTUAL burst
    // radius computed below for the exclusion math to stay correct on
    // every device.
    const estimatedBurstRadius = FIREWORK_BURST_RADIUS_MAX * radiusMult * shapeRadiusMult * responsiveScale;

    const basis = this._computeReferenceCameraBasis();
    const { position: peak, nx: peakNx, depth } = this._randomBurstPosition(basis, {
      depthMin: tierConfig.depthMin,
      depthMax: tierConfig.depthMax,
      coverage,
      nyMin,
      nyMax,
      exclusionX,
      exclusionY,
      burstRadius: estimatedBurstRadius,
    });

    // The jitter is added AWAY from center (same sign as peakNx, or an
    // arbitrary side if peakNx lands exactly on it), never toward it —
    // the rocket launches from a slightly wider stance than its own
    // peak and arcs inward as it climbs. This guarantees |nx| stays >=
    // |peakNx| for the entire straight-line rise, so if the peak itself
    // already cleared the cake's danger zone (see
    // _randomBurstPosition()), the whole rocket/trail path is
    // guaranteed to as well — a jitter that could go either direction
    // could otherwise pull the launch back in toward center and send
    // the trail straight through the cake on its way up.
    const outwardSign = peakNx >= 0 ? 1 : -1;
    const launchNx = THREE.MathUtils.clamp(
      peakNx + outwardSign * gsap.utils.random(0, FIREWORK_LAUNCH_NX_JITTER),
      -1.15,
      1.15,
    );
    const { position: launch } = this._positionFromNormalized(basis, depth, launchNx, FIREWORK_LAUNCH_NY);

    const riseDuration =
      gsap.utils.random(FIREWORK_ROCKET_RISE_DURATION_MIN, FIREWORK_ROCKET_RISE_DURATION_MAX) * tierConfig.durationMult;

    const tl = gsap.timeline({
      onComplete: () => {
        this._active.delete(entry);
      },
    });
    // `dispose` is what destroy() falls back to if this timeline gets
    // killed mid-flight (rocket still rising, never reached its own
    // tl.call below) — guarantees the sprites/materials are always
    // cleaned up regardless of when teardown happens, not just on
    // natural completion. Starts as the rocket/trail's own dispose and
    // is swapped for the burst's own dispose once the burst begins (see
    // tl.call below), so it always matches whatever is actually still
    // alive in the scene.
    const entry = { tl, dispose: () => {} };
    this._active.add(entry);

    entry.dispose = this._buildRocketAndTrail(
      tl,
      launch,
      peak,
      basis,
      riseDuration,
      tierConfig,
      combinedScaleMult * responsiveScale,
    ).dispose;

    tl.call(
      () => {
        entry.dispose();
        this.audio.trigger("firework:burst");

        const countMult =
          tierConfig.particleCountMult *
          megaParticleMult *
          (glitterBoost ? FIREWORK_GLITTER_PARTICLE_COUNT_MULT : 1) *
          (denseBoost ? FIREWORK_DENSE_PARTICLE_COUNT_MULT : 1);
        const shapeScaleMult = glitterBoost ? FIREWORK_GLITTER_SCALE_MULT : denseBoost ? FIREWORK_DENSE_SCALE_MULT : 1;
        const shapeDurationMult = glitterBoost ? FIREWORK_GLITTER_DURATION_MULT : 1;

        this._burst(peak, {
          particleCount: Math.round(FIREWORK_BURST_PARTICLE_COUNT * countMult),
          radiusMin: FIREWORK_BURST_RADIUS_MIN * radiusMult * shapeRadiusMult * responsiveScale,
          radiusMax: FIREWORK_BURST_RADIUS_MAX * radiusMult * shapeRadiusMult * responsiveScale,
          scaleMin: FIREWORK_BURST_PARTICLE_SCALE_MIN * combinedScaleMult * shapeScaleMult * responsiveScale,
          scaleMax: FIREWORK_BURST_PARTICLE_SCALE_MAX * combinedScaleMult * shapeScaleMult * responsiveScale,
          duration: FIREWORK_BURST_DURATION * tierConfig.durationMult * shapeDurationMult,
          opacityMult: tierConfig.opacityMult,
          scaleMult: combinedScaleMult,
          shape,
        });
      },
      null,
      riseDuration + FIREWORK_PEAK_PAUSE,
    );
  }

  // The outward direction a single burst particle travels along, before
  // being scaled by its own random radius — this is the ONLY thing that
  // changes between burst shapes (see FIREWORK_SHAPE_WEIGHTS); the
  // radiate-then-fade animation in _burst() itself is identical for
  // every shape.
  _burstDirection(shape) {
    const spread = () => THREE.MathUtils.randFloatSpread(2);

    if (shape === "horizontal") {
      return new THREE.Vector3(spread() * 1.7, spread() * 0.45, spread() * 0.6).normalize();
    }

    if (shape === "vertical") {
      return new THREE.Vector3(spread() * 0.5, spread() * 1.7, spread() * 0.5).normalize();
    }

    if (shape === "heart") {
      // The classic parametric heart curve, in the plane roughly facing
      // the camera (this template's own camera sits close enough to the
      // world Z axis that raw X/Y already reads correctly on screen —
      // the same assumption the existing round burst's own direction
      // vector already relies on).
      const t = Math.random() * Math.PI * 2;
      const hx = 16 * Math.sin(t) ** 3;
      const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      return new THREE.Vector3(hx, hy, spread() * 3).normalize();
    }

    // "round", "dense", and "glitter" all use the same spherical
    // scatter — each one's own distinct look comes entirely from its
    // particle count/scale/radius/duration multipliers (see
    // _spawnFirework()), not a different direction shape.
    return new THREE.Vector3(spread(), spread(), spread()).normalize();
  }

  // Builds one radiating layer of particles (used for the main burst,
  // the secondary-spark layer, and the residual/glitter layer below) —
  // a fraction of them rendered as elongated "streak" sprites (reusing
  // getTrailTexture(), rotated to point along their own travel
  // direction) instead of round dots, so the burst reads as genuinely
  // detailed rather than a uniform ring of identical circles. Returns
  // the list of { sprite, direction } entries and queues their
  // radiate+fade tweens onto `tl` starting at `startAt`.
  _buildBurstLayer(tl, group, options) {
    const {
      particleCount,
      radiusMin,
      radiusMax,
      scaleMin,
      scaleMax,
      duration,
      peakOpacity,
      colorAt,
      streakFraction = 0,
      startAt = 0,
    } = options;

    const glowTexture = getFireworkGlowTexture();
    const trailTexture = getTrailTexture();
    const sprites = [];

    for (let i = 0; i < particleCount; i++) {
      const isStreak = Math.random() < streakFraction;
      const color = colorAt(i);
      const direction = this._burstDirection(options.shape).multiplyScalar(gsap.utils.random(radiusMin, radiusMax));
      const scale = gsap.utils.random(scaleMin, scaleMax);

      const material = new THREE.SpriteMaterial({
        map: isStreak ? trailTexture : glowTexture,
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      if (isStreak) {
        material.rotation = Math.atan2(direction.y, direction.x);
      }

      const sprite = new THREE.Sprite(material);
      sprite.scale.set(isStreak ? scale * FIREWORK_STREAK_LENGTH_MULT : scale, scale, 1);
      group.add(sprite);

      sprites.push({ sprite, direction });

      tl.to(sprite.position, { x: direction.x, y: direction.y, z: direction.z, duration, ease: "power2.out" }, startAt);
      tl.to(material, { opacity: peakOpacity, duration: duration * 0.3, ease: "power1.out" }, startAt);
      tl.to(material, { opacity: 0, duration: duration * 0.7, ease: "power1.in" }, startAt + duration * 0.3);
    }

    return sprites;
  }

  // The burst itself — now genuinely layered rather than one uniform
  // radiating ring: a single bright central "flash" that appears and
  // fades almost instantly, the main radiating particles (a fraction of
  // which read as short outward streaks), a slightly-delayed secondary
  // "spark" layer (a smaller/dimmer echo, giving the burst a brief
  // crackle after the initial flash), and a small longer-lingering
  // "residual/glitter" layer that fades out slowest of all. Every
  // visual parameter is overridable (see _spawnFirework()'s own tier/
  // shape multipliers) so this one method serves every burst variety
  // instead of needing a second implementation per shape.
  _burst(position, options = {}) {
    const {
      particleCount = FIREWORK_BURST_PARTICLE_COUNT,
      radiusMin = FIREWORK_BURST_RADIUS_MIN,
      radiusMax = FIREWORK_BURST_RADIUS_MAX,
      scaleMin = FIREWORK_BURST_PARTICLE_SCALE_MIN,
      scaleMax = FIREWORK_BURST_PARTICLE_SCALE_MAX,
      duration = FIREWORK_BURST_DURATION,
      opacityMult = 1,
      scaleMult = 1,
      shape = "round",
    } = options;

    const group = new THREE.Group();
    group.position.copy(position);
    this.scene.add(group);

    const colorAt = pickFireworkColor();

    // The bright central flash — a single oversized round sprite that
    // appears almost instantly and fades within a fraction of a second,
    // giving the burst a genuine "BOOM" moment before the particles
    // finish radiating outward.
    const flashMaterial = new THREE.SpriteMaterial({
      map: getFireworkGlowTexture(),
      color: new THREE.Color(colorAt(0)),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const flashSprite = new THREE.Sprite(flashMaterial);
    const flashScale = gsap.utils.random(scaleMax, scaleMax * 1.3) * FIREWORK_FLASH_SCALE_MULT * scaleMult;
    flashSprite.scale.setScalar(flashScale);
    group.add(flashSprite);

    const allMaterials = [flashMaterial];

    const tl = gsap.timeline({
      onComplete: () => {
        this._active.delete(entry);
        dispose();
      },
    });

    tl.to(flashMaterial, { opacity: FIREWORK_FLASH_PEAK_OPACITY * opacityMult, duration: FIREWORK_FLASH_DURATION * 0.4, ease: "power1.out" }, 0);
    tl.to(flashMaterial, { opacity: 0, duration: FIREWORK_FLASH_DURATION * 0.6, ease: "power1.in" }, FIREWORK_FLASH_DURATION * 0.4);

    const mainSprites = this._buildBurstLayer(tl, group, {
      particleCount,
      radiusMin,
      radiusMax,
      scaleMin,
      scaleMax,
      duration,
      peakOpacity: FIREWORK_BURST_PEAK_OPACITY * opacityMult,
      colorAt,
      streakFraction: FIREWORK_STREAK_FRACTION,
      shape,
      startAt: 0,
    });

    const secondarySprites = this._buildBurstLayer(tl, group, {
      particleCount: Math.max(1, Math.round(particleCount * FIREWORK_SECONDARY_SPARK_COUNT_FRACTION)),
      radiusMin: radiusMin * FIREWORK_SECONDARY_SPARK_RADIUS_MULT,
      radiusMax: radiusMax * FIREWORK_SECONDARY_SPARK_RADIUS_MULT,
      scaleMin: scaleMin * FIREWORK_SECONDARY_SPARK_SCALE_MULT,
      scaleMax: scaleMax * FIREWORK_SECONDARY_SPARK_SCALE_MULT,
      duration: duration * FIREWORK_SECONDARY_SPARK_DURATION_MULT,
      peakOpacity: FIREWORK_BURST_PEAK_OPACITY * 0.8 * opacityMult,
      colorAt,
      streakFraction: 0,
      shape,
      startAt: FIREWORK_SECONDARY_SPARK_DELAY,
    });

    const residualSprites = this._buildBurstLayer(tl, group, {
      particleCount: Math.max(1, Math.round(particleCount * FIREWORK_RESIDUAL_COUNT_FRACTION)),
      radiusMin: radiusMin * FIREWORK_RESIDUAL_RADIUS_MULT,
      radiusMax: radiusMax * FIREWORK_RESIDUAL_RADIUS_MULT,
      scaleMin: scaleMin * FIREWORK_RESIDUAL_SCALE_MULT,
      scaleMax: scaleMax * FIREWORK_RESIDUAL_SCALE_MULT,
      duration: duration * FIREWORK_RESIDUAL_DURATION_MULT,
      peakOpacity: FIREWORK_RESIDUAL_PEAK_OPACITY * opacityMult,
      colorAt,
      streakFraction: 0,
      shape,
      startAt: 0,
    });

    [...mainSprites, ...secondarySprites, ...residualSprites].forEach(({ sprite }) => allMaterials.push(sprite.material));

    const dispose = () => {
      allMaterials.forEach((material) => material.dispose());
      this.scene.remove(group);
    };

    // A fresh, independent tracking entry for the burst itself — kept
    // separate from the rocket/trail's own (already-completed-by-now)
    // entry so `_active.size` (and therefore the maxConcurrent gate)
    // reflects the burst's real, longer lifetime rather than the much
    // shorter rocket-rise phase that preceded it.
    const entry = { tl, dispose };
    this._active.add(entry);
  }

  // ===========================
  // Cinematic sequence — the "blow out the candles" emotional-climax
  // moment. Called once by StandardCandleBlowout.js. Escalates through
  // FIREWORK_CINEMATIC_WAVES, sustains briefly at a raised
  // maxConcurrent, then restores the ambient spawner's own lower cap and
  // resumes it — never leaves the scene without fireworks entirely.
  // Idempotent: a second call while already running is a no-op, so
  // StandardCandleBlowout's own "exactly once" interaction guarantee
  // isn't this file's responsibility to re-enforce.
  // ===========================
  playCinematicSequence() {
    if (this._cinematicActive) return;
    this._cinematicActive = true;

    this._maxConcurrent =
      window.innerWidth < FIREWORK_MOBILE_BREAKPOINT
        ? FIREWORK_CINEMATIC_MAX_CONCURRENT_MOBILE
        : FIREWORK_CINEMATIC_MAX_CONCURRENT_DESKTOP;

    // The ambient recursive spawner is paused for the duration of the
    // scripted sequence below, so its own timing never coincidentally
    // overlaps/competes with the authored escalation — restored via
    // _endCinematicSequence() once the sustain window finishes.
    if (this._spawnCall) this._spawnCall.kill();

    FIREWORK_CINEMATIC_WAVES.forEach((wave) => {
      for (let i = 0; i < wave.count; i++) {
        const jitter = i * gsap.utils.random(FIREWORK_CINEMATIC_WAVE_SPAWN_STAGGER_MIN, FIREWORK_CINEMATIC_WAVE_SPAWN_STAGGER_MAX);
        this._cinematicTimers.push(gsap.delayedCall(wave.at + jitter, () => this._trySpawnCinematic()));
      }
    });

    const lastWave = FIREWORK_CINEMATIC_WAVES[FIREWORK_CINEMATIC_WAVES.length - 1];
    const sustainStart = lastWave.at + FIREWORK_CINEMATIC_SUSTAIN_DELAY_AFTER_LAST_WAVE;

    this._cinematicTimers.push(
      gsap.delayedCall(sustainStart, () => {
        const deadline = Date.now() + FIREWORK_CINEMATIC_SUSTAIN_DURATION * 1000;
        this._runSustainLoop(deadline);
      }),
    );
  }

  _trySpawnCinematic() {
    if (this._active.size >= this._maxConcurrent) return;

    const tier = this._pickWeighted(FIREWORK_TIER_WEIGHTS);
    const shape = this._pickWeighted(FIREWORK_SHAPE_WEIGHTS);

    this._spawnFirework({
      tier,
      shape,
      coverage: FIREWORK_CINEMATIC_SCREEN_COVERAGE,
      nyMin: FIREWORK_CINEMATIC_NY_MIN,
      nyMax: FIREWORK_CINEMATIC_NY_MAX,
      exclusionX: FIREWORK_CINEMATIC_EXCLUSION_RADIUS_X,
      exclusionY: FIREWORK_CINEMATIC_EXCLUSION_RADIUS_Y,
      radiusMult: FIREWORK_CINEMATIC_RADIUS_MULT,
      scaleMult: FIREWORK_CINEMATIC_SCALE_MULT,
    });
  }

  // A brief sustained peak once the scripted waves finish — still at
  // the cinematic tier's own raised maxConcurrent — before easing back
  // down to the ambient cadence. Recurses via gsap.delayedCall (the
  // same idiom _scheduleNextSpawn() already uses) until `deadline`
  // (a real Date.now() timestamp, since this needs to survive across
  // however many recursive calls that turns out to be) passes.
  _runSustainLoop(deadline) {
    this._trySpawnCinematic();

    if (Date.now() >= deadline) {
      this._endCinematicSequence();
      return;
    }

    const delay = gsap.utils.random(FIREWORK_CINEMATIC_SUSTAIN_INTERVAL_MIN, FIREWORK_CINEMATIC_SUSTAIN_INTERVAL_MAX);
    this._cinematicTimers.push(gsap.delayedCall(delay, () => this._runSustainLoop(deadline)));
  }

  _endCinematicSequence() {
    this._cinematicActive = false;
    this._maxConcurrent = this._ambientMaxConcurrent;
    this._scheduleNextSpawn();
  }

  // Safe to call more than once — cancels every spawner/cinematic timer
  // first (so no further firework can start), kills every in-flight
  // rocket/burst's own timeline directly (not just its tweens, so no
  // onComplete can fire afterward and double-dispose), then explicitly
  // disposes each one's own sprite(s)/material(s) itself — killing a
  // timeline never fires its onComplete, so this file owns cleanup for
  // whatever was still mid-flight, whether that's a rocket still rising
  // or a burst still radiating.
  destroy() {
    if (this._startAt) this._startAt.kill();
    if (this._spawnCall) this._spawnCall.kill();
    this._cinematicTimers.forEach((timer) => timer.kill());
    this._cinematicTimers = [];

    this._active.forEach((entry) => {
      entry.tl?.kill();
      entry.dispose();
    });
    this._active.clear();
  }
}
