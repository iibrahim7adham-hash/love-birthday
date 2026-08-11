import * as THREE from "three";
import gsap from "gsap";

import {
  ATMOSPHERE_BACKGROUND_CENTER_COLOR,
  ATMOSPHERE_BACKGROUND_EDGE_COLOR,
  ATMOSPHERE_BACKGROUND_TEXTURE_SIZE,
  ATMOSPHERE_BACKGROUND_GRADIENT_RADIUS_FRACTION,
  ATMOSPHERE_HALO_POSITION,
  ATMOSPHERE_HALO_LAYERS,
  ATMOSPHERE_GROUND_GLOW_COLOR,
  ATMOSPHERE_GROUND_GLOW_OPACITY,
  ATMOSPHERE_GROUND_GLOW_RADIUS,
  ATMOSPHERE_GROUND_GLOW_Y,
  ATMOSPHERE_MOBILE_BREAKPOINT,
  ATMOSPHERE_TABLET_BREAKPOINT,
  ATMOSPHERE_STAR_ZONES,
  ATMOSPHERE_STAR_ZONE_JITTER_X,
  ATMOSPHERE_STAR_ZONE_JITTER_Y,
  ATMOSPHERE_STAR_COUNT_DESKTOP,
  ATMOSPHERE_STAR_COUNT_TABLET,
  ATMOSPHERE_STAR_COUNT_MOBILE,
  ATMOSPHERE_PARTICLE_MIN_DEPTH,
  ATMOSPHERE_PARTICLE_MAX_DEPTH,
  ATMOSPHERE_PARTICLE_SCREEN_COVERAGE,
  ATMOSPHERE_PARTICLE_EXCLUSION_RADIUS_X,
  ATMOSPHERE_PARTICLE_EXCLUSION_RADIUS_Y,
  ATMOSPHERE_PARTICLE_MIN_SCALE,
  ATMOSPHERE_PARTICLE_MAX_SCALE,
  ATMOSPHERE_PARTICLE_MIN_OPACITY,
  ATMOSPHERE_PARTICLE_MAX_OPACITY,
  ATMOSPHERE_PARTICLE_COLORS,
  ATMOSPHERE_PARTICLE_DRIFT_AMOUNT,
  ATMOSPHERE_PARTICLE_DRIFT_SPEED_MIN,
  ATMOSPHERE_PARTICLE_DRIFT_SPEED_MAX,
  ATMOSPHERE_STAR_TIER_BACKGROUND_FRACTION,
  ATMOSPHERE_STAR_TIER_MIDGROUND_FRACTION,
  ATMOSPHERE_STAR_TWINKLE_CHANCE,
  ATMOSPHERE_STAR_TWINKLE_SPEED_MIN,
  ATMOSPHERE_STAR_TWINKLE_SPEED_MAX,
  ATMOSPHERE_STAR_TWINKLE_STRENGTH,
  ATMOSPHERE_SPARKLE_COUNT_DESKTOP,
  ATMOSPHERE_SPARKLE_COUNT_TABLET,
  ATMOSPHERE_SPARKLE_COUNT_MOBILE,
  ATMOSPHERE_SPARKLE_MIN_SCALE,
  ATMOSPHERE_SPARKLE_MAX_SCALE,
  ATMOSPHERE_SPARKLE_MIN_OPACITY,
  ATMOSPHERE_SPARKLE_MAX_OPACITY,
  ATMOSPHERE_SPARKLE_COLORS,
  ATMOSPHERE_SPARKLE_TWINKLE_SPEED_MIN,
  ATMOSPHERE_SPARKLE_TWINKLE_SPEED_MAX,
  ATMOSPHERE_HEART_COUNT_DESKTOP,
  ATMOSPHERE_HEART_COUNT_TABLET,
  ATMOSPHERE_HEART_COUNT_MOBILE,
  ATMOSPHERE_HEART_MIN_DEPTH,
  ATMOSPHERE_HEART_MAX_DEPTH,
  ATMOSPHERE_HEART_SIZES,
  ATMOSPHERE_HEART_MIN_OPACITY,
  ATMOSPHERE_HEART_MAX_OPACITY,
  ATMOSPHERE_HEART_COLORS,
  ATMOSPHERE_HEART_DRIFT_MIN,
  ATMOSPHERE_HEART_DRIFT_MAX,
  ATMOSPHERE_HEART_DRIFT_SPEED_MIN,
  ATMOSPHERE_HEART_DRIFT_SPEED_MAX,
  ATMOSPHERE_HEART_SIDEWAYS_CHANCE,
  ATMOSPHERE_HEART_GLOW_SCALE_MULTIPLIER,
  ATMOSPHERE_HEART_GLOW_OPACITY_MULTIPLIER,
  ATMOSPHERE_DUST_COUNT_DESKTOP,
  ATMOSPHERE_DUST_COUNT_TABLET,
  ATMOSPHERE_DUST_COUNT_MOBILE,
  ATMOSPHERE_DUST_MIN_DEPTH,
  ATMOSPHERE_DUST_MAX_DEPTH,
  ATMOSPHERE_DUST_MIN_SCALE,
  ATMOSPHERE_DUST_MAX_SCALE,
  ATMOSPHERE_DUST_MIN_OPACITY,
  ATMOSPHERE_DUST_MAX_OPACITY,
  ATMOSPHERE_DUST_DRIFT_MIN,
  ATMOSPHERE_DUST_DRIFT_MAX,
  ATMOSPHERE_DUST_DRIFT_SPEED_MIN,
  ATMOSPHERE_DUST_DRIFT_SPEED_MAX,
  ATMOSPHERE_DUST_SIDEWAYS_CHANCE,
  ATMOSPHERE_DUST_COLORS,
  ATMOSPHERE_TRAIL_MAX_CONCURRENT,
  ATMOSPHERE_TRAIL_RESPAWN_DELAY_MIN,
  ATMOSPHERE_TRAIL_RESPAWN_DELAY_MAX,
  ATMOSPHERE_TRAIL_MIN_DEPTH,
  ATMOSPHERE_TRAIL_MAX_DEPTH,
  ATMOSPHERE_TRAIL_SPAN_MIN,
  ATMOSPHERE_TRAIL_SPAN_MAX,
  ATMOSPHERE_TRAIL_DOT_COUNT,
  ATMOSPHERE_TRAIL_DOT_SIZE,
  ATMOSPHERE_TRAIL_DOT_OPACITY,
  ATMOSPHERE_TRAIL_DOT_COLOR,
  ATMOSPHERE_TRAIL_ICON_SCALE,
  ATMOSPHERE_TRAIL_ICON_OPACITY,
  ATMOSPHERE_TRAIL_TRAVEL_DURATION_MIN,
  ATMOSPHERE_TRAIL_TRAVEL_DURATION_MAX,
  ATMOSPHERE_TRAIL_HOLD_DURATION,
  ATMOSPHERE_BOKEH_COUNT_DESKTOP,
  ATMOSPHERE_BOKEH_COUNT_MOBILE,
  ATMOSPHERE_BOKEH_MIN_RADIUS,
  ATMOSPHERE_BOKEH_MAX_RADIUS,
  ATMOSPHERE_BOKEH_MIN_SCALE,
  ATMOSPHERE_BOKEH_MAX_SCALE,
  ATMOSPHERE_BOKEH_OPACITY,
  ATMOSPHERE_BOKEH_PINK_OPACITY,
  ATMOSPHERE_BOKEH_COLORS,
  ATMOSPHERE_BOKEH_DRIFT_AMOUNT,
  ATMOSPHERE_BOKEH_DRIFT_SPEED_MIN,
  ATMOSPHERE_BOKEH_DRIFT_SPEED_MAX,
  ATMOSPHERE_FADE_IN_DURATION,
  CAMERA_HERO_POSITION,
  CAMERA_LOOK_TARGET_Y,
} from "./CakeConstants";
import { getCakeCameraDistanceScale } from "./CakeResponsive";
import { getGlowTexture, getStarburstTexture, getHeartTexture } from "./AtmosphereTextures";
import { STANDARD_ACCENT_PINK_PALE } from "../StandardPalette";

// Purely environmental/ambient dressing for the finished cake scene —
// none of it touches the cake's own geometry/materials, the candle
// system, the camera, or CakeLighting.js's own real lights. Deliberately
// SPARSE this pass (see CakeConstants.js's own comments throughout) —
// the goal is "alive, not busy": plenty of negative space around a
// small number of individually-legible elements, not a dense field.
// Layers, back to front conceptually:
//
//   background gradient -> bokeh -> star field (+ sparkle variant) ->
//   floating dust -> pink hearts -> occasional light trail -> layered
//   central halo -> ground glow
//
// Constructed once by CakeReveal (alongside FormationSparkles/CakeCamera/
// CakeLighting), everything starts fully transparent — fadeIn() is
// called from CakeReveal's own master timeline at the "cake begins
// forming" beat, so the atmosphere arrives gradually rather than
// switching on after the fact, and every layer here keeps running for
// the rest of the scene (countdown/intro are earlier stages this never
// touches, but nothing in this file ever stops once started — it's a
// permanent part of the celebration stage, not a one-shot entrance).
export default class CakeAtmosphere {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this._previousBackground = scene.background;

    this._buildBackgroundGradient();
    this.haloLayers = this._buildHaloLayers();
    this.groundGlow = this._buildGroundGlow();
    this.particles = [...this._buildParticles(), ...this._buildSparkles()];
    this.dust = this._buildDust();
    this.hearts = this._buildHearts();
    this.bokeh = this._buildBokeh();

    this._trailTimers = [];
    this._activeTrails = [];
  }

  // Three device tiers (not just mobile/desktop) so tablet gets its own
  // tuned density instead of inheriting the desktop count.
  _densityTier() {
    const width = window.innerWidth;
    if (width < ATMOSPHERE_MOBILE_BREAKPOINT) return "mobile";
    if (width < ATMOSPHERE_TABLET_BREAKPOINT) return "tablet";
    return "desktop";
  }

  _tierValue({ desktop, tablet, mobile }) {
    const tier = this._densityTier();
    if (tier === "mobile") return mobile;
    if (tier === "tablet") return tablet;
    return desktop;
  }

  // Replaces the flat STANDARD_BACKGROUND_COLOR with a very subtle
  // radial gradient (dark warm/plum center, near-black edges) for the
  // duration of this stage — restored to the previous flat color in
  // destroy(). A screen-space canvas texture is the lightest way to get
  // this "corners dark, center faintly warm" vignette: one draw call at
  // construction, zero per-frame cost, no extra geometry/shader.
  _buildBackgroundGradient() {
    const size = ATMOSPHERE_BACKGROUND_TEXTURE_SIZE;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    const gradient = ctx.createRadialGradient(
      size / 2,
      size * 0.42,
      0,
      size / 2,
      size * 0.42,
      size * ATMOSPHERE_BACKGROUND_GRADIENT_RADIUS_FRACTION,
    );
    gradient.addColorStop(0, ATMOSPHERE_BACKGROUND_CENTER_COLOR);
    gradient.addColorStop(1, ATMOSPHERE_BACKGROUND_EDGE_COLOR);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    this._backgroundTexture = new THREE.CanvasTexture(canvas);
    // This texture carries actual display color (not just a grayscale
    // alpha mask like the glow sprites below), so it needs the same
    // explicit sRGB tagging love/stickers/PhotoStickerTexture.js's own
    // photo textures already use to render correctly through the
    // renderer's sRGB output.
    this._backgroundTexture.colorSpace = THREE.SRGBColorSpace;

    this.scene.background = this._backgroundTexture;
  }

  // The central atmospheric glow behind the cake — three soft additive
  // sprites (ivory core, gold mid, pale-pink outer — see
  // ATMOSPHERE_HALO_LAYERS) rather than one flat-colored sprite, each at
  // a small random offset from the shared anchor so they overlap
  // irregularly instead of stacking into one crisp circle. The result
  // reads as an uneven cloud of warm light rather than a visible
  // spotlight.
  _buildHaloLayers() {
    return ATMOSPHERE_HALO_LAYERS.map((layer, index) => {
      const material = new THREE.SpriteMaterial({
        map: getGlowTexture(),
        color: new THREE.Color(layer.color),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const sprite = new THREE.Sprite(material);
      const offset = gsap.utils.random(-0.3, 0.3);

      sprite.position.set(
        ATMOSPHERE_HALO_POSITION.x + offset * (index + 1),
        ATMOSPHERE_HALO_POSITION.y + offset * 0.5,
        ATMOSPHERE_HALO_POSITION.z,
      );
      sprite.scale.setScalar(layer.scale);

      this.scene.add(sprite);
      return { sprite, targetOpacity: layer.opacity };
    });
  }

  // A flat, faint warm pool of light lying under the cake — a mesh
  // rather than a sprite (a sprite always faces the camera, which would
  // make a "pool on the ground" look wrong from this camera's angle),
  // using the same glow texture as a lightweight stand-in for a real
  // ground-reflection pass.
  _buildGroundGlow() {
    const geometry = new THREE.CircleGeometry(ATMOSPHERE_GROUND_GLOW_RADIUS, 32);
    const material = new THREE.MeshBasicMaterial({
      map: getGlowTexture(),
      color: new THREE.Color(ATMOSPHERE_GROUND_GLOW_COLOR),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = ATMOSPHERE_GROUND_GLOW_Y;

    this.scene.add(mesh);
    return mesh;
  }

  // The star field — deliberately sparse, spread across
  // ATMOSPHERE_STAR_ZONES's own seven named screen zones (round-robin by
  // index) rather than pure independent randomness, so the whole sky
  // reads as covered at a low count instead of risking a chance clump
  // near the cake. Each star also rolls one of three depth tiers
  // (background/midground/foreground), biasing its own scale/opacity
  // into that tier's band. Only a fraction of the foreground tier
  // twinkles (see update()).
  _buildParticles() {
    const TIER_BANDS = {
      background: { scale: [0, 0.35], opacity: [0, 0.3] },
      midground: { scale: [0.3, 0.7], opacity: [0.25, 0.65] },
      foreground: { scale: [0.65, 1], opacity: [0.55, 1] },
    };

    const count = this._tierValue({
      desktop: ATMOSPHERE_STAR_COUNT_DESKTOP,
      tablet: ATMOSPHERE_STAR_COUNT_TABLET,
      mobile: ATMOSPHERE_STAR_COUNT_MOBILE,
    });

    const basis = this._computeReferenceCameraBasis();
    const particles = [];

    for (let i = 0; i < count; i++) {
      const zone = ATMOSPHERE_STAR_ZONES[i % ATMOSPHERE_STAR_ZONES.length];
      const tierRoll = Math.random();
      const tier =
        tierRoll < ATMOSPHERE_STAR_TIER_BACKGROUND_FRACTION
          ? "background"
          : tierRoll < ATMOSPHERE_STAR_TIER_BACKGROUND_FRACTION + ATMOSPHERE_STAR_TIER_MIDGROUND_FRACTION
            ? "midground"
            : "foreground";
      const band = TIER_BANDS[tier];

      const color = ATMOSPHERE_PARTICLE_COLORS[i % ATMOSPHERE_PARTICLE_COLORS.length];
      const material = new THREE.SpriteMaterial({
        map: getGlowTexture(),
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const sprite = new THREE.Sprite(material);
      const basePos = this._zoneStarPosition(basis, zone);
      const baseScale = gsap.utils.interpolate(
        ATMOSPHERE_PARTICLE_MIN_SCALE,
        ATMOSPHERE_PARTICLE_MAX_SCALE,
        gsap.utils.random(...band.scale),
      );

      sprite.position.copy(basePos);
      sprite.scale.setScalar(baseScale);

      this.scene.add(sprite);

      const twinkles = tier === "foreground" && Math.random() < ATMOSPHERE_STAR_TWINKLE_CHANCE;

      particles.push({
        sprite,
        basePos,
        baseScale,
        targetOpacity: gsap.utils.interpolate(
          ATMOSPHERE_PARTICLE_MIN_OPACITY,
          ATMOSPHERE_PARTICLE_MAX_OPACITY,
          gsap.utils.random(...band.opacity),
        ),
        phase: Math.random() * Math.PI * 2,
        speed: gsap.utils.random(ATMOSPHERE_PARTICLE_DRIFT_SPEED_MIN, ATMOSPHERE_PARTICLE_DRIFT_SPEED_MAX),
        twinkles,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: twinkles ? gsap.utils.random(ATMOSPHERE_STAR_TWINKLE_SPEED_MIN, ATMOSPHERE_STAR_TWINKLE_SPEED_MAX) : 0,
      });
    }

    return particles;
  }

  // Sparkles — a texture/behavior variant of the star field above
  // (getStarburstTexture()'s own 4-point glint shape instead of the
  // plain glow dot, always twinkling, same zone distribution) rather
  // than a separate particle manager. A very small count per the brief.
  _buildSparkles() {
    const count = this._tierValue({
      desktop: ATMOSPHERE_SPARKLE_COUNT_DESKTOP,
      tablet: ATMOSPHERE_SPARKLE_COUNT_TABLET,
      mobile: ATMOSPHERE_SPARKLE_COUNT_MOBILE,
    });

    const basis = this._computeReferenceCameraBasis();
    const sparkles = [];

    for (let i = 0; i < count; i++) {
      const zone = ATMOSPHERE_STAR_ZONES[i % ATMOSPHERE_STAR_ZONES.length];
      const color = ATMOSPHERE_SPARKLE_COLORS[i % ATMOSPHERE_SPARKLE_COLORS.length];
      const material = new THREE.SpriteMaterial({
        map: getStarburstTexture(),
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const sprite = new THREE.Sprite(material);
      const basePos = this._zoneStarPosition(basis, zone);
      const baseScale = gsap.utils.random(ATMOSPHERE_SPARKLE_MIN_SCALE, ATMOSPHERE_SPARKLE_MAX_SCALE);

      sprite.position.copy(basePos);
      sprite.scale.setScalar(baseScale);
      this.scene.add(sprite);

      sparkles.push({
        sprite,
        basePos,
        baseScale,
        targetOpacity: gsap.utils.random(ATMOSPHERE_SPARKLE_MIN_OPACITY, ATMOSPHERE_SPARKLE_MAX_OPACITY),
        phase: Math.random() * Math.PI * 2,
        speed: gsap.utils.random(ATMOSPHERE_PARTICLE_DRIFT_SPEED_MIN, ATMOSPHERE_PARTICLE_DRIFT_SPEED_MAX),
        twinkles: true,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: gsap.utils.random(ATMOSPHERE_SPARKLE_TWINKLE_SPEED_MIN, ATMOSPHERE_SPARKLE_TWINKLE_SPEED_MAX),
      });
    }

    return sparkles;
  }

  // A stable forward/right/up basis matching the camera's own eventual
  // settled framing rather than its live transform — CakeAtmosphere is
  // constructed before CakeCamera's own dolly/pullback animation has
  // run, so reading camera.position/quaternion directly at this point
  // would still be the pre-dolly wide framing. Reuses
  // getCakeCameraDistanceScale(), the exact same responsive helper
  // CakeCamera.js itself applies to CAMERA_HERO_POSITION, so this always
  // agrees with wherever the camera actually ends up on any aspect
  // ratio.
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

  // The frustum's own half-width/height at a given depth, from the
  // camera's live fov/aspect — shared by every "place something inside
  // the visible frame" helper below so the whole atmosphere always
  // reaches every edge/corner regardless of viewport rather than living
  // in a fixed world-space radius.
  _frameHalfExtents(depth) {
    const fovRad = THREE.MathUtils.degToRad(this.camera.fov);
    const halfHeight = depth * Math.tan(fovRad / 2);
    const halfWidth = halfHeight * this.camera.aspect;
    return { halfWidth, halfHeight };
  }

  // Converts a normalized screen-space offset (nx, ny, each roughly
  // -1..1) at a given depth into a world-space point relative to the
  // reference camera basis — the shared geometry step every placement
  // helper in this file (zone stars, dust, hearts, trails) builds on.
  _positionFromNormalized(basis, nx, ny, depth) {
    const { halfWidth, halfHeight } = this._frameHalfExtents(depth);

    return basis.position
      .clone()
      .add(basis.forward.clone().multiplyScalar(depth))
      .add(basis.right.clone().multiplyScalar(nx * halfWidth))
      .add(basis.up.clone().multiplyScalar(ny * halfHeight));
  }

  // A star's position within its own assigned zone: the zone's own
  // center plus a small random jitter, at a random depth, re-rolled a
  // few times if it happens to land inside the small central exclusion
  // ellipse around the cake (a safety net — none of the seven zones are
  // centered there, but a large jitter could still reach it).
  _zoneStarPosition(basis, zone) {
    let nx = zone.nx;
    let ny = zone.ny;
    let depth = ATMOSPHERE_PARTICLE_MIN_DEPTH;

    for (let attempt = 0; attempt < 6; attempt++) {
      depth = gsap.utils.random(ATMOSPHERE_PARTICLE_MIN_DEPTH, ATMOSPHERE_PARTICLE_MAX_DEPTH);
      nx = gsap.utils.clamp(
        -ATMOSPHERE_PARTICLE_SCREEN_COVERAGE,
        ATMOSPHERE_PARTICLE_SCREEN_COVERAGE,
        zone.nx + gsap.utils.random(-ATMOSPHERE_STAR_ZONE_JITTER_X, ATMOSPHERE_STAR_ZONE_JITTER_X),
      );
      ny = gsap.utils.clamp(
        -ATMOSPHERE_PARTICLE_SCREEN_COVERAGE,
        ATMOSPHERE_PARTICLE_SCREEN_COVERAGE,
        zone.ny + gsap.utils.random(-ATMOSPHERE_STAR_ZONE_JITTER_Y, ATMOSPHERE_STAR_ZONE_JITTER_Y),
      );

      const insideExclusion =
        (nx / ATMOSPHERE_PARTICLE_EXCLUSION_RADIUS_X) ** 2 + (ny / ATMOSPHERE_PARTICLE_EXCLUSION_RADIUS_Y) ** 2 < 1;

      if (!insideExclusion) break;
    }

    return this._positionFromNormalized(basis, nx, ny, depth);
  }

  // A fully random point somewhere in the visible frame at a random
  // depth within the given range, re-rolled if it lands inside the
  // central cake-exclusion ellipse — used by hearts/dust, which (unlike
  // the star field) want organic scatter rather than guaranteed zone
  // coverage.
  _randomExcludedPosition(basis, minDepth, maxDepth) {
    let nx = 0;
    let ny = 0;
    let depth = minDepth;

    for (let attempt = 0; attempt < 8; attempt++) {
      depth = gsap.utils.random(minDepth, maxDepth);
      nx = gsap.utils.random(-1, 1) * ATMOSPHERE_PARTICLE_SCREEN_COVERAGE;
      ny = gsap.utils.random(-1, 1) * ATMOSPHERE_PARTICLE_SCREEN_COVERAGE;

      const insideExclusion =
        (nx / ATMOSPHERE_PARTICLE_EXCLUSION_RADIUS_X) ** 2 + (ny / ATMOSPHERE_PARTICLE_EXCLUSION_RADIUS_Y) ** 2 < 1;

      if (!insideExclusion) break;
    }

    return this._positionFromNormalized(basis, nx, ny, depth);
  }

  // Shared by dust and hearts: repositions `item.sprite` to a fresh
  // random point (see _randomExcludedPosition()) within the given depth
  // range.
  _resetFramePosition(item, minDepth, maxDepth) {
    item.sprite.position.copy(this._randomExcludedPosition(item.basis, minDepth, maxDepth));
  }

  // Tiny, closer, continuously-drifting light particles — a distinct
  // layer from both the star field and the hearts. Built as a reusable
  // pool of sprites (never created/destroyed after this), each one's
  // actual movement driven entirely by _driftDust()'s own recursive GSAP
  // tween rather than per-frame math in update().
  _buildDust() {
    const count = this._tierValue({
      desktop: ATMOSPHERE_DUST_COUNT_DESKTOP,
      tablet: ATMOSPHERE_DUST_COUNT_TABLET,
      mobile: ATMOSPHERE_DUST_COUNT_MOBILE,
    });

    const basis = this._computeReferenceCameraBasis();
    const dust = [];

    for (let i = 0; i < count; i++) {
      const color = ATMOSPHERE_DUST_COLORS[i % ATMOSPHERE_DUST_COLORS.length];
      const material = new THREE.SpriteMaterial({
        map: getGlowTexture(),
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const sprite = new THREE.Sprite(material);
      sprite.scale.setScalar(gsap.utils.random(ATMOSPHERE_DUST_MIN_SCALE, ATMOSPHERE_DUST_MAX_SCALE));
      this.scene.add(sprite);

      const item = {
        sprite,
        basis,
        targetOpacity: gsap.utils.random(ATMOSPHERE_DUST_MIN_OPACITY, ATMOSPHERE_DUST_MAX_OPACITY),
        tween: null,
      };
      this._resetFramePosition(item, ATMOSPHERE_DUST_MIN_DEPTH, ATMOSPHERE_DUST_MAX_DEPTH);
      dust.push(item);
    }

    return dust;
  }

  // One dust particle's own slow one-direction drift (mostly upward,
  // occasionally sideways), travelling a distance drawn from the SAME
  // range every cycle — sometimes small enough to read as "almost
  // stationary", sometimes a bit further, per the brief's own "some can
  // remain almost stationary" without needing a separate code path.
  // Fades out just before finishing, silently repositions to a fresh
  // random spot, fades back in, and schedules its own next leg —
  // recycled indefinitely rather than growing its position forever.
  _driftDust(item) {
    const sideways = Math.random() < ATMOSPHERE_DUST_SIDEWAYS_CHANCE;
    const dir = new THREE.Vector3(sideways ? (Math.random() < 0.5 ? -1 : 1) : 0, sideways ? 0 : 1, 0);
    const speed = gsap.utils.random(ATMOSPHERE_DUST_DRIFT_SPEED_MIN, ATMOSPHERE_DUST_DRIFT_SPEED_MAX);
    const travelDistance = gsap.utils.random(ATMOSPHERE_DUST_DRIFT_MIN, ATMOSPHERE_DUST_DRIFT_MAX);
    const duration = travelDistance / speed;
    const target = item.sprite.position.clone().addScaledVector(dir, travelDistance);

    item.tween = gsap
      .timeline()
      .to(item.sprite.position, { x: target.x, y: target.y, z: target.z, duration, ease: "none" }, 0)
      .to(item.sprite.material, { opacity: 0, duration: duration * 0.2, ease: "power1.in" }, duration * 0.8)
      .call(
        () => {
          this._resetFramePosition(item, ATMOSPHERE_DUST_MIN_DEPTH, ATMOSPHERE_DUST_MAX_DEPTH);
          gsap.set(item.sprite.material, { opacity: 0 });
          gsap.to(item.sprite.material, { opacity: item.targetOpacity, duration: duration * 0.25, ease: "power1.out" });
          this._driftDust(item);
        },
        null,
        duration,
      );
  }

  // Small glowing pink hearts, used sparingly — see the constants file's
  // own comment on why the pool size itself IS the "visible at once"
  // count. Built as a reusable pool (same architecture as dust), placed
  // via _randomExcludedPosition() (organic scatter, not the star field's
  // zone stratification) so they never read as arranged in a pattern.
  //
  // Each heart is now a small THREE.Group of two sprites — the heart
  // shape itself, plus a larger, softer companion sprite behind it using
  // the same shared glow texture the halo/bokeh already use (tinted the
  // heart's own color, opacity always a fraction of the heart's own) —
  // this is what gives it a genuine soft glow instead of a flat, hard-
  // edged silhouette, without introducing a new texture or a blur pass.
  // `item.sprite` is kept as an alias for `item.group` purely so the
  // shared `_resetFramePosition()` helper (which only ever touches
  // `.position`) works unmodified for both dust and hearts.
  _buildHearts() {
    const count = this._tierValue({
      desktop: ATMOSPHERE_HEART_COUNT_DESKTOP,
      tablet: ATMOSPHERE_HEART_COUNT_TABLET,
      mobile: ATMOSPHERE_HEART_COUNT_MOBILE,
    });

    const basis = this._computeReferenceCameraBasis();
    const hearts = [];

    for (let i = 0; i < count; i++) {
      const color = ATMOSPHERE_HEART_COLORS[i % ATMOSPHERE_HEART_COLORS.length];
      const heartScale = this._pickHeartScale();

      const glowMaterial = new THREE.SpriteMaterial({
        map: getGlowTexture(),
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const glowSprite = new THREE.Sprite(glowMaterial);
      glowSprite.scale.setScalar(heartScale * ATMOSPHERE_HEART_GLOW_SCALE_MULTIPLIER);

      const heartMaterial = new THREE.SpriteMaterial({
        map: getHeartTexture(),
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const heartSprite = new THREE.Sprite(heartMaterial);
      heartSprite.scale.setScalar(heartScale);

      const group = new THREE.Group();
      group.add(glowSprite);
      group.add(heartSprite);
      this.scene.add(group);

      const item = {
        group,
        sprite: group,
        heartSprite,
        glowSprite,
        heartMaterial,
        glowMaterial,
        basis,
        targetOpacity: gsap.utils.random(ATMOSPHERE_HEART_MIN_OPACITY, ATMOSPHERE_HEART_MAX_OPACITY),
        tween: null,
      };
      this._resetFramePosition(item, ATMOSPHERE_HEART_MIN_DEPTH, ATMOSPHERE_HEART_MAX_DEPTH);
      hearts.push(item);
    }

    return hearts;
  }

  // Weighted pick across ATMOSPHERE_HEART_SIZES (mostly tiny, a few
  // small, at most an occasional larger heart).
  _pickHeartScale() {
    const roll = Math.random();
    let cumulative = 0;

    for (const size of ATMOSPHERE_HEART_SIZES) {
      cumulative += size.weight;
      if (roll <= cumulative) return size.scale;
    }

    return ATMOSPHERE_HEART_SIZES[ATMOSPHERE_HEART_SIZES.length - 1].scale;
  }

  // One heart's own continuous lifecycle: fade in -> gently float/drift
  // -> fade out -> silently reposition elsewhere -> repeat. The drift
  // direction is re-rolled every cycle (mostly upward-leaning, sometimes
  // sideways — see ATMOSPHERE_HEART_SIDEWAYS_CHANCE), so the same heart
  // doesn't always move the same way twice in a row, and different
  // hearts in the pool naturally end up out of phase with each other
  // (each starts its own first cycle at a random delay from fadeIn()),
  // which is what keeps the pool from ever reading as "all hearts
  // appearing/moving together".
  _cycleHeart(item) {
    const sideways = Math.random() < ATMOSPHERE_HEART_SIDEWAYS_CHANCE;
    const dir = sideways
      ? new THREE.Vector3(Math.random() < 0.5 ? -1 : 1, gsap.utils.random(-0.25, 0.25), 0).normalize()
      : new THREE.Vector3(gsap.utils.random(-0.35, 0.35), 1, 0).normalize();

    const speed = gsap.utils.random(ATMOSPHERE_HEART_DRIFT_SPEED_MIN, ATMOSPHERE_HEART_DRIFT_SPEED_MAX);
    const travelDistance = gsap.utils.random(ATMOSPHERE_HEART_DRIFT_MIN, ATMOSPHERE_HEART_DRIFT_MAX);
    const duration = travelDistance / speed;
    const target = item.group.position.clone().addScaledVector(dir, travelDistance);
    const glowTargetOpacity = item.targetOpacity * ATMOSPHERE_HEART_GLOW_OPACITY_MULTIPLIER;

    const tl = gsap.timeline({
      onComplete: () => {
        this._resetFramePosition(item, ATMOSPHERE_HEART_MIN_DEPTH, ATMOSPHERE_HEART_MAX_DEPTH);
        this._cycleHeart(item);
      },
    });
    item.tween = tl;

    tl.to(item.group.position, { x: target.x, y: target.y, z: target.z, duration, ease: "sine.inOut" }, 0);
    tl.to(item.heartMaterial, { opacity: item.targetOpacity, duration: duration * 0.3, ease: "sine.out" }, 0);
    tl.to(item.glowMaterial, { opacity: glowTargetOpacity, duration: duration * 0.3, ease: "sine.out" }, 0);
    tl.to(item.heartMaterial, { opacity: 0, duration: duration * 0.35, ease: "sine.in" }, duration * 0.65);
    tl.to(item.glowMaterial, { opacity: 0, duration: duration * 0.35, ease: "sine.in" }, duration * 0.65);
  }

  // A very small number of delicate curved paths (see
  // ATMOSPHERE_TRAIL_MAX_CONCURRENT — at most one at a time), each a thin
  // dotted line of tiny static points (one THREE.Points per trail — a
  // single draw call) plus one small heart/sparkle/glow-dot sprite
  // travelling along it over time via a plain GSAP-tweened `t` value
  // sampling the curve (curve.getPointAt(t)) rather than a per-frame
  // manual path-follow.
  _startTrailSlot(slotIndex) {
    const delay = gsap.utils.random(0, ATMOSPHERE_TRAIL_RESPAWN_DELAY_MAX);
    this._trailTimers[slotIndex] = gsap.delayedCall(delay, () => this._spawnTrail(slotIndex));
  }

  _spawnTrail(slotIndex) {
    const basis = this._computeReferenceCameraBasis();
    const depth = gsap.utils.random(ATMOSPHERE_TRAIL_MIN_DEPTH, ATMOSPHERE_TRAIL_MAX_DEPTH);

    const startNx = gsap.utils.random(-1, 1) * ATMOSPHERE_PARTICLE_SCREEN_COVERAGE;
    const startNy = gsap.utils.random(-1, 1) * ATMOSPHERE_PARTICLE_SCREEN_COVERAGE;
    const start = this._positionFromNormalized(basis, startNx, startNy, depth);

    const span = gsap.utils.random(ATMOSPHERE_TRAIL_SPAN_MIN, ATMOSPHERE_TRAIL_SPAN_MAX);
    const angle = gsap.utils.random(0, Math.PI * 2);
    const end = start
      .clone()
      .addScaledVector(basis.right, Math.cos(angle) * span)
      .addScaledVector(basis.up, Math.sin(angle) * span);

    const mid = start
      .clone()
      .lerp(end, 0.5)
      .addScaledVector(basis.up, gsap.utils.random(-0.35, 0.35))
      .addScaledVector(basis.right, gsap.utils.random(-0.2, 0.2));

    const curve = new THREE.CatmullRomCurve3([start, mid, end]);

    const dotPositions = new Float32Array(ATMOSPHERE_TRAIL_DOT_COUNT * 3);
    curve.getPoints(ATMOSPHERE_TRAIL_DOT_COUNT - 1).forEach((point, i) => {
      dotPositions[i * 3] = point.x;
      dotPositions[i * 3 + 1] = point.y;
      dotPositions[i * 3 + 2] = point.z;
    });

    const dotGeometry = new THREE.BufferGeometry();
    dotGeometry.setAttribute("position", new THREE.BufferAttribute(dotPositions, 3));
    const dotMaterial = new THREE.PointsMaterial({
      map: getGlowTexture(),
      color: new THREE.Color(ATMOSPHERE_TRAIL_DOT_COLOR),
      size: ATMOSPHERE_TRAIL_DOT_SIZE,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    });
    const dotsObject = new THREE.Points(dotGeometry, dotMaterial);
    this.scene.add(dotsObject);

    const iconRoll = Math.random();
    const iconTexture = iconRoll < 0.4 ? getHeartTexture() : iconRoll < 0.75 ? getStarburstTexture() : getGlowTexture();
    const iconMaterial = new THREE.SpriteMaterial({
      map: iconTexture,
      color: new THREE.Color(ATMOSPHERE_TRAIL_DOT_COLOR),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const iconSprite = new THREE.Sprite(iconMaterial);
    iconSprite.scale.setScalar(ATMOSPHERE_TRAIL_ICON_SCALE);
    iconSprite.position.copy(start);
    this.scene.add(iconSprite);

    const travelDuration = gsap.utils.random(ATMOSPHERE_TRAIL_TRAVEL_DURATION_MIN, ATMOSPHERE_TRAIL_TRAVEL_DURATION_MAX);
    const proxy = { t: 0 };

    const tl = gsap.timeline({
      onComplete: () => {
        dotGeometry.dispose();
        dotMaterial.dispose();
        this.scene.remove(dotsObject);
        iconMaterial.dispose();
        this.scene.remove(iconSprite);
        this._activeTrails[slotIndex] = null;

        const respawnDelay = gsap.utils.random(ATMOSPHERE_TRAIL_RESPAWN_DELAY_MIN, ATMOSPHERE_TRAIL_RESPAWN_DELAY_MAX);
        this._trailTimers[slotIndex] = gsap.delayedCall(respawnDelay, () => this._spawnTrail(slotIndex));
      },
    });

    this._activeTrails[slotIndex] = { dotsObject, dotGeometry, dotMaterial, iconSprite, iconMaterial, tl };

    tl.to(dotMaterial, { opacity: ATMOSPHERE_TRAIL_DOT_OPACITY, duration: travelDuration * 0.25, ease: "power1.out" }, 0);
    tl.to(iconMaterial, { opacity: ATMOSPHERE_TRAIL_ICON_OPACITY, duration: travelDuration * 0.15, ease: "power1.out" }, 0);
    tl.to(
      proxy,
      {
        t: 1,
        duration: travelDuration,
        ease: "sine.inOut",
        onUpdate: () => iconSprite.position.copy(curve.getPointAt(proxy.t)),
      },
      0,
    );
    tl.to(
      [dotMaterial, iconMaterial],
      { opacity: 0, duration: ATMOSPHERE_TRAIL_HOLD_DURATION * 1.4, ease: "power1.in" },
      travelDuration + ATMOSPHERE_TRAIL_HOLD_DURATION,
    );
  }

  // A few large, extremely soft, slow-moving glows well behind the cake
  // for cinematic depth — never more than a handful.
  _buildBokeh() {
    const count = this._densityTier() === "desktop" ? ATMOSPHERE_BOKEH_COUNT_DESKTOP : ATMOSPHERE_BOKEH_COUNT_MOBILE;
    const bokeh = [];

    for (let i = 0; i < count; i++) {
      const color = ATMOSPHERE_BOKEH_COLORS[i % ATMOSPHERE_BOKEH_COLORS.length];
      const isPink = color === STANDARD_ACCENT_PINK_PALE;

      const material = new THREE.SpriteMaterial({
        map: getGlowTexture(),
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const sprite = new THREE.Sprite(material);

      const angle = (i / count) * Math.PI * 2 + gsap.utils.random(-0.4, 0.4);
      const radius = gsap.utils.random(ATMOSPHERE_BOKEH_MIN_RADIUS, ATMOSPHERE_BOKEH_MAX_RADIUS);
      const basePos = new THREE.Vector3(Math.cos(angle) * radius, gsap.utils.random(1.4, 4.2), Math.sin(angle) * radius - radius * 0.5);

      sprite.position.copy(basePos);
      sprite.scale.setScalar(gsap.utils.random(ATMOSPHERE_BOKEH_MIN_SCALE, ATMOSPHERE_BOKEH_MAX_SCALE));

      this.scene.add(sprite);
      bokeh.push({
        sprite,
        basePos,
        targetOpacity: isPink ? ATMOSPHERE_BOKEH_PINK_OPACITY : ATMOSPHERE_BOKEH_OPACITY,
        phase: Math.random() * Math.PI * 2,
        speed: gsap.utils.random(ATMOSPHERE_BOKEH_DRIFT_SPEED_MIN, ATMOSPHERE_BOKEH_DRIFT_SPEED_MAX),
      });
    }

    return bokeh;
  }

  // Fades every atmosphere element in together, each particle/bokeh/dust/
  // heart starting at a slightly different moment within the window so
  // nothing switches on in lockstep — called once, from CakeReveal's own
  // master timeline, at the same cursor its "cake begins forming" state
  // transition already fires at. Dust/hearts' own continuous cycles, and
  // the heart trail, only actually start here (not at construction) —
  // starting them earlier would move an invisible (opacity: 0) sprite
  // for no visible reason. Everything here keeps running for the rest of
  // the scene — this is a permanent layer, not a one-shot entrance.
  fadeIn(duration = ATMOSPHERE_FADE_IN_DURATION) {
    const tl = gsap.timeline();
    this._fadeTimeline = tl;

    this.haloLayers.forEach(({ sprite, targetOpacity }, index) => {
      tl.to(sprite.material, { opacity: targetOpacity, duration: duration * 1.1, ease: "power2.out" }, index * 0.15);
    });

    tl.to(this.groundGlow.material, { opacity: ATMOSPHERE_GROUND_GLOW_OPACITY, duration, ease: "power2.out" }, 0);

    this.particles.forEach(({ sprite, targetOpacity }) => {
      tl.to(
        sprite.material,
        { opacity: targetOpacity, duration: duration * 1.3, ease: "power1.out" },
        gsap.utils.random(0, duration * 0.6),
      );
    });

    this.dust.forEach(({ sprite, targetOpacity }) => {
      tl.to(
        sprite.material,
        { opacity: targetOpacity, duration: duration * 1.5, ease: "power1.out" },
        gsap.utils.random(0, duration * 0.8),
      );
    });

    this.bokeh.forEach(({ sprite, targetOpacity }) => {
      tl.to(
        sprite.material,
        { opacity: targetOpacity, duration: duration * 1.5, ease: "power1.out" },
        gsap.utils.random(0, duration * 0.5),
      );
    });

    this.dust.forEach((item) => this._driftDust(item));

    // Hearts skip fadeIn's own opacity tween — _cycleHeart() already
    // owns their fade in/out, and staggering each heart's own FIRST
    // cycle start (rather than the cycle's own internal fade timing)
    // is what actually prevents every heart appearing at once.
    this.hearts.forEach((item) => {
      gsap.delayedCall(gsap.utils.random(0, duration * 1.2), () => this._cycleHeart(item));
    });

    for (let i = 0; i < ATMOSPHERE_TRAIL_MAX_CONCURRENT; i++) this._startTrailSlot(i);

    return tl;
  }

  // The candle-blowout sequence's own "central atmospheric glow becomes
  // darker / background becomes deeper" beat — tweens the halo layers
  // and ground glow down toward a fraction of their own resting
  // (fadeIn-reached) opacity, never to 0, so the atmosphere reads as
  // dimmer rather than switched off. Stars/hearts/dust/bokeh are
  // deliberately left untouched here (they're already restrained and
  // low-opacity — the brief's own "keep the existing background... do
  // NOT delete them" applies to the whole atmosphere, not just this
  // central glow).
  dim(duration, fraction = 0.35) {
    const tl = gsap.timeline();

    this.haloLayers.forEach(({ sprite, targetOpacity }) => {
      tl.to(sprite.material, { opacity: targetOpacity * fraction, duration, ease: "power2.out" }, 0);
    });
    tl.to(this.groundGlow.material, { opacity: this.groundGlow.material.opacity * fraction, duration, ease: "power2.out" }, 0);

    return tl;
  }

  // Gentle continuous drift for stars/sparkles/bokeh, plus a soft
  // twinkle pulse for the small subset of foreground stars (and every
  // sparkle) marked `twinkles` in _buildParticles()/_buildSparkles() —
  // each at its own random phase/speed, so they brighten/soften/rescale
  // at staggered moments rather than in lockstep. Dust/hearts/trails need
  // no per-frame work here — their own movement is entirely GSAP-tween
  // driven. Called from CakeReveal.update(), the same place CakeCamera's
  // own idle sway already runs from — this keeps running for the rest of
  // the scene, well past the cake's own reveal.
  update(delta) {
    this.particles.forEach((particle) => {
      particle.phase += delta * particle.speed;
      particle.sprite.position.y = particle.basePos.y + Math.sin(particle.phase) * ATMOSPHERE_PARTICLE_DRIFT_AMOUNT;
      particle.sprite.position.x =
        particle.basePos.x + Math.cos(particle.phase * 0.6) * ATMOSPHERE_PARTICLE_DRIFT_AMOUNT * 0.5;

      // Twinkling is only meaningful once the star has actually finished
      // its own fadeIn tween (still owns opacity up to that point) — the
      // opacity check is a cheap proxy for "at/near its resting value"
      // without needing a separate "fade complete" flag.
      if (particle.twinkles && particle.sprite.material.opacity > 0.01) {
        particle.twinklePhase += delta * particle.twinkleSpeed;
        const pulse = (Math.sin(particle.twinklePhase) * 0.5 + 0.5) * ATMOSPHERE_STAR_TWINKLE_STRENGTH;
        particle.sprite.material.opacity = particle.targetOpacity * (1 - ATMOSPHERE_STAR_TWINKLE_STRENGTH * 0.5 + pulse);
        particle.sprite.scale.setScalar(particle.baseScale * (1 + pulse * 0.5));
      }
    });

    this.bokeh.forEach((point) => {
      point.phase += delta * point.speed;
      point.sprite.material.opacity = point.targetOpacity * (0.85 + Math.sin(point.phase) * 0.15);
      point.sprite.position.x = point.basePos.x + Math.sin(point.phase * 0.5) * ATMOSPHERE_BOKEH_DRIFT_AMOUNT;
      point.sprite.position.y = point.basePos.y + Math.cos(point.phase * 0.35) * ATMOSPHERE_BOKEH_DRIFT_AMOUNT * 0.6;
    });
  }

  destroy() {
    if (this._fadeTimeline) this._fadeTimeline.kill();

    this.haloLayers.forEach(({ sprite }) => gsap.killTweensOf(sprite.material));
    gsap.killTweensOf(this.groundGlow.material);
    this.particles.forEach(({ sprite }) => gsap.killTweensOf(sprite.material));
    this.bokeh.forEach(({ sprite }) => gsap.killTweensOf(sprite.material));
    this.dust.forEach((item) => {
      if (item.tween) item.tween.kill();
      gsap.killTweensOf(item.sprite.position);
      gsap.killTweensOf(item.sprite.material);
    });
    this.hearts.forEach((item) => {
      if (item.tween) item.tween.kill();
      gsap.killTweensOf(item.group.position);
      gsap.killTweensOf(item.heartMaterial);
      gsap.killTweensOf(item.glowMaterial);
    });

    this._trailTimers.forEach((timer) => timer && timer.kill());
    this._activeTrails.forEach((trail) => {
      if (!trail) return;
      trail.tl.kill();
      trail.dotGeometry.dispose();
      trail.dotMaterial.dispose();
      this.scene.remove(trail.dotsObject);
      trail.iconMaterial.dispose();
      this.scene.remove(trail.iconSprite);
    });

    this.haloLayers.forEach(({ sprite }) => {
      sprite.material.dispose();
      this.scene.remove(sprite);
    });

    this.groundGlow.geometry.dispose();
    this.groundGlow.material.dispose();
    this.scene.remove(this.groundGlow);

    this.particles.forEach(({ sprite }) => {
      sprite.material.dispose();
      this.scene.remove(sprite);
    });

    this.bokeh.forEach(({ sprite }) => {
      sprite.material.dispose();
      this.scene.remove(sprite);
    });

    this.dust.forEach(({ sprite }) => {
      sprite.material.dispose();
      this.scene.remove(sprite);
    });

    this.hearts.forEach((item) => {
      item.heartMaterial.dispose();
      item.glowMaterial.dispose();
      this.scene.remove(item.group);
    });

    this._backgroundTexture.dispose();
    this.scene.background = this._previousBackground;
  }
}
