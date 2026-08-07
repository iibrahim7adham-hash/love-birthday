import * as THREE from "three";

export default class Sparkles {
  constructor(scene) {
    this.scene = scene;

    this.create();
  }

  create() {
    const count = 2500;

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const palette = [
      new THREE.Color("#ffffff"),
      new THREE.Color("#ffd6f4"),
      new THREE.Color("#ffeaff"),
      new THREE.Color("#ffc9ec"),
    ];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = THREE.MathUtils.randFloatSpread(90);
      positions[i * 3 + 1] = THREE.MathUtils.randFloatSpread(60);
      positions[i * 3 + 2] = THREE.MathUtils.randFloat(-35, -2);

      const color = palette[Math.floor(Math.random() * palette.length)];

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    this.material = new THREE.PointsMaterial({
      size: 0.025,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geometry, this.material);

    this.scene.add(this.points);
  }

  update(delta) {
    const t = performance.now() * 0.00008;

    this.points.rotation.y += delta * 0.012;

    this.material.opacity = 0.75 + Math.sin(t * 25) * 0.15;
  }

  destroy() {
    this.scene.remove(this.points);

    this.points.geometry.dispose();

    this.material.dispose();
  }
}
