import * as THREE from "three";

// Small canvas-drawn textures for the heart burst — the same "cache a
// canvas drawing, reuse the map, tint via color" technique this
// project already establishes (see standard/cake/AtmosphereTextures.js
// and boom/bomb/BombTextures.js). Boom's own independent copy of the
// heart-silhouette technique (this project never imports one
// template's files into another's).
let heartTexture = null;
let dotTexture = null;

// A bold, clean heart silhouette — two circular lobes plus a bottom
// wedge, matching the simple rounded-emoji-style heart shape visible
// in the reference (not a thin outline, not a stylized/ornate shape).
export function getHeartTexture() {
  if (heartTexture) return heartTexture;

  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";

  ctx.beginPath();
  ctx.moveTo(size * 0.5, size * 0.88);
  ctx.lineTo(size * 0.1, size * 0.42);
  ctx.lineTo(size * 0.5, size * 0.3);
  ctx.lineTo(size * 0.9, size * 0.42);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.arc(size * 0.29, size * 0.35, size * 0.22, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(size * 0.71, size * 0.35, size * 0.22, 0, Math.PI * 2);
  ctx.fill();

  heartTexture = new THREE.CanvasTexture(canvas);
  return heartTexture;
}

// A soft round glow dot — the small "bokeh" particles mixed in among
// the hearts in the reference.
export function getDotTexture() {
  if (dotTexture) return dotTexture;

  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.7, "#ffffff");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  dotTexture = new THREE.CanvasTexture(canvas);
  return dotTexture;
}
