import * as THREE from "three";

import { getSparkTexture } from "./BombTextures";
import {
  BOMB_FUSE_COLOR,
  BOMB_FUSE_LENGTH,
  BOMB_FUSE_RADIUS,
  BOMB_FUSE_LEAN,
  BOMB_FUSE_OFFSET_Y,
  FUSE_BURN_END_FACTOR,
  FUSE_CHARRED_COLOR,
  EMBER_COUNT,
  EMBER_COLOR,
  EMBER_SIZE,
  EMBER_LIFETIME,
  EMBER_PEAK_OPACITY,
  EMBER_DRIFT_RADIUS,
  EMBER_UPWARD_DRIFT,
} from "./BombConstants";

// The fuse actually BURNING: the visible unburnt length genuinely
// SHRINKS from the tip toward the base as progress advances (see
// setProgress(), driven by BombIntro.js's own GSAP tween on a plain
// 0->1 proxy) — not just a color change on a fixed-length shape. A
// static overlay that only darkened the tip end while the fuse's own
// overall height above the cap never changed read as "barely
// happening" even though it was technically animating every frame —
// a shrinking silhouette is the obvious cue an eye actually catches.
// Also owns the small charred tip cap that travels with the current
// burn point, embers scattering near it, and re-anchoring the shared
// FuseFlame instance so its own flicker travels along too. Kept
// separate from FuseFlame itself — that class owns "what a flickering
// flame looks like wherever it is", this one owns "where the burning
// point currently is and how much fuse is left" — matching this
// project's own "one file, one concern" convention (see e.g.
// standard/cake's own split between CakeGeometry/CakeReveal).
//
// Both the shrinking remainder and the charred tip are plain flat
// quads/circles (not resized copies of the fuse's own CapsuleGeometry)
// — resizing a capsule would also stretch its rounded end caps into
// ellipses; flat shapes avoid that entirely and match how every other
// shape in bomb/BombGeometry.js is already built.
export default class FuseBurn {
  constructor(bombGroup, fuseFlame, fuseMesh) {
    this.fuseFlame = fuseFlame;
    this.fuseMesh = fuseMesh; // BombGeometry.js's own static fuse — hidden once burning starts, replaced by `remaining` below

    // Same anchor factor BombGeometry.js already used to place the
    // flame's own original resting spot (see this file's own
    // FUSE_BURN_END_FACTOR comment) — the tip point below is exactly
    // that spot, so progress 0 never causes a visible jump.
    const dir = new THREE.Vector3(0, 1, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), -BOMB_FUSE_LEAN);
    const center = new THREE.Vector3(0, BOMB_FUSE_OFFSET_Y, 0);
    const offset = dir.clone().multiplyScalar(BOMB_FUSE_LENGTH * FUSE_BURN_END_FACTOR);
    this._tipPoint = center.clone().add(offset);
    this._basePoint = center.clone().sub(offset);
    this._currentPoint = this._tipPoint.clone();

    // The still-unburnt fuse — spans from the current burn point down
    // to the base (by the cap) and shrinks toward zero-length as
    // progress reaches 1, so the fuse visibly gets shorter over time.
    // Same color/width as the original static mesh it replaces, so the
    // swap at progress 0 is invisible.
    this.remaining = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: BOMB_FUSE_COLOR }),
    );
    this.remaining.rotation.z = -BOMB_FUSE_LEAN;
    this.remaining.visible = false;
    bombGroup.add(this.remaining);

    // A small dark charred cap right at the current burn point, under
    // the flame — the freshly-consumed edge, not a persistent shape
    // covering the whole burnt length (that length simply isn't
    // rendered anymore once `remaining` has shrunk past it).
    this.charredTip = new THREE.Mesh(
      new THREE.CircleGeometry(BOMB_FUSE_RADIUS * 1.15, 16),
      new THREE.MeshBasicMaterial({ color: FUSE_CHARRED_COLOR }),
    );
    this.charredTip.visible = false;
    bombGroup.add(this.charredTip);

    this.embers = [];
    for (let i = 0; i < EMBER_COUNT; i++) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: getSparkTexture(), color: EMBER_COLOR, transparent: true, depthWrite: false, opacity: 0 }),
      );
      sprite.scale.set(EMBER_SIZE, EMBER_SIZE, 1);
      sprite.visible = false;
      bombGroup.add(sprite);
      this.embers.push({ sprite, phase: (i / EMBER_COUNT) * EMBER_LIFETIME, angle: Math.random() * Math.PI * 2 });
    }

    this._time = 0;
    this._active = false;
  }

  // p: 0 (nothing burnt, full-length fuse, flame at the original tip)
  // -> 1 (fully burnt down to the base, right by the cap).
  setProgress(p) {
    if (!this._active) {
      this._active = true;
      this.fuseMesh.visible = false;
      this.remaining.visible = true;
      this.charredTip.visible = true;
      this.embers.forEach(({ sprite }) => {
        sprite.visible = true;
      });
    }

    this._currentPoint.copy(this._tipPoint).lerp(this._basePoint, p);

    const remainingLength = this._currentPoint.distanceTo(this._basePoint);
    const remainingMid = this._currentPoint.clone().add(this._basePoint).multiplyScalar(0.5);
    this.remaining.position.set(remainingMid.x, remainingMid.y, 0.02);
    this.remaining.scale.set(BOMB_FUSE_RADIUS * 2, Math.max(remainingLength, 0.0001), 1);

    this.charredTip.position.set(this._currentPoint.x, this._currentPoint.y, 0.025);

    this.fuseFlame.setBasePosition(this._currentPoint.x, this._currentPoint.y, 0.03);
  }

  // Embers scatter/fade near the current burning point continuously —
  // independent of setProgress()'s own per-tween-frame calls, so they
  // keep animating smoothly even though burn progress itself eases
  // (see BombIntro.js's own burn tween).
  update(delta) {
    if (!this._active) return;
    this._time += delta;

    this.embers.forEach(({ sprite, phase, angle }) => {
      const localT = (this._time + phase) % EMBER_LIFETIME;
      const lifeFrac = localT / EMBER_LIFETIME;
      const opacity = Math.sin(lifeFrac * Math.PI) * EMBER_PEAK_OPACITY;

      sprite.position.set(
        this._currentPoint.x + Math.cos(angle) * EMBER_DRIFT_RADIUS * lifeFrac,
        this._currentPoint.y + Math.sin(angle) * EMBER_DRIFT_RADIUS * lifeFrac + EMBER_UPWARD_DRIFT * lifeFrac,
        0.028,
      );
      sprite.material.opacity = opacity;
      const scale = EMBER_SIZE * (1 - lifeFrac * 0.5);
      sprite.scale.set(scale, scale, 1);
    });
  }

  destroy() {
    this.remaining.geometry.dispose();
    this.remaining.material.dispose();
    this.charredTip.geometry.dispose();
    this.charredTip.material.dispose();
    this.embers.forEach(({ sprite }) => sprite.material.dispose());
  }
}
