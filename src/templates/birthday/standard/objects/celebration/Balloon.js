import * as THREE from "three";
import gsap from "gsap";

import FloatingMotion from "../../components/FloatingMotion";

// A single floating balloon (sphere + string). Color and motion come
// from content/config/celebration.js via CelebrationAtmosphere, which
// spawns `balloonCount` of these around the cake.
export default class Balloon {
  constructor({ x = 0, y = 0, z = 0, color = "#ff8fa8", motion = {} }) {
    this.group = new THREE.Group();
    this.group.position.set(x, y, z);

    this.balloon = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 16, 16),
      new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.1 }),
    );
    this.balloon.scale.y = 1.2;
    this.group.add(this.balloon);

    const stringGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -0.42, 0),
      new THREE.Vector3(0, -1.0, 0),
    ]);

    this.string = new THREE.Line(
      stringGeometry,
      new THREE.LineBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.4,
      }),
    );
    this.group.add(this.string);

    this.motion = new FloatingMotion(this.group, motion);

    this.group.scale.setScalar(0.001);
  }

  addTo(group) {
    group.add(this.group);

    return this;
  }

  appear(delay = 0, duration = 0.8) {
    gsap.to(this.group.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration,
      delay,
      ease: "back.out(1.6)",
    });
  }

  update(delta) {
    this.motion.update(delta);
  }

  dispose() {
    this.balloon.geometry.dispose();
    this.balloon.material.dispose();
    this.string.geometry.dispose();
    this.string.material.dispose();
  }
}
