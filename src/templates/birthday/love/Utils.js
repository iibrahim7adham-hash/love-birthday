import * as THREE from "three";

// A soft radial gradient, cached per color/size combination — used
// anywhere in this scene that needs a glow rather than a hard-edged
// shape.
const glowTextureCache = new Map();

export function createGlowTexture(color, size = 256) {
  const key = `${color}:${size}`;

  if (glowTextureCache.has(key)) return glowTextureCache.get(key);

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
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  glowTextureCache.set(key, texture);

  return texture;
}
