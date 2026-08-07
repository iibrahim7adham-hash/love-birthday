import * as THREE from "three";

export default class Lights {
  constructor(scene) {
    this.scene = scene.instance;

    this.create();
  }

  create() {
    this.ambient = new THREE.AmbientLight(0xffffff, 0.35);
    this.scene.add(this.ambient);

    this.mainLight = new THREE.DirectionalLight(0xffffff, 3);
    this.mainLight.position.set(5, 10, 5);
    this.scene.add(this.mainLight);

    this.rimLight = new THREE.DirectionalLight(0x66aaff, 1.2);
    this.rimLight.position.set(-8, 6, -8);
    this.scene.add(this.rimLight);

    this.warmLight = new THREE.PointLight(0xffb347, 25, 20);
    this.warmLight.position.set(0, 3, 0);
    this.scene.add(this.warmLight);
  }
}
