import * as THREE from "three";
import gsap from "gsap";

import FloatingMotion from "../../components/FloatingMotion";

// A single floating message card for the Memories scene. Text is baked
// onto a canvas (same technique as celebration/FloatingText) so swapping
// in real customer messages later is just editing content/messages.js —
// no geometry or layout code changes needed. Font comes from
// content/config/theme.js; appear duration and motion come from
// content/config/animation.js's `messageCard` block — all supplied by
// MemoriesScene.
export default class MessageCard {
  constructor(
    text,
    { x = 0, y = 0, z = 0, fontFamily, appearDuration = 0.8, motion = {} } = {},
  ) {
    this.appearDuration = appearDuration;

    this.texture = MessageCard.createTexture(text, fontFamily);

    this.material = new THREE.SpriteMaterial({
      map: this.texture,
      transparent: true,
      opacity: 0,
    });

    this.sprite = new THREE.Sprite(this.material);
    this.sprite.scale.set(0.001, 0.001, 1);
    this.sprite.position.set(x, y, z);

    this.motion = new FloatingMotion(this.sprite, motion);
  }

  static createTexture(text, fontFamily) {
    const width = 512;
    const height = 300;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "rgba(20, 12, 20, 0.65)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.roundRect(6, 6, width - 12, height - 12, 28);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = `500 34px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    MessageCard.wrapText(ctx, text, width / 2, height / 2, width - 80, 42);

    return new THREE.CanvasTexture(canvas);
  }

  // Naive word-wrap — enough to keep placeholder messages legible on the
  // card; swap for a richer text-layout system later if needed.
  static wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(" ");
    const lines = [];
    let line = "";

    words.forEach((word) => {
      const test = line ? `${line} ${word}` : word;

      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    });

    if (line) lines.push(line);

    const startY = y - ((lines.length - 1) * lineHeight) / 2;

    lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight));
  }

  addTo(group) {
    group.add(this.sprite);

    return this;
  }

  appear(delay = 0) {
    gsap.to(this.sprite.scale, {
      x: 2.2,
      y: 1.3,
      duration: this.appearDuration,
      delay,
      ease: "back.out(1.6)",
    });

    gsap.to(this.material, { opacity: 1, duration: this.appearDuration, delay });
  }

  update(delta) {
    this.motion.update(delta);
  }

  dispose() {
    this.texture.dispose();
    this.material.dispose();
  }
}
