import * as THREE from "three";

import {
  PHOTO_STICKER_CANVAS_WIDTH,
  PHOTO_STICKER_CANVAS_HEIGHT,
  PHOTO_STICKER_FRAME_MARGIN,
  PHOTO_STICKER_FRAME_COLOR,
  PHOTO_STICKER_FRAME_BORDER_COLOR,
  PHOTO_STICKER_HEART_COLOR,
  PHOTO_STICKER_HEART_SIZE,
} from "./PhotoStickerConstants";

// ===========================
// The only place responsible for turning an image source into a
// polaroid-style THREE.CanvasTexture: loading the image, cropping it
// "cover"-style into the frame's photo area, drawing the frame and its
// small heart mark, and caching + reference-counting the result so the
// same src is never loaded or redrawn twice, and is only disposed once
// nothing still uses it (safe even if setImages() is called with a
// list that overlaps the previous one).
// ===========================

// src -> { promise: Promise<THREE.CanvasTexture>, refCount: number }
const cache = new Map();

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    // Without this, drawing a cross-origin image onto the canvas below
    // taints it — WebGL then refuses to upload it as a texture at all.
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`PhotoStickerTexture: failed to load "${src}"`));
    img.src = src;
  });
}

// "cover" — fills the target box with no distortion, cropping whichever
// axis has excess rather than stretching either one.
function coverSourceRect(imgWidth, imgHeight, targetWidth, targetHeight) {
  const imgAspect = imgWidth / imgHeight;
  const targetAspect = targetWidth / targetHeight;

  if (imgAspect > targetAspect) {
    const sHeight = imgHeight;
    const sWidth = sHeight * targetAspect;

    return { sx: (imgWidth - sWidth) / 2, sy: 0, sWidth, sHeight };
  }

  const sWidth = imgWidth;
  const sHeight = sWidth / targetAspect;

  return { sx: 0, sy: (imgHeight - sHeight) / 2, sWidth, sHeight };
}

// The same small filled-heart glyph LoveIntro's own createHeartTexture
// draws (a bezier heart path), reproduced here rather than imported —
// this file has no real reason to depend on an intro-specific module
// for what's just "draw a heart" shared visual language.
function drawHeartMark(ctx, cx, cy, size, color) {
  const top = cy - size * 0.3;
  const half = size * 0.26;

  ctx.beginPath();
  ctx.moveTo(cx, top);
  ctx.bezierCurveTo(cx, top - half, cx - half * 2, top - half, cx - half * 2, top);
  ctx.bezierCurveTo(cx - half * 2, top + half * 1.3, cx, top + half * 2.2, cx, top + half * 3.2);
  ctx.bezierCurveTo(cx, top + half * 2.2, cx + half * 2, top + half * 1.3, cx + half * 2, top);
  ctx.bezierCurveTo(cx + half * 2, top - half, cx, top - half, cx, top);
  ctx.closePath();

  ctx.fillStyle = color;
  ctx.fill();
}

function drawPolaroid(img) {
  const canvas = document.createElement("canvas");
  canvas.width = PHOTO_STICKER_CANVAS_WIDTH;
  canvas.height = PHOTO_STICKER_CANVAS_HEIGHT;

  const ctx = canvas.getContext("2d");

  // The frame itself, with a soft drop shadow for a touch of depth
  // (same shadowBlur-behind-a-fill technique LoveIntro's own heart
  // glyph uses) and a thin border for definition.
  ctx.save();
  ctx.shadowColor = "rgba(255, 143, 190, 0.35)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = PHOTO_STICKER_FRAME_COLOR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  const photoX = PHOTO_STICKER_FRAME_MARGIN;
  const photoY = PHOTO_STICKER_FRAME_MARGIN;
  const photoSize = PHOTO_STICKER_CANVAS_WIDTH - PHOTO_STICKER_FRAME_MARGIN * 2;

  const { sx, sy, sWidth, sHeight } = coverSourceRect(
    img.naturalWidth || img.width,
    img.naturalHeight || img.height,
    photoSize,
    photoSize,
  );

  ctx.drawImage(img, sx, sy, sWidth, sHeight, photoX, photoY, photoSize, photoSize);

  // A thin inset border right around the photo itself — the classic
  // polaroid "photo sits inside a frame" line.
  ctx.strokeStyle = PHOTO_STICKER_FRAME_BORDER_COLOR;
  ctx.lineWidth = 2;
  ctx.strokeRect(photoX + 1, photoY + 1, photoSize - 2, photoSize - 2);

  // Outer frame border.
  ctx.strokeStyle = PHOTO_STICKER_FRAME_BORDER_COLOR;
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);

  // The small heart mark, centered in the caption strip below the
  // photo.
  const captionTop = photoY + photoSize;
  const captionCenterY = captionTop + (canvas.height - captionTop) / 2;

  drawHeartMark(ctx, canvas.width / 2, captionCenterY, PHOTO_STICKER_HEART_SIZE, PHOTO_STICKER_HEART_COLOR);

  const texture = new THREE.CanvasTexture(canvas);

  // Real photographic content, unlike this template's other hand-tuned
  // decorative canvas textures (heart glyph, petal texture, ring
  // texture) — the renderer's outputColorSpace is sRGB (see
  // engine/renderer/Renderer.js), so the source texture needs to
  // declare the same for the user's photo to come through with correct
  // color rather than looking washed out.
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}

async function buildTexture(src) {
  const img = await loadImageElement(src);
  return drawPolaroid(img);
}

// Increments `src`'s reference count, loading + drawing it exactly once
// no matter how many callers acquire the same src concurrently (the
// in-flight promise itself is what's cached, the same pattern
// AudioLoader uses for audio files).
export function acquireStickerTexture(src) {
  let entry = cache.get(src);

  if (!entry) {
    entry = { promise: buildTexture(src), refCount: 0 };
    cache.set(src, entry);
  }

  entry.refCount += 1;

  return entry.promise;
}

// Decrements `src`'s reference count; disposes the texture and drops it
// from the cache once nothing else still holds a reference to it.
export function releaseStickerTexture(src) {
  const entry = cache.get(src);
  if (!entry) return;

  entry.refCount -= 1;
  if (entry.refCount > 0) return;

  cache.delete(src);
  entry.promise.then((texture) => texture.dispose()).catch(() => {});
}
