import { PHOTO_STICKER_DEFAULT_COUNT } from "./PhotoStickerConstants";

// Tiny synthetic placeholder images — used only until real customer
// photos are wired up (see LoveScene.js). Each is a small solid-color
// square encoded as a data URI, so PhotoStickerTexture's normal
// load-then-cover-crop path is exercised exactly as it would be for a
// real photo, with zero network dependency. Swapping to real photos
// later is just passing a different `images` array — nothing in the
// sticker subsystem itself needs to change.
const PLACEHOLDER_COLORS = [
  "#f7b3c2",
  "#e8a0bd",
  "#f4c9d6",
  "#d98ea8",
  "#f9d3de",
  "#e2a6c4",
  "#f0b8cf",
  "#d68fae",
];

function createPlaceholderDataUrl(color) {
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 4;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 4, 4);

  return canvas.toDataURL();
}

export function createPlaceholderImages(count = PHOTO_STICKER_DEFAULT_COUNT) {
  return Array.from({ length: count }, (_, i) =>
    createPlaceholderDataUrl(PLACEHOLDER_COLORS[i % PLACEHOLDER_COLORS.length]),
  );
}
