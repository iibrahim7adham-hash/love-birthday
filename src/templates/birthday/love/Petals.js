import * as THREE from "three";

import {
  PETAL_ALPHA_RANGE,
  PETAL_COLOR,
  PETAL_COUNT,
  PETAL_FADE_IN_DURATION,
  PETAL_FADE_OUT_DURATION,
  PETAL_LIFETIME_RANGE,
  PETAL_ROTATION_SPEED_RANGE,
  PETAL_SIZE_RANGE,
  PETAL_SPAWN_BOUNDS,
  PETAL_VELOCITY,
  PETAL_WOBBLE_AMOUNT_RANGE,
  PETAL_WOBBLE_SPEED_RANGE,
} from "./Constants";
import FloatingSystem from "./FloatingSystem";

// A soft, glowing teardrop shape — Petals' only job beyond spawn
// parameters is describing what a petal looks like; FloatingSystem
// never sees this texture's shape or meaning.
function createPetalTexture() {
  const size = 128;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");

  const gradient = ctx.createRadialGradient(
    size / 2,
    size * 0.35,
    0,
    size / 2,
    size * 0.5,
    size * 0.5,
  );

  gradient.addColorStop(0, "rgba(255, 255, 255, 0.95)");
  gradient.addColorStop(0.55, "rgba(255, 201, 217, 0.85)");
  gradient.addColorStop(1, "rgba(255, 201, 217, 0)");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(size / 2, size / 2, size * 0.28, size * 0.46, 0, 0, Math.PI * 2);
  ctx.fill();

  return new THREE.CanvasTexture(canvas);
}

// Petals: texture, size, color, and spawn parameters only. Every bit of
// motion — drift, wobble, rotation, fade — comes from FloatingSystem's
// shared, generic implementation; this class never touches a sprite's
// position or opacity directly. Completely independent from the heart
// system: it only ever talks to the scene it's handed.
export default class Petals {
  constructor(scene) {
    this.scene = scene;
    this.texture = createPetalTexture();

    this.floatingSystem = new FloatingSystem(PETAL_COUNT, {
      texture: this.texture,
      color: PETAL_COLOR,
      sizeRange: PETAL_SIZE_RANGE,
      spawnBounds: PETAL_SPAWN_BOUNDS,
      driftVelocity: PETAL_VELOCITY,
      wobbleAmountRange: PETAL_WOBBLE_AMOUNT_RANGE,
      wobbleSpeedRange: PETAL_WOBBLE_SPEED_RANGE,
      rotationSpeedRange: PETAL_ROTATION_SPEED_RANGE,
      lifetimeRange: PETAL_LIFETIME_RANGE,
      fadeInDuration: PETAL_FADE_IN_DURATION,
      fadeOutDuration: PETAL_FADE_OUT_DURATION,
      baseAlphaRange: PETAL_ALPHA_RANGE,
    });

    this.scene.add(this.floatingSystem.group);
  }

  update(delta) {
    this.floatingSystem.update(delta);
  }

  destroy() {
    this.floatingSystem.destroy();
    this.texture.dispose();
    this.scene.remove(this.floatingSystem.group);
  }
}
