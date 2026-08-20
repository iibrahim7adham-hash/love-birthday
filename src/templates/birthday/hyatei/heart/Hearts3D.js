import * as THREE from "three";
import gsap from "gsap";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import heartModel from "../../../../assets/models/heart.glb?url";
import {
  HEARTS_3D_COLORS,
  HEARTS_3D_COUNT_BY_PERFORMANCE,
  HEARTS_3D_EXCLUSION_MAX_ATTEMPTS,
  HEARTS_3D_FALL_DURATION_MAX,
  HEARTS_3D_FALL_DURATION_MIN,
  HEARTS_3D_FALL_EASE,
  HEARTS_3D_FALL_STAGGER_MAX,
  HEARTS_3D_FALL_START_MARGIN,
  HEARTS_3D_FLOAT_AMPLITUDE_MAX,
  HEARTS_3D_FLOAT_AMPLITUDE_MIN,
  HEARTS_3D_FLOAT_SPEED_MAX,
  HEARTS_3D_FLOAT_SPEED_MIN,
  HEARTS_3D_OPACITY,
  HEARTS_3D_APPEAR_DURATION,
  HEARTS_3D_ROTATE_SPEED_MAX,
  HEARTS_3D_SCALE_LARGE_FRACTION,
  HEARTS_3D_SCALE_MEDIUM_FRACTION,
  HEARTS_3D_SCALE_SMALL_FRACTION,
  HEARTS_3D_SPREAD_FRACTION,
  HEARTS_3D_Z_MAX,
  HEARTS_3D_Z_MIN,
} from "../Constants";
import { buildHeartLUT, buildHeartWorldPolygon, heartWorldTransform, isPointInsideHeart } from "./HeartCurve";

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

// The SAME glossy 3D heart model luxury/Environment/Hearts.js floats
// through its own scene (per explicit request — reused as-is, not a
// custom sprite), scattered across the whole visible frame in three
// size tiers, purely decorative on top of HeartFormation's own
// mathematical contour. Real THREE.Mesh clones in their own THREE.Group
// (not a ParticleEngine population), independently re-implemented here
// rather than importing luxury's Hearts.js, per this project's own "one
// template never imports another template's files" convention — only
// the model asset itself is shared. Starts only once both HeartFormation
// has finished forming AND LoveRain has faded (see HyateiScene.js).
export default class Hearts3D {
  constructor({ scene, camera, performanceLevel = "medium", heartWorldHeight }) {
    this.scene = scene;
    this.camera = camera;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.hearts = [];
    this._materials = [];
    this._started = false;

    // The main particle heart's own exact silhouette, in the same world
    // coordinates — so this population can be rejection-sampled to stay
    // OUT of it (on request) via HeartCurve.isPointInsideHeart, the same
    // helper HeartFormation.js's own contour math is built from.
    const lut = buildHeartLUT();
    const transform = heartWorldTransform(lut, heartWorldHeight);
    this._heartPolygon = buildHeartWorldPolygon(lut, transform);

    const loader = new GLTFLoader();
    loader.load(heartModel, (gltf) => this._onLoaded(gltf.scene, performanceLevel));
  }

  _getVisibleBounds() {
    const distance = Math.abs(this.camera.position.z);
    const verticalHalfFovRad = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const halfHeight = Math.tan(verticalHalfFovRad) * distance;
    const halfWidth = halfHeight * this.camera.aspect;
    return { halfWidth, halfHeight };
  }

  _onLoaded(original, performanceLevel) {
    const tiers = HEARTS_3D_COUNT_BY_PERFORMANCE[performanceLevel] ?? HEARTS_3D_COUNT_BY_PERFORMANCE.medium;
    // Fractions of the camera's own visible min(halfWidth, halfHeight) —
    // NOT fixed world-unit numbers — so each heart's on-screen size is
    // consistent across every aspect ratio/device (see
    // HEARTS_3D_SCALE_*_FRACTION in Constants.js for why).
    const { halfWidth, halfHeight } = this._getVisibleBounds();
    const visibleMin = Math.min(halfWidth, halfHeight);

    this._spawnTier(original, tiers.large, HEARTS_3D_SCALE_LARGE_FRACTION, visibleMin);
    this._spawnTier(original, tiers.medium, HEARTS_3D_SCALE_MEDIUM_FRACTION, visibleMin);
    this._spawnTier(original, tiers.small, HEARTS_3D_SCALE_SMALL_FRACTION, visibleMin);

    // playIn() may already have been requested before the (async) model
    // finished loading — start immediately in that case instead of
    // silently missing the cue.
    if (this._started) this._fadeIn();
  }

  _spawnTier(original, count, scaleFractionRange, visibleMin) {
    const { halfWidth, halfHeight } = this._getVisibleBounds();
    const spreadHalfWidth = halfWidth * HEARTS_3D_SPREAD_FRACTION;
    const spreadHalfHeight = halfHeight * HEARTS_3D_SPREAD_FRACTION;

    for (let i = 0; i < count; i++) {
      const heart = original.clone(true);
      const scale = randRange(scaleFractionRange[0], scaleFractionRange[1]) * visibleMin;
      heart.scale.set(scale, scale * randRange(0.95, 1.05), scale);

      // Rejection-sampled OUT of the main heart's own silhouette (2D
      // test — z is irrelevant, the contour is a thin band, not a
      // volume) — bounded attempts, so a tight/edge-case scatter box can
      // never hang; the last attempt is used as a harmless fallback.
      let baseX = 0;
      let baseY = 0;
      for (let attempt = 0; attempt < HEARTS_3D_EXCLUSION_MAX_ATTEMPTS; attempt++) {
        baseX = randRange(-spreadHalfWidth, spreadHalfWidth);
        baseY = randRange(-spreadHalfHeight, spreadHalfHeight);
        if (!isPointInsideHeart(this._heartPolygon, baseX, baseY)) break;
      }

      const baseZ = randRange(HEARTS_3D_Z_MIN, HEARTS_3D_Z_MAX);
      // x/z are already final — only y starts high above the visible top
      // edge, so playIn()'s fall reads as a straight vertical drop (like
      // rain) into an already-chosen spot, not a diagonal swoop.
      heart.position.set(baseX, halfHeight + HEARTS_3D_FALL_START_MARGIN, baseZ);

      heart.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

      const color = HEARTS_3D_COLORS[Math.floor(Math.random() * HEARTS_3D_COLORS.length)];

      heart.traverse((child) => {
        if (!child.isMesh) return;

        child.material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(color),
          emissive: new THREE.Color(color),
          emissiveIntensity: randRange(1.4, 2.4),
          roughness: 0.15,
          metalness: 0.25,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0,
        });

        this._materials.push(child.material);
      });

      heart.userData = {
        floatSpeed: randRange(HEARTS_3D_FLOAT_SPEED_MIN, HEARTS_3D_FLOAT_SPEED_MAX),
        rotateX: randRange(-HEARTS_3D_ROTATE_SPEED_MAX, HEARTS_3D_ROTATE_SPEED_MAX),
        rotateY: randRange(-HEARTS_3D_ROTATE_SPEED_MAX, HEARTS_3D_ROTATE_SPEED_MAX),
        rotateZ: randRange(-HEARTS_3D_ROTATE_SPEED_MAX * 0.6, HEARTS_3D_ROTATE_SPEED_MAX * 0.6),
        offsetX: Math.random() * Math.PI * 2,
        offsetY: Math.random() * Math.PI * 2,
        offsetZ: Math.random() * Math.PI * 2,
        amplitude: randRange(HEARTS_3D_FLOAT_AMPLITUDE_MIN, HEARTS_3D_FLOAT_AMPLITUDE_MAX),
        baseX,
        baseY,
        baseZ,
        // Set true once this heart's own fall tween (see _fallIn())
        // arrives — update()'s float/bob only applies to landed hearts,
        // so a still-falling heart isn't fighting the fall tween for
        // control of its own position.
        landed: false,
      };

      this.group.add(heart);
      this.hearts.push(heart);
    }
  }

  _fadeIn() {
    const target = { t: 0 };
    gsap.to(target, {
      t: 1,
      duration: HEARTS_3D_APPEAR_DURATION,
      ease: "power1.out",
      onUpdate: () => {
        for (const material of this._materials) {
          material.opacity = target.t * HEARTS_3D_OPACITY;
        }
      },
    });
  }

  // Every heart falls straight down from above the visible frame to its
  // own scattered resting spot — like LoveRain, but a one-time entrance,
  // each with its own randomized duration + start delay so the field
  // cascades in staggered and varied rather than a single flat drop.
  // update()'s float/bob picks up automatically once `landed` flips true
  // (see the onComplete below) — this method never touches it directly.
  _fallIn() {
    for (const heart of this.hearts) {
      const d = heart.userData;

      gsap.to(heart.position, {
        y: d.baseY,
        duration: randRange(HEARTS_3D_FALL_DURATION_MIN, HEARTS_3D_FALL_DURATION_MAX),
        delay: randRange(0, HEARTS_3D_FALL_STAGGER_MAX),
        ease: HEARTS_3D_FALL_EASE,
        onComplete: () => {
          d.landed = true;
        },
      });
    }
  }

  // Idempotent — safe to call before the (async) model has finished
  // loading; _onLoaded() picks up `_started` and fades in immediately
  // once the hearts actually exist.
  playIn() {
    if (this._started) return;
    this._started = true;
    if (this.hearts.length > 0) {
      this._fadeIn();
      this._fallIn();
    }
  }

  update(delta) {
    const time = performance.now() * 0.001;

    for (const heart of this.hearts) {
      const d = heart.userData;

      heart.rotation.x += delta * d.rotateX;
      heart.rotation.y += delta * d.rotateY;
      heart.rotation.z += delta * d.rotateZ;

      // Still falling: leave position.y to the gsap tween in _fallIn()
      // — the float/bob below would otherwise fight it for control
      // every frame.
      if (!d.landed) continue;

      heart.position.y = d.baseY + Math.sin(time * d.floatSpeed + d.offsetY) * d.amplitude;
      heart.position.x = d.baseX + Math.cos(time * d.floatSpeed * 0.5 + d.offsetX) * (d.amplitude * 0.35);
      heart.position.z = d.baseZ + Math.sin(time * d.floatSpeed * 0.3 + d.offsetZ) * (d.amplitude * 0.25);
    }
  }

  destroy() {
    this.scene.remove(this.group);
    this.hearts.length = 0;
    this._materials.length = 0;
  }
}
