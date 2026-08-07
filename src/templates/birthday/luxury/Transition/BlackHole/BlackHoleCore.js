import * as THREE from "three";

import {
  CORE_RADIUS,
  RING_INNER_RADIUS,
  RING_OUTER_RADIUS,
  RING_TILT_DEG,
  RING_SPIN_SPEED,
} from "./Constants";
import { createRingSparkleTexture } from "./Utils";

// The black hole core is the one non-particle element in this scene: it
// represents an absence of light, not a lit surface, so a flat black
// sphere reads correctly where a "black" particle cluster would simply
// vanish against the background.
//
// A thin Saturn-style ring sits on it. The FIXED tilt lives on a separate
// pivot (`ringPivot`) while the ring mesh itself spins continuously
// around its own local Z (its normal) in update() — keeping those two
// rotations on different objects is what lets the ring hold a stable,
// elegant tilt while still visibly spinning, instead of the whole tilted
// ellipse wobbling/precessing around. The ring is a child of `mesh`, so
// it scales and fades in together with the core's own reveal/settle
// animation.
export default class BlackHoleCore {
  constructor(parentGroup) {
    const coreGeometry = new THREE.SphereGeometry(CORE_RADIUS, 64, 64);
    const coreMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

    this.mesh = new THREE.Mesh(coreGeometry, coreMaterial);
    this.mesh.scale.setScalar(0.001);
    parentGroup.add(this.mesh);

    this.ringPivot = new THREE.Object3D();
    this.ringPivot.rotation.x = THREE.MathUtils.degToRad(RING_TILT_DEG);
    this.mesh.add(this.ringPivot);

    const ringGeometry = new THREE.RingGeometry(
      RING_INNER_RADIUS,
      RING_OUTER_RADIUS,
      96,
    );

    const ringMaterial = new THREE.MeshBasicMaterial({
      map: createRingSparkleTexture(),
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.ring = new THREE.Mesh(ringGeometry, ringMaterial);
    this.ringPivot.add(this.ring);
  }

  // Spins around the ring's OWN normal (unaffected by ringPivot's fixed
  // tilt), so the sparkle texture visibly sweeps around while the ring's
  // overall tilt/ellipse shape stays perfectly stable.
  update(delta) {
    this.ring.rotation.z += delta * RING_SPIN_SPEED;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();

    this.ring.geometry.dispose();
    this.ring.material.map.dispose();
    this.ring.material.dispose();
  }
}
