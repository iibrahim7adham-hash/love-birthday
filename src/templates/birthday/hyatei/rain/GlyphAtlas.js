import * as THREE from "three";

// Bakes the rain's glyph set (L, O, V, E, and a heart) into one row of a
// canvas texture — a texture atlas, not one draw call per character (see
// CLAUDE.md's performance guardrail). Each particle's fragment shader
// picks its own glyph by indexing into this row (see rainFragmentShader
// in ../particles/shaders.js). White glyphs on a transparent background:
// the alpha channel is the shape mask, tinted per-particle by uColor *
// brightness at render time, which is what makes the rain's brighter/
// dimmer variation (spec section 7) possible without baking color into
// the atlas itself.
const CELL_SIZE = 128;

function drawHeart(ctx, cx, cy, size) {
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
  ctx.fill();
}

let cachedAtlas = null;

// Same 5-glyph set every time this scene loads, so the atlas is built
// once and reused rather than regenerated per rain instance.
export function getRainGlyphAtlas(glyphs) {
  if (cachedAtlas) return cachedAtlas;

  const canvas = document.createElement("canvas");
  canvas.width = CELL_SIZE * glyphs.length;
  canvas.height = CELL_SIZE;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  glyphs.forEach((glyph, i) => {
    const cx = i * CELL_SIZE + CELL_SIZE / 2;
    const cy = CELL_SIZE / 2;

    if (glyph === "heart") {
      drawHeart(ctx, cx, cy - CELL_SIZE * 0.12, CELL_SIZE * 0.42);
    } else {
      ctx.font = `700 ${CELL_SIZE * 0.62}px "Segoe UI", Arial, sans-serif`;
      ctx.fillText(glyph, cx, cy + CELL_SIZE * 0.03);
    }
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  cachedAtlas = texture;
  return texture;
}
