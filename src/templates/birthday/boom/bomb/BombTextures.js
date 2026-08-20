import * as THREE from "three";

// A small canvas-drawn sprite texture for the fuse-tip spark — the
// same "cache a canvas drawing, reuse the map, tint via material.color"
// technique standard/cake/AtmosphereTextures.js already establishes.
// Boom's own independent copy (this project never imports one
// template's files into another's — see that file's own comment).
let sparkTexture = null;

// A soft core plus four short tapering rays — reads as a small cartoon
// ignition spark, not a flame or a hard star outline.
export function getSparkTexture() {
  if (sparkTexture) return sparkTexture;

  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  const cx = size / 2;
  const cy = size / 2;

  const rayGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
  rayGradient.addColorStop(0, "#ffffff");
  rayGradient.addColorStop(1, "rgba(255, 255, 255, 0)");

  for (const scaleX of [1, 0.18]) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scaleX, scaleX === 1 ? 0.18 : 1);
    ctx.beginPath();
    ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = rayGradient;
    ctx.fill();
    ctx.restore();
  }

  const coreGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.28);
  coreGradient.addColorStop(0, "#ffffff");
  coreGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = coreGradient;
  ctx.fill();

  sparkTexture = new THREE.CanvasTexture(canvas);
  return sparkTexture;
}
