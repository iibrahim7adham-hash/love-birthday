import * as THREE from "three";

import {
  PHOTO_CARD_COLOR,
  PHOTO_CARD_WIDTH,
  PHOTO_CARD_HEIGHT,
  PHOTO_CARD_CORNER_RADIUS,
  PHOTO_CARD_THICKNESS,
  PHOTO_CARD_ROUGHNESS,
  PHOTO_CARD_METALNESS,
  PHOTO_INSET_SIDE_MARGIN,
  PHOTO_INSET_TOP_MARGIN,
  PHOTO_INSET_BOTTOM_MARGIN,
  PHOTO_SHADOW_COLOR,
  PHOTO_SHADOW_SCALE,
  PHOTO_CARDS,
} from "./PhotoPlaceholderConstants";

// Pure construction only — mirrors giftbox/GiftBoxGeometry.js's own
// buildX()/disposeX() shape. Builds all three cards as one call so the
// (identically-sized) card/inset/shadow geometry and the shared shadow
// material/texture can be built ONCE and reused across all three mesh
// instances — each card still gets its own independent Group/meshes
// (needed so a later part can raycast/animate each one on its own), just
// without tripling the geometry/texture memory for shapes that are
// pixel-for-pixel identical across all three.

function roundedRectShape(width, height, radius) {
  const w = width / 2;
  const h = height / 2;
  const r = Math.min(radius, w, h);

  const shape = new THREE.Shape();
  shape.moveTo(-w + r, -h);
  shape.lineTo(w - r, -h);
  shape.quadraticCurveTo(w, -h, w, -h + r);
  shape.lineTo(w, h - r);
  shape.quadraticCurveTo(w, h, w - r, h);
  shape.lineTo(-w + r, h);
  shape.quadraticCurveTo(-w, h, -w, h - r);
  shape.lineTo(-w, -h + r);
  shape.quadraticCurveTo(-w, -h, -w + r, -h);

  return shape;
}

function extrudeCentered(shape, depth) {
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

// A small, cheap radial-gradient plane — the same faked-shadow technique
// letter/LetterGeometry.js's own buildShadowTexture() already uses, just
// smaller since this is a placeholder-scale shadow, not a hero asset.
function buildShadowTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
  gradient.addColorStop(0.6, "rgba(0, 0, 0, 0.5)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

// Part 11 — real photo textures. One shared loader (three's own
// TextureLoader is stateless/reusable across many `.load()` calls) so
// loading all 3 photos never means 3 separate loader instances. Called
// once per card at construction time — well before the افتحي sequence
// ever reaches PHOTO 1 — so decoding/upload happens ahead of the first
// reveal instead of hitching on it; nothing here ever re-loads or
// re-creates a texture later (PhotoPlaceholders.js's own animations
// only ever tween position/scale/opacity on the material this texture
// is attached to, never the texture itself).
const textureLoader = new THREE.TextureLoader();

// "Cover" crop via UV repeat/offset (no canvas redraw, no distortion,
// no stretching) — the same strategy CSS background-size:cover uses —
// so a photo with a different aspect ratio than the inset still fills
// it naturally, just cropped on whichever axis has the excess.
function loadPhotoTexture(src, material, targetWidth, targetHeight) {
  const texture = textureLoader.load(src, () => {
    const { naturalWidth, naturalHeight } = texture.image;
    const imageAspect = naturalWidth / naturalHeight;
    const targetAspect = targetWidth / targetHeight;

    if (imageAspect > targetAspect) {
      texture.repeat.set(targetAspect / imageAspect, 1);
      texture.offset.set((1 - targetAspect / imageAspect) / 2, 0);
    } else {
      texture.repeat.set(1, imageAspect / targetAspect);
      texture.offset.set(0, (1 - imageAspect / targetAspect) / 2);
    }

    // Only swapped in on successful load — until then (or if the load
    // fails) the card keeps showing its own `tint` fallback color
    // rather than going blank.
    material.map = texture;
    material.color.set(0xffffff);
    material.needsUpdate = true;
  });

  // Real photographic content, unlike this file's other hand-drawn
  // canvas textures — the renderer's outputColorSpace is sRGB (see
  // engine/renderer/Renderer.js), so the source texture needs to
  // declare the same or the photo comes through washed out.
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  // Cards lie flat and are viewed at a steep, oblique angle, which is
  // exactly the case regular mipmapping blurs hardest — anisotropic
  // filtering keeps the photo crisp at that angle instead of averaging
  // it down. Three clamps this to the GPU's real max automatically, so
  // asking for 16 is safe even on hardware that supports less.
  texture.anisotropy = 16;

  return texture;
}

export default function buildPhotoPlaceholders() {
  const group = new THREE.Group();

  // Shared across all three cards — identical shape/size, so one
  // geometry/material per part is all that's ever needed.
  const cardGeometry = extrudeCentered(
    roundedRectShape(PHOTO_CARD_WIDTH, PHOTO_CARD_HEIGHT, PHOTO_CARD_CORNER_RADIUS),
    PHOTO_CARD_THICKNESS,
  );
  const cardMaterial = new THREE.MeshStandardMaterial({
    color: PHOTO_CARD_COLOR,
    roughness: PHOTO_CARD_ROUGHNESS,
    metalness: PHOTO_CARD_METALNESS,
    transparent: true,
    opacity: 0,
  });

  const insetWidth = PHOTO_CARD_WIDTH - PHOTO_INSET_SIDE_MARGIN * 2;
  const insetHeight = PHOTO_CARD_HEIGHT - PHOTO_INSET_TOP_MARGIN - PHOTO_INSET_BOTTOM_MARGIN;
  const insetGeometry = new THREE.PlaneGeometry(insetWidth, insetHeight);
  const insetOffsetY = (PHOTO_INSET_BOTTOM_MARGIN - PHOTO_INSET_TOP_MARGIN) / 2;

  const shadowTexture = buildShadowTexture();
  const shadowGeometry = new THREE.PlaneGeometry(PHOTO_CARD_WIDTH * PHOTO_SHADOW_SCALE, PHOTO_CARD_HEIGHT * PHOTO_SHADOW_SCALE);
  const shadowMaterial = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    color: PHOTO_SHADOW_COLOR,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });

  const cards = PHOTO_CARDS.map((config) => {
    const cardGroup = new THREE.Group();
    cardGroup.position.set(config.x, config.y, config.z);
    // Lies flat on the box's own floor the same way the envelope does
    // (see LetterConstants.js's own comment on LETTER_TILT_*) — a -90°
    // base tilt so the card's own XY-plane faces up, plus small per-card
    // extra tilts so the three never read as perfectly flat/aligned.
    cardGroup.rotation.set(-Math.PI / 2 + config.tiltXExtra, config.tiltY, config.rotationZ);

    // Captured once, right after the card's own resting pose is set —
    // PhotoPlaceholders.js's own _closeCard() (Part 8.2) uses these to
    // fly a focused card back to EXACTLY where it started, without
    // needing to re-derive that pose later. `.quaternion` is already
    // in sync with the `.rotation.set()` call just above (Three.js
    // keeps both representations linked automatically).
    const originalLocalPosition = cardGroup.position.clone();
    const originalLocalQuaternion = cardGroup.quaternion.clone();

    const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadow.position.z = -PHOTO_CARD_THICKNESS / 2 - 0.002;
    cardGroup.add(shadow);

    const card = new THREE.Mesh(cardGeometry, cardMaterial);
    cardGroup.add(card);

    const insetMaterial = new THREE.MeshBasicMaterial({ color: config.tint, transparent: true, opacity: 0 });
    const inset = new THREE.Mesh(insetGeometry, insetMaterial);
    inset.position.set(0, insetOffsetY, PHOTO_CARD_THICKNESS / 2 + 0.002);
    cardGroup.add(inset);

    if (config.src) loadPhotoTexture(config.src, insetMaterial, insetWidth, insetHeight);

    // Hidden/scaled-down until PhotoPlaceholders.show() reveals it —
    // matches the entrance pattern giftbox/GiftBox.js and letter/Letter.js
    // both already use.
    cardGroup.visible = false;

    return { group: cardGroup, card, inset, insetMaterial, originalLocalPosition, originalLocalQuaternion };
  });

  cards.forEach(({ group: cardGroup }) => group.add(cardGroup));

  return {
    group,
    cards,
    cardGeometry,
    cardMaterial,
    insetGeometry,
    shadowGeometry,
    shadowMaterial,
    shadowTexture,
  };
}

export function disposePhotoPlaceholders({ cards, cardGeometry, cardMaterial, insetGeometry, shadowGeometry, shadowMaterial, shadowTexture }) {
  cardGeometry.dispose();
  cardMaterial.dispose();
  insetGeometry.dispose();
  shadowGeometry.dispose();
  shadowMaterial.dispose();
  shadowTexture.dispose();

  cards.forEach(({ insetMaterial }) => {
    insetMaterial.map?.dispose();
    insetMaterial.dispose();
  });
}
