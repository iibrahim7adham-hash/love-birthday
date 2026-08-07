import * as THREE from "three";

// Generates a soft radial-gradient dot once on a hidden canvas and wraps it
// in a THREE.Sprite — the cheapest way to get a glow (candle flame, firework
// spark, accent light) without a custom shader. Reused anywhere a scene
// needs "a soft glowing point", instead of every object rolling its own
// canvas/texture code.
export default class GlowSprite {
  constructor(color = "#ffffff", size = 1) {
    this.texture = GlowSprite.createTexture(color);

    this.material = new THREE.SpriteMaterial({
      map: this.texture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.sprite = new THREE.Sprite(this.material);
    this.sprite.scale.setScalar(size);
  }

  static createTexture(color) {
    const size = 128;

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");

    const gradient = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );

    gradient.addColorStop(0, color);
    gradient.addColorStop(1, "rgba(0,0,0,0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    return new THREE.CanvasTexture(canvas);
  }

  setOpacity(value) {
    this.material.opacity = value;
  }

  dispose() {
    this.texture.dispose();
    this.material.dispose();
  }
}
