import * as THREE from "three";

import FloatingMotion from "../../components/FloatingMotion";

// Renders text onto a canvas and displays it as a billboard sprite — a
// simpler cousin of the luxury template's particle-sampled text, since
// this scene just needs a readable floating birthday message, not a
// particle-formed one. Color and font come from content/config/theme.js,
// motion from content/config/celebration.js — all supplied by
// CelebrationAtmosphere.
export default class FloatingText {
  constructor(
    text,
    { x = 0, y = 0, z = 0, color = "#ffffff", fontFamily, motion = {} } = {},
  ) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = color;
    ctx.font = `bold 64px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    this.texture = new THREE.CanvasTexture(canvas);

    this.material = new THREE.SpriteMaterial({
      map: this.texture,
      transparent: true,
    });

    this.sprite = new THREE.Sprite(this.material);
    this.sprite.scale.set(3, 0.75, 1);
    this.sprite.position.set(x, y, z);

    this.motion = new FloatingMotion(this.sprite, motion);
  }

  addTo(group) {
    group.add(this.sprite);

    return this;
  }

  update(delta) {
    this.motion.update(delta);
  }

  dispose() {
    this.texture.dispose();
    this.material.dispose();
  }
}
