import * as THREE from "three";

// One glowing white heart glyph baked into a single-cell canvas texture
// — the actual sprite every heart particle renders as (see
// heartParticleFragmentShader), not a procedural round dot. White shape
// on a transparent background: the alpha channel is the shape mask,
// tinted per-particle by aColor at render time (see HeartFormation.js),
// the same "atlas is shape-only, color applied later" trick as
// rain/GlyphAtlas.js.
const CELL_SIZE = 128;

function heartPath(ctx, cx, cy, size) {
  ctx.beginPath();
  const topCurveHeight = size * 0.3;
  ctx.moveTo(cx, cy + topCurveHeight);
  ctx.bezierCurveTo(
    cx, cy, cx - size / 2, cy, cx - size / 2, cy + topCurveHeight,
  );
  ctx.bezierCurveTo(
    cx - size / 2, cy + (size + topCurveHeight) / 2,
    cx, cy + (size + topCurveHeight) / 2,
    cx, cy + size,
  );
  ctx.bezierCurveTo(
    cx, cy + (size + topCurveHeight) / 2,
    cx + size / 2, cy + (size + topCurveHeight) / 2,
    cx + size / 2, cy + topCurveHeight,
  );
  ctx.bezierCurveTo(
    cx + size / 2, cy, cx, cy, cx, cy + topCurveHeight,
  );
  ctx.closePath();
}

// Two shadow-blurred passes (a soft halo baked into the alpha channel,
// so the glow travels with the sprite instead of needing a second draw
// call) followed by one crisp, unblurred pass on top — a bright little
// core with a soft graded edge, not a flat disc/heart with a hard
// boundary.
function drawGlowHeart(ctx, cellSize) {
  const cx = cellSize / 2;
  const cy = cellSize / 2;
  const size = cellSize * 0.34;
  const offsetY = -size * 0.18; // nudge up so the point sits centered in the cell

  ctx.fillStyle = "#ffffff";

  ctx.shadowColor = "#ffffff";
  ctx.shadowBlur = cellSize * 0.16;
  heartPath(ctx, cx, cy + offsetY, size);
  ctx.fill();
  heartPath(ctx, cx, cy + offsetY, size);
  ctx.fill();

  ctx.shadowBlur = 0;
  heartPath(ctx, cx, cy + offsetY, size);
  ctx.fill();
}

let cachedTexture = null;

// Built once and reused by every HeartFormation instance for this page
// load (same "cache the atlas" convention as getRainGlyphAtlas).
export function getHeartParticleTexture() {
  if (cachedTexture) return cachedTexture;

  const canvas = document.createElement("canvas");
  canvas.width = CELL_SIZE;
  canvas.height = CELL_SIZE;

  const ctx = canvas.getContext("2d");
  drawGlowHeart(ctx, CELL_SIZE);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  cachedTexture = texture;
  return texture;
}
