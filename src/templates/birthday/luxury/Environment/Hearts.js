import * as THREE from "three";
import gsap from "gsap";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import heartModel from "../../../../assets/models/heart.glb?url";

export default class Hearts {
  constructor(scene) {
    this.scene = scene;

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.loader = new GLTFLoader();

    this.hearts = [];

    this.speedMultiplier = 1;

    this.load();
  }

  load() {
    this.loader.load(heartModel, (gltf) => {
      const original = gltf.scene;

      original.traverse((child) => {
        if (!child.isMesh) return;

        child.material = new THREE.MeshStandardMaterial({
          color: new THREE.Color("#ff6ecf"),
          emissive: new THREE.Color("#ff2d95"),
          emissiveIntensity: 1.8,
          roughness: 0.15,
          metalness: 0.25,
          side: THREE.DoubleSide,
        });

        child.castShadow = false;
        child.receiveShadow = false;
      });

      this.createHearts(original);
    });
  }

  createHearts(original) {
    const createGroup = (count, minScale, maxScale, area) => {
      const colors = ["#ff4fa6", "#ff6ecf", "#ff94db", "#ffbce8", "#ffd6f4"];

      for (let i = 0; i < count; i++) {
        const heart = original.clone(true);

        const scale = THREE.MathUtils.randFloat(minScale, maxScale);

        heart.scale.set(
          scale,
          scale * THREE.MathUtils.randFloat(0.95, 1.05),
          scale,
        );

        heart.position.set(
          THREE.MathUtils.randFloatSpread(area),
          THREE.MathUtils.randFloat(-12, 14),
          THREE.MathUtils.randFloat(-35, -4),
        );

        heart.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI,
        );

        const color = colors[Math.floor(Math.random() * colors.length)];

        heart.traverse((child) => {
          if (!child.isMesh) return;

          child.material = child.material.clone();

          child.material.color.set(color);
          child.material.emissive.set(color);
          child.material.emissiveIntensity = THREE.MathUtils.randFloat(
            1.2,
            2.5,
          );
        });

        heart.userData = {
          floatSpeed: THREE.MathUtils.randFloat(0.25, 0.7),

          rotateX: THREE.MathUtils.randFloat(-0.2, 0.2),
          rotateY: THREE.MathUtils.randFloat(-0.4, 0.4),
          rotateZ: THREE.MathUtils.randFloat(-0.16, 0.16),

          offsetX: Math.random() * Math.PI * 2,
          offsetY: Math.random() * Math.PI * 2,
          offsetZ: Math.random() * Math.PI * 2,

          amplitude: THREE.MathUtils.randFloat(0.25, 0.8),

          baseX: heart.position.x,
          baseY: heart.position.y,
          baseZ: heart.position.z,
        };

        this.group.add(heart);

        this.hearts.push(heart);
      }
    };

    // قلوب كبيرة
    createGroup(30, 0.7, 1.0, 35);

    // قلوب متوسطة
    createGroup(75, 0.35, 0.65, 50);

    // قلوب صغيرة
    createGroup(250, 0.08, 0.28, 70);
  }

  update(delta) {
    const time = performance.now() * 0.001 * this.speedMultiplier;

    this.hearts.forEach((heart) => {
      const d = heart.userData;

      heart.rotation.x += delta * d.rotateX;
      heart.rotation.y += delta * d.rotateY;
      heart.rotation.z += delta * d.rotateZ;

      heart.position.y =
        d.baseY + Math.sin(time * d.floatSpeed + d.offsetY) * d.amplitude;

      heart.position.x =
        d.baseX +
        Math.cos(time * d.floatSpeed * 0.5 + d.offsetX) * (d.amplitude * 0.35);

      heart.position.z =
        d.baseZ +
        Math.sin(time * d.floatSpeed * 0.3 + d.offsetZ) * (d.amplitude * 0.25);
    });
  }

  destroy() {
    this.scene.remove(this.group);

    this.hearts.length = 0;
  }

  boost() {
    gsap.to(this, {
      speedMultiplier: 2.5,
      duration: 0.4,
      yoyo: true,
      repeat: 1,
      ease: "power2.inOut",
    });
  }
}
