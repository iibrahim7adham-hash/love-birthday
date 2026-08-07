import * as THREE from "three";
import Sparkles from "./Sparkles";
import Stars from "./Stars";
import Hearts from "./Hearts";

export default class Environment {
  constructor(scene) {
    this.scene = scene;

    this.group = new THREE.Group();

    this.scene.add(this.group);

    // Background
    this.stars = new Stars(this.group);
    this.hearts = new Hearts(this.group);
    this.sparkles = new Sparkles(this.group);

    // Mouse Parallax
    this.pointer = {
      x: 0,
      y: 0,
    };

    this.onPointerMove = this.onPointerMove.bind(this);

    window.addEventListener("pointermove", this.onPointerMove);
  }

  onPointerMove(event) {
    this.pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;

    this.pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
  }

  update(delta) {
    this.stars.update(delta);

    this.hearts.update(delta);

    this.sparkles.update(delta);

    this.group.rotation.y +=
      (this.pointer.x * 0.08 - this.group.rotation.y) * 0.03;

    this.group.rotation.x +=
      (-this.pointer.y * 0.05 - this.group.rotation.x) * 0.03;
  }

  destroy() {
    window.removeEventListener("pointermove", this.onPointerMove);

    this.stars.destroy();

    this.hearts.destroy();

    this.sparkles.destroy();

    this.scene.remove(this.group);
  }
}
