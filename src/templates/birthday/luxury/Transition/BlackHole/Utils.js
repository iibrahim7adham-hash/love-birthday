import { createNoise4D } from "simplex-noise";
import * as THREE from "three";

import {
  RED_DEEP,
  RED_CRIMSON,
  RED_ROSE,
  RED_BRIGHT,
  SPARK_WHITE,
} from "./Constants";

// Real simplex noise (via `simplex-noise`) instead of the hand-rolled
// sine-product field this used to be — no periodic/grid-aligned artifacts,
// genuinely organic drift. Each axis samples the same 4D field at a large
// fixed offset so the three components stay decorrelated (one field,
// three independent-looking readings) without needing three separate
// noise instances. This is a noise-as-velocity field, not full
// mathematical curl (which needs ~4x the noise samples per particle) —
// a deliberate quality/performance trade-off for particle counts in the
// tens of thousands on mobile.
const noise4D = createNoise4D();

export function flowField(x, y, z, t) {
  const s = 0.5;
  const tt = t * 0.3;

  return {
    x: noise4D(x * s, y * s, z * s, tt),
    y: noise4D(x * s + 37.2, y * s - 18.9, z * s, tt),
    z: noise4D(x * s, y * s + 91.7, z * s - 52.4, tt),
  };
}

// The classic heart parametric curve, traced once into a polygon and used
// for point-in-polygon rejection sampling — gives the actual recognizable
// heart silhouette (proper twin lobes, sharp bottom point) instead of the
// rounder algebraic curve, while still keeping uniform density (true 2D
// rejection, not radial scaling, so no streaks).
const HEART_POLY = (() => {
  const poly = [];
  const segments = 120;

  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;

    const hx = Math.pow(Math.sin(t), 3);
    const hy =
      (13 * Math.cos(t) -
        5 * Math.cos(2 * t) -
        2 * Math.cos(3 * t) -
        Math.cos(4 * t)) /
      16;

    poly.push({ x: hx, y: hy });
  }

  return poly;
})();

function isInsideHeart(x, y) {
  let inside = false;

  for (let i = 0, j = HEART_POLY.length - 1; i < HEART_POLY.length; j = i++) {
    const xi = HEART_POLY[i].x;
    const yi = HEART_POLY[i].y;
    const xj = HEART_POLY[j].x;
    const yj = HEART_POLY[j].y;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

export function sampleHeartXY() {
  let x = 0;
  let y = 0;
  let attempts = 0;

  do {
    x = THREE.MathUtils.randFloat(-1.05, 1.05);
    y = THREE.MathUtils.randFloat(-1.1, 0.9);
    attempts++;
  } while (!isInsideHeart(x, y) && attempts < 50);

  return { x, y };
}

// Renders text to a hidden canvas once, and reads back which pixels are
// "ink" — used only to compute particle target positions. The canvas is
// never applied as a texture to anything that gets rendered.
export function sampleTextPositions(text, count, worldWidth) {
  const width = 900;
  const height = 220;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 120px 'Segoe UI', Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, width / 2, height / 2);

  const data = ctx.getImageData(0, 0, width, height).data;

  const candidates = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      if (data[idx] > 128) {
        candidates.push({ x, y });
      }
    }
  }

  const worldHeight = (worldWidth * height) / width;

  const points = [];

  for (let i = 0; i < count; i++) {
    const c = candidates[Math.floor(Math.random() * candidates.length)];

    points.push({
      x: (c.x / width - 0.5) * worldWidth,
      y: -(c.y / height - 0.5) * worldHeight,
      z: THREE.MathUtils.randFloatSpread(0.06),
    });
  }

  return points;
}

// Placeholder "photo" card for memories that don't have a real image yet —
// a soft gradient with a thin frame, generated once per photo. Swapping to
// a real customer photo later only means loading `entry.src` through
// THREE.TextureLoader instead of this function; nothing else changes.
function createPlaceholderTexture(colorA, colorB) {
  const size = 256;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, colorA);
  gradient.addColorStop(1, colorB);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, size - 8, size - 8);

  return new THREE.CanvasTexture(canvas);
}

export function loadPhotoTexture(entry) {
  if (entry.src) {
    return new THREE.TextureLoader().load(entry.src);
  }

  return createPlaceholderTexture(entry.colors[0], entry.colors[1]);
}

// A soft round glow, cached per color — sat behind every memory sprite
// so a photo/sticker reads as embedded, glowing light within the
// particle field rather than a flat opaque card floating on top of it.
const glowTextureCache = new Map();

export function createGlowTexture(color) {
  if (glowTextureCache.has(color)) return glowTextureCache.get(color);

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
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  glowTextureCache.set(color, texture);

  return texture;
}

// A speckled, semi-transparent grain — the whole reason the Saturn-style
// ring can visibly spin at all. A flat solid color is rotationally
// symmetric (spinning it around its own axis produces zero visible
// change); this texture varies in every direction and repeats several
// times around the ring, so individual specks visibly sweep past as it
// rotates, the same way real ring particles or Saturn's own banding
// would.
export function createRingSparkleTexture() {
  const size = 256;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");

  for (let i = 0; i < 2200; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = Math.random() * 1.6 + 0.3;
    const alpha = Math.random() * 0.55 + 0.2;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 205, 222, ${alpha})`;
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 2);

  return texture;
}

export function randomRed() {
  const r = Math.random();

  if (r < 0.05) return SPARK_WHITE;
  if (r < 0.32) return RED_DEEP;
  if (r < 0.62) return RED_CRIMSON;
  if (r < 0.86) return RED_ROSE;

  return RED_BRIGHT;
}
