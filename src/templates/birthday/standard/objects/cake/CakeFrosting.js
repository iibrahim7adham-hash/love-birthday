import * as THREE from "three";
import gsap from "gsap";

// Decorative ring sitting on the cake's top tier. Split out from CakeLayer
// because "decoration" and "structural tier" are different concerns that
// will grow independently (frosting drips, sprinkles, a piped border...)
// without bloating CakeLayer itself. Color and buildDuration come from
// content/config/cake.js via CakeBase.
export default class CakeFrosting {
  constructor({ radius, y, color, buildDuration }) {
    this.buildDuration = buildDuration;

    this.mesh = new THREE.Mesh(
      new THREE.TorusGeometry(radius, radius * 0.18, 12, 32),
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.4,
        transparent: true,
        opacity: 0,
      }),
    );

    this.mesh.rotation.x = Math.PI / 2;
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
        ease: "back.out(2)",
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
