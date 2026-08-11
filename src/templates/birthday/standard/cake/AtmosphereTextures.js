import * as THREE from "three";

// Small canvas-drawn sprite textures shared by CakeAtmosphere.js's own
// star/heart/sparkle layers — the same "cache a canvas drawing, reuse
// the map, tint via material.color" technique this template already
// uses in three other places (FormationSparkles.js's own
// getSparkleTexture(), CakeGeometry.js's own getFlameGlowTexture(), and
// CakeAtmosphere.js's own local getGlowTexture()). Kept in its own small
// file since it's a texture factory, not a particle system — it doesn't
// compete with or duplicate CakeAtmosphere's own orchestration. Every
// shape here is drawn procedurally with the Canvas 2D API at runtime;
// nothing is a loaded image asset.
let glowTexture = null;
let starburstTexture = null;
let heartTexture = null;

export function getGlowTexture() {
  if (glowTexture) return glowTexture;

  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  glowTexture = new THREE.CanvasTexture(canvas);
  return glowTexture;
}

// A classic 4-point "sparkle/glint" shape — a soft round core plus two
// perpendicular squashed radial-gradient bars crossing through center,
// each tapering to nothing at its own tip. A well-known cheap technique
// (no path geometry needed) that reads unmistakably as a tiny sparkle
// rather than a plain dot.
export function getStarburstTexture() {
  if (starburstTexture) return starburstTexture;

  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  const cx = size / 2;
  const cy = size / 2;

  const barGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
  barGradient.addColorStop(0, "#ffffff");
  barGradient.addColorStop(1, "rgba(255, 255, 255, 0)");

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, 0.16);
  ctx.beginPath();
  ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = barGradient;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(0.16, 1);
  ctx.beginPath();
  ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = barGradient;
  ctx.fill();
  ctx.restore();

  const coreGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.22);
  coreGradient.addColorStop(0, "#ffffff");
  coreGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = coreGradient;
  ctx.fill();

  starburstTexture = new THREE.CanvasTexture(canvas);
  return starburstTexture;
}

// A simple filled heart silhouette — two circular lobes plus a wedge for
// the bottom point, drawn as three separate solid-white fills rather
// than one combined path (they overlap seamlessly at full opacity, so
// there's no risk of a self-intersecting path rendering incorrectly).
// Drawn once at a modest resolution — its own anti-aliased edge plus
// this template's usual additive blending is what gives it a soft glow
// once rendered small on a Sprite, the same way the plain-circle glow
// texture above never needs an explicit blur pass either.
export function getHeartTexture() {
  if (heartTexture) return heartTexture;

  const size = 96;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";

  ctx.beginPath();
  ctx.moveTo(size * 0.5, size * 0.86);
  ctx.lineTo(size * 0.12, size * 0.42);
  ctx.lineTo(size * 0.5, size * 0.3);
  ctx.lineTo(size * 0.88, size * 0.42);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.arc(size * 0.3, size * 0.34, size * 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(size * 0.7, size * 0.34, size * 0.2, 0, Math.PI * 2);
  ctx.fill();

  heartTexture = new THREE.CanvasTexture(canvas);
  return heartTexture;
}
