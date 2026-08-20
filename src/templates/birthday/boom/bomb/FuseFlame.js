import * as THREE from "three";

import {
  FUSE_FLAME_SCALE_AMPLITUDE,
  FUSE_FLAME_SCALE_SPEED,
  FUSE_FLAME_ROTATION_AMPLITUDE,
  FUSE_FLAME_ROTATION_SPEED,
  FUSE_FLAME_POSITION_AMPLITUDE,
  FUSE_FLAME_POSITION_SPEED,
  FUSE_FLAME_OPACITY_MIN,
  FUSE_FLAME_OPACITY_MAX,
  FUSE_FLAME_OPACITY_SPEED,
} from "./BombConstants";

// The fuse tip's own continuous "it's actually burning" animation — a
// handful of overlapping sine waves at deliberately non-matching
// speeds/phases (scale, in-plane rotation, position, and opacity each
// on their own), the same per-frame procedural-flicker idiom
// standard/cake/CakeReveal.js's own candle-flame update() already uses
// for this project (phase accumulation + Math.sin), rather than a
// single GSAP tween.
//
// This is driven by BombIntro.js's own update(delta) once started, and
// deliberately does NOT touch `sprite.scale`/`sprite.position` until
// start() is called — BombIntro's own ignite pop-in tween animates
// those same properties first (0 -> its rest size), and starting this
// loop any earlier would fight that tween for control of the same
// properties (GSAP overwrites a competing tween on the same target/
// properties, which is exactly why the previous single-tween flicker
// implementation here went silently dead almost immediately — see this
// project's own history). Reading the sprite's OWN current
// position/scale in start(), once the pop-in has already finished,
// means this never needs to know what that rest size actually is.
export default class FuseFlame {
  constructor(sprite) {
    this.sprite = sprite;
    this._time = 0;
    this._active = false;
    this._baseScale = 1;
    this._basePosition = new THREE.Vector3();
  }

  start() {
    this._baseScale = this.sprite.scale.x;
    this._basePosition.copy(this.sprite.position);
    this._time = 0;
    this._active = true;
  }

  // Re-anchors the flicker around a new point — called every frame by
  // FuseBurn.js while the burning point travels along the fuse, so the
  // flame stays attached to wherever it's currently burning rather than
  // sitting fixed at the original ignition spot.
  setBasePosition(x, y, z) {
    this._basePosition.set(x, y, z);
  }

  update(delta) {
    if (!this._active) return;
    this._time += delta;
    const t = this._time;

    // Two summed waves at incommensurate frequencies read as far more
    // "alive" than one clean sine — a single wave is exactly what made
    // the previous version feel like a uniform mechanical breathing
    // pulse rather than a flicker.
    const scaleWave =
      Math.sin(t * FUSE_FLAME_SCALE_SPEED) + Math.sin(t * FUSE_FLAME_SCALE_SPEED * 2.7 + 1.3) * 0.4;
    const scale = this._baseScale * (1 + scaleWave * FUSE_FLAME_SCALE_AMPLITUDE);
    this.sprite.scale.set(scale, scale, 1);

    this.sprite.material.rotation = Math.sin(t * FUSE_FLAME_ROTATION_SPEED + 0.6) * FUSE_FLAME_ROTATION_AMPLITUDE;

    this.sprite.position.set(
      this._basePosition.x + Math.sin(t * FUSE_FLAME_POSITION_SPEED + 2.1) * FUSE_FLAME_POSITION_AMPLITUDE,
      this._basePosition.y + Math.sin(t * FUSE_FLAME_POSITION_SPEED * 1.6) * FUSE_FLAME_POSITION_AMPLITUDE * 0.7,
      this._basePosition.z,
    );

    const opacityWave = (Math.sin(t * FUSE_FLAME_OPACITY_SPEED + 0.9) + 1) / 2;
    this.sprite.material.opacity = THREE.MathUtils.lerp(FUSE_FLAME_OPACITY_MIN, FUSE_FLAME_OPACITY_MAX, opacityWave);
  }

  stop() {
    this._active = false;
  }
}
