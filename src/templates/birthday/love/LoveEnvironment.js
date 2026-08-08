import * as THREE from "three";

import {
  BACKGROUND_COLOR,
  STAR_COLOR,
  STAR_COUNT,
  STAR_FIELD_RADIUS,
  STAR_FOG_FAR,
  STAR_FOG_NEAR,
  STAR_TWINKLE_MAX_OPACITY,
  STAR_TWINKLE_MIN_OPACITY,
  STAR_TWINKLE_SPEED,
} from "./Constants";
import { createGlowTexture } from "./Utils";

// Stars and the scene's background — nothing else. A static field of
// small glowing points scattered evenly through a large sphere around
// the origin, far enough out that the camera's own idle drift never
// approaches the edge. Fog only reaches the outer part of that field
// (see STAR_FOG_NEAR/FAR) — the platform, heart and petals all sit well
// inside it — so distant stars fade gently instead of stopping at a
// hard, visible edge.
export default class LoveEnvironment {
  constructor(scene) {
    this.scene = scene;
    this.time = 0;

    this.scene.background = new THREE.Color(BACKGROUND_COLOR);
    this.scene.fog = new THREE.Fog(BACKGROUND_COLOR, STAR_FOG_NEAR, STAR_FOG_FAR);

    this.stars = this.createStars();
    this.scene.add(this.stars);
  }

  createStars() {
    const positions = new Float32Array(STAR_COUNT * 3);

    for (let i = 0; i < STAR_COUNT; i++) {
      // Uniform-in-volume sphere sampling (cube-root the random
      // radius) — a naive random x/y/z would clump stars toward the
      // center instead of spreading them evenly through the field.
      const radius = STAR_FIELD_RADIUS * Math.cbrt(Math.random());
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));

      const i3 = i * 3;

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);
    }

    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      map: createGlowTexture(STAR_COLOR),
      color: new THREE.Color(STAR_COLOR),
      size: 0.3,
      sizeAttenuation: true,
      transparent: true,
      opacity: STAR_TWINKLE_MAX_OPACITY,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return new THREE.Points(geometry, material);
  }

  // A gentle whole-field shimmer, not per-star twinkle — simple on
  // purpose (a per-star version would need its own shader), slow and
  // subtle enough that it still reads as "the sky is alive" rather
  // than an obviously synchronized pulse.
  update(delta) {
    this.time += delta;

    const t = (Math.sin(this.time * STAR_TWINKLE_SPEED) + 1) / 2;

    this.stars.material.opacity = THREE.MathUtils.lerp(
      STAR_TWINKLE_MIN_OPACITY,
      STAR_TWINKLE_MAX_OPACITY,
      t,
    );
  }

  destroy() {
    // The glow texture is cached/shared (see Utils.createGlowTexture) —
    // only this instance's own geometry/material are disposed, not the
    // cached map, which stays alive for reuse.
    this.stars.geometry.dispose();
    this.stars.material.dispose();
    this.scene.remove(this.stars);
    this.scene.fog = null;
  }
}
