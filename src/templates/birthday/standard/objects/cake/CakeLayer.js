import * as THREE from "three";
import gsap from "gsap";

// A single stackable cake tier. Reusable so CakeBase can compose as many
// layers as content/config/cake.js asks for without duplicating geometry
// setup. Color and buildDuration are passed in by CakeBase, sourced
// from that same config file — nothing here is hardcoded.
//
// `buildIn()` is a deliberate placeholder: today it's a simple scale+fade,
// but it's the exact seam where a future particle-converges-into-mesh
// effect (like the luxury template's BlackHole morph) would slot in
// without CakeBase or CakeBuildScene needing to change.
export default class CakeLayer {
  constructor({ radius, height, color, y, buildDuration }) {
    this.buildDuration = buildDuration;

    this.mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, height, 32),
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.5,
        metalness: 0.05,
        transparent: true,
        opacity: 0,
      }),
    );

    this.mesh.position.y = y;
    this.mesh.scale.setScalar(0.001);
  }

  addTo(group) {
    group.add(this.mesh);

    return this;
  }

  buildIn(delay = 0) {
    return new Promise((resolve) => {
      gsap.to(this.mesh.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: this.buildDuration,
        delay,
        ease: "back.out(1.7)",
      });

      gsap.to(this.mesh.material, {
        opacity: 1,
        duration: this.buildDuration,
        delay,
        onComplete: resolve,
      });
    });
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
