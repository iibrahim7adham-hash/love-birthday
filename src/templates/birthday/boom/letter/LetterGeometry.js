import * as THREE from "three";

import { getHeartTexture } from "../heartburst/HeartTextures";
import {
  LETTER_COLOR,
  LETTER_WIDTH,
  LETTER_HEIGHT,
  LETTER_CORNER_RADIUS,
  LETTER_THICKNESS,
  LETTER_ROUGHNESS,
  LETTER_METALNESS,
  LETTER_FLAP_COLOR,
  LETTER_FLAP_INSET,
  LETTER_FLAP_DEPTH_RATIO,
  LETTER_FLAP_THICKNESS,
  LETTER_FLAP_ROUGHNESS,
  LETTER_SEAL_COLOR,
  LETTER_SEAL_RADIUS,
  LETTER_SEAL_HEIGHT,
  LETTER_SEAL_ROUGHNESS,
  LETTER_SEAL_METALNESS,
  LETTER_SEAL_OFFSET_Y,
  LETTER_SHADOW_COLOR,
  LETTER_SHADOW_SCALE,
  LETTER_SHADOW_OFFSET_Y,
  LETTER_GLOW_COLOR,
  LETTER_GLOW_MIN,
  LETTER_DECOR_ITEMS,
  LETTER_CUE_COLOR,
  LETTER_CUE_SCALE,
  LETTER_CUE_OFFSET_X,
  LETTER_CUE_OFFSET_Y,
  MESSAGE_CARD_COLOR,
  MESSAGE_CARD_CENTER_COLOR,
  MESSAGE_CARD_EDGE_COLOR,
  MESSAGE_CARD_GOLD_ACCENT,
  MESSAGE_CARD_WIDTH,
  MESSAGE_CARD_HEIGHT,
  MESSAGE_CARD_CORNER_RADIUS,
  MESSAGE_CARD_START_Z,
  MESSAGE_CARD_START_SCALE,
  MESSAGE_HEADING_TEXT,
  MESSAGE_BODY_TEXT,
  MESSAGE_SIGNATURE_TEXT,
  MESSAGE_TEXT_COLOR,
  MESSAGE_HEADING_FONT,
  MESSAGE_BODY_FONT,
  MESSAGE_SIGNATURE_FONT,
  MESSAGE_DECOR_SCALE,
  MESSAGE_PARTICLE_COUNT,
  MESSAGE_PARTICLE_COLORS,
  MESSAGE_PARTICLE_SIZE,
  MESSAGE_PARTICLE_SPREAD,
} from "./LetterConstants";

// Pure construction only — mirrors giftbox/GiftBoxGeometry.js's own
// buildX()/disposeX() shape. Everything here lies flat in its own local
// XY plane (envelope facing +Z); Letter.js is the one that rotates the
// whole group to lie face-up inside the box. Layering along local Z
// (body -> flap -> seal, each a hair further forward) is what reads as
// "folded paper with a wax seal on top" once the group tilts up to
// face the camera.

function roundRectPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

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

// A simple triangular fold — flat top edge (inset a touch narrower than
// the body so its rounded corners still peek out beneath) coming down
// to a point, the classic envelope-flap silhouette.
function envelopeFlapShape(width, height, inset, depthRatio) {
  const w = width / 2 - inset;
  const topY = height / 2;
  const tipY = topY - height * depthRatio;

  const shape = new THREE.Shape();
  shape.moveTo(-w, topY);
  shape.lineTo(w, topY);
  shape.lineTo(0, tipY);
  shape.closePath();
  return shape;
}

// Thin extrude instead of a flat ShapeGeometry so the body/flap read as
// real paper with a visible edge, not a decal — centered on local Z so
// callers can position from the shape's own front/back faces evenly.
function extrudeCentered(shape, depth) {
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function drawHeartPath(ctx, cx, cy, size) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + size * 0.38);
  ctx.lineTo(cx - size * 0.4, cy - size * 0.08);
  ctx.lineTo(cx, cy - size * 0.2);
  ctx.lineTo(cx + size * 0.4, cy - size * 0.08);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx - size * 0.21, cy - size * 0.05, size * 0.22, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx + size * 0.21, cy - size * 0.05, size * 0.22, 0, Math.PI * 2);
  ctx.fill();
}

// A faint off-white grain — just enough irregularity that the paper
// doesn't read as a flat, perfectly even card.
function buildPaperGrainTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 900; i++) {
    const shade = 200 + Math.random() * 40;
    ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade}, 0.05)`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1.5, 1.5);
  }

  return new THREE.CanvasTexture(canvas);
}

// A soft round glow — shared by the interaction cue and the small
// floating particles, just a white radial falloff so each caller's own
// material.color/opacity tints it.
function buildGlowDotTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.5)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

// A soft blush/rose gradient (lighter center fading to a slightly
// darker rose edge) plus a fine grain and a refined double gold border —
// painted straight onto the card's own texture rather than a flat color,
// so the "premium + romantic" paper reads correctly even under the
// scene's flat (non-shadow-mapped) lighting.
function buildMessageCardTexture(aspect) {
  const width = 512;
  const height = Math.round(width * aspect);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");

  const gradient = ctx.createRadialGradient(
    width / 2, height / 2, 0,
    width / 2, height / 2, Math.max(width, height) * 0.75,
  );
  gradient.addColorStop(0, MESSAGE_CARD_CENTER_COLOR);
  gradient.addColorStop(1, MESSAGE_CARD_EDGE_COLOR);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.05})`;
    ctx.fillRect(Math.random() * width, Math.random() * height, 1.4, 1.4);
  }

  const outerInset = width * 0.045;
  ctx.strokeStyle = MESSAGE_CARD_GOLD_ACCENT;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = width * 0.006;
  roundRectPath(ctx, outerInset, outerInset, width - outerInset * 2, height - outerInset * 2, width * 0.05);
  ctx.stroke();

  const innerInset = outerInset + width * 0.014;
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = width * 0.0022;
  roundRectPath(ctx, innerInset, innerInset, width - innerInset * 2, height - innerInset * 2, width * 0.045);
  ctx.stroke();
  ctx.globalAlpha = 1;

  return new THREE.CanvasTexture(canvas);
}

// Simple greedy word-wrap against the CURRENT canvas font, used only for
// the body line (see buildMessageTextTexture() below) so it never
// overruns the card's own margins regardless of copy length.
function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";

  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });
  if (line) lines.push(line);

  return lines;
}

// The placeholder message — an elegant serif heading, a clean
// word-wrapped body, and a signature line, drawn onto its own small
// canvas texture so it stays a real in-scene plane (see
// buildMessageCard() below) rather than an HTML overlay. Dark
// rose/burgundy ink rather than plain black, comfortable margins/line
// spacing rather than one centered line.
function buildMessageTextTexture(aspect) {
  const width = 640;
  const height = Math.round(width * aspect);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = MESSAGE_TEXT_COLOR;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  const marginX = width * 0.14;
  const maxTextWidth = width - marginX * 2;

  ctx.font = MESSAGE_HEADING_FONT;
  ctx.fillText(MESSAGE_HEADING_TEXT, width / 2, height * 0.22);

  ctx.font = MESSAGE_BODY_FONT;
  const bodyLineHeight = height * 0.1;
  const bodyLines = wrapText(ctx, MESSAGE_BODY_TEXT, maxTextWidth);
  const bodyStartY = height * 0.46;
  bodyLines.forEach((line, i) => {
    ctx.fillText(line, width / 2, bodyStartY + i * bodyLineHeight);
  });

  ctx.font = MESSAGE_SIGNATURE_FONT;
  ctx.fillText(MESSAGE_SIGNATURE_TEXT, width / 2, height * 0.86);

  return new THREE.CanvasTexture(canvas);
}

function buildShadowTexture() {
  const size = 128;
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

// Burgundy wax with a soft offset highlight (so the CYLINDER'S flat top
// still reads as a rounded blob of wax) and a small embossed heart —
// one darker "recessed" pass plus a lighter "raised edge" pass on top,
// rather than a single flat heart silhouette.
function buildWaxSealTexture(color) {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  const highlight = ctx.createRadialGradient(size * 0.36, size * 0.32, 2, size * 0.36, size * 0.32, size * 0.55);
  highlight.addColorStop(0, "rgba(255, 255, 255, 0.4)");
  highlight.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = highlight;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
  drawHeartPath(ctx, size / 2, size / 2 + 3, size * 0.34);
  ctx.fillStyle = "rgba(255, 214, 224, 0.6)";
  drawHeartPath(ctx, size / 2, size / 2, size * 0.32);

  return new THREE.CanvasTexture(canvas);
}

// A small white polaroid frame with a pastel "photo" swatch — a
// placeholder keepsake, not a real photo (no customer image data exists
// at this stage of the scene).
function buildPolaroidTexture(tint) {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fffdf8";
  ctx.fillRect(0, 0, size, size);

  const pad = size * 0.1;
  const photoBottom = size * 0.74;
  ctx.fillStyle = tint;
  ctx.fillRect(pad, pad, size - pad * 2, photoBottom - pad);

  return new THREE.CanvasTexture(canvas);
}

// A small folded note card — a few thin hand-written-style lines on an
// off-white card, just enough to read as "a little note", not actual
// legible text (no message content exists at this stage of the scene).
function buildNoteTexture(tint) {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "rgba(120, 90, 70, 0.35)";
  ctx.lineWidth = 3;
  const lineXs = [size * 0.22, size * 0.65, size * 0.4];
  [size * 0.32, size * 0.5, size * 0.68].forEach((y, i) => {
    ctx.beginPath();
    ctx.moveTo(size * 0.18, y);
    ctx.lineTo(lineXs[i], y);
    ctx.stroke();
  });

  ctx.fillStyle = "rgba(232, 96, 122, 0.55)";
  drawHeartPath(ctx, size * 0.78, size * 0.28, size * 0.14);

  return new THREE.CanvasTexture(canvas);
}

function buildFlowerTexture(color) {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  const cx = size / 2;
  const cy = size / 2;
  const petalRadius = size * 0.22;
  const petalDist = size * 0.2;

  ctx.fillStyle = color;
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(angle) * petalDist, cy + Math.sin(angle) * petalDist, petalRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#ffe8a3";
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.13, 0, Math.PI * 2);
  ctx.fill();

  return new THREE.CanvasTexture(canvas);
}

function buildDecorItem(item) {
  let mesh;

  if (item.type === "heart") {
    mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(item.scale, item.scale),
      new THREE.MeshBasicMaterial({ map: getHeartTexture(), color: item.color, transparent: true }),
    );
  } else if (item.type === "polaroid") {
    mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(item.scale, item.scale),
      new THREE.MeshBasicMaterial({ map: buildPolaroidTexture(item.tint), transparent: true }),
    );
  } else if (item.type === "note") {
    mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(item.scale, item.scale * 0.75),
      new THREE.MeshBasicMaterial({ map: buildNoteTexture(item.tint), transparent: true }),
    );
  } else if (item.type === "tape") {
    mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(item.scale, item.scale * 0.4),
      new THREE.MeshBasicMaterial({ color: item.color, transparent: true, opacity: 0.75, depthWrite: false }),
    );
  } else {
    mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(item.scale, item.scale),
      new THREE.MeshBasicMaterial({ map: buildFlowerTexture(item.color), transparent: true }),
    );
  }

  mesh.position.set(item.x, item.z, 0.001);
  mesh.rotation.z = item.rotation;
  mesh.userData.type = item.type;
  return mesh;
}

// ---- Part 7 — the cream message card that rises out of the opened
// envelope, plus its own small corner ornaments. Starts tucked flat/
// small (see Letter.js's own _playOpenSequence()) and is parented
// straight onto the envelope's own group, so it inherits its resting
// position/tilt on the box floor for free.
function buildMessageCard() {
  const group = new THREE.Group();

  const cardBackMaterial = new THREE.MeshStandardMaterial({
    color: MESSAGE_CARD_EDGE_COLOR,
    roughness: LETTER_ROUGHNESS,
    metalness: 0,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });
  const cardBack = new THREE.Mesh(
    new THREE.ShapeGeometry(roundedRectShape(MESSAGE_CARD_WIDTH * 1.08, MESSAGE_CARD_HEIGHT * 1.08, MESSAGE_CARD_CORNER_RADIUS)),
    cardBackMaterial,
  );
  cardBack.position.set(0.012, -0.012, -0.004);
  cardBack.rotation.z = 0.035;
  group.add(cardBack);

  const cardMaterial = new THREE.MeshStandardMaterial({
    color: MESSAGE_CARD_COLOR,
    map: buildMessageCardTexture(MESSAGE_CARD_HEIGHT / MESSAGE_CARD_WIDTH),
    roughness: 0.82,
    metalness: 0,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });
  const card = new THREE.Mesh(
    new THREE.ShapeGeometry(roundedRectShape(MESSAGE_CARD_WIDTH, MESSAGE_CARD_HEIGHT, MESSAGE_CARD_CORNER_RADIUS)),
    cardMaterial,
  );
  group.add(card);

  const textMaterial = new THREE.MeshBasicMaterial({
    map: buildMessageTextTexture(MESSAGE_CARD_HEIGHT / MESSAGE_CARD_WIDTH),
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const textPlane = new THREE.Mesh(new THREE.PlaneGeometry(MESSAGE_CARD_WIDTH * 0.86, MESSAGE_CARD_HEIGHT * 0.86), textMaterial);
  textPlane.position.z = 0.003;
  group.add(textPlane);

  const decorGroup = new THREE.Group();
  const decorMaterials = [];
  [
    { type: "flower", x: -MESSAGE_CARD_WIDTH / 2 + 0.09, z: MESSAGE_CARD_HEIGHT / 2 - 0.07, rotation: -0.2, color: "#f2b6c6" },
    { type: "heart", x: MESSAGE_CARD_WIDTH / 2 - 0.09, z: MESSAGE_CARD_HEIGHT / 2 - 0.07, rotation: 0.2, color: "#e8607a" },
    { type: "heart", x: -MESSAGE_CARD_WIDTH / 2 + 0.09, z: -MESSAGE_CARD_HEIGHT / 2 + 0.07, rotation: 0.15, color: "#f5a0b3" },
    { type: "flower", x: MESSAGE_CARD_WIDTH / 2 - 0.09, z: -MESSAGE_CARD_HEIGHT / 2 + 0.07, rotation: -0.15, color: "#ffcf7a" },
  ].forEach((item) => {
    const mesh = buildDecorItem({ ...item, scale: MESSAGE_DECOR_SCALE });
    mesh.position.z = 0.004;
    mesh.material.opacity = 0;
    decorMaterials.push(mesh.material);
    decorGroup.add(mesh);
  });
  group.add(decorGroup);

  return { group, cardBack, cardBackMaterial, card, cardMaterial, textPlane, textMaterial, decorGroup, decorMaterials };
}

// ---- Part 7 — a very small, one-shot burst of soft warm particles
// (see Letter.js's own _spawnParticles()) — shared texture, per-sprite
// material so each one can fade independently.
function buildParticles() {
  const texture = buildGlowDotTexture();
  const group = new THREE.Group();
  const materials = [];

  for (let i = 0; i < MESSAGE_PARTICLE_COUNT; i++) {
    const color = MESSAGE_PARTICLE_COLORS[i % MESSAGE_PARTICLE_COLORS.length];
    const material = new THREE.SpriteMaterial({ map: texture, color, transparent: true, opacity: 0, depthWrite: false });
    const sprite = new THREE.Sprite(material);
    const scale = MESSAGE_PARTICLE_SIZE * (0.7 + Math.random() * 0.6);
    sprite.scale.set(scale, scale, 1);
    sprite.position.set(
      (Math.random() - 0.5) * MESSAGE_PARTICLE_SPREAD,
      (Math.random() - 0.5) * MESSAGE_PARTICLE_SPREAD * 0.7,
      0.02 + Math.random() * 0.05,
    );
    materials.push(material);
    group.add(sprite);
  }

  return { group, materials, texture };
}

export default function buildLetter() {
  const group = new THREE.Group();

  // ---- Envelope body — real thickness via a thin extrude, not a flat
  // card (see extrudeCentered() above), so the tilted camera view
  // actually reads an edge along the paper.
  const paperMaterial = new THREE.MeshStandardMaterial({
    color: LETTER_COLOR,
    map: buildPaperGrainTexture(),
    roughness: LETTER_ROUGHNESS,
    metalness: LETTER_METALNESS,
    emissive: new THREE.Color(LETTER_GLOW_COLOR),
    emissiveIntensity: LETTER_GLOW_MIN,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });

  const paper = new THREE.Mesh(
    extrudeCentered(roundedRectShape(LETTER_WIDTH, LETTER_HEIGHT, LETTER_CORNER_RADIUS), LETTER_THICKNESS),
    paperMaterial,
  );
  group.add(paper);

  // ---- Folded flap — sits a hair in front of the body's own front
  // face (LETTER_THICKNESS / 2), inset narrower so the body's rounded
  // top corners still show, reading as paper folded down over the body.
  const flapMaterial = new THREE.MeshStandardMaterial({
    color: LETTER_FLAP_COLOR,
    roughness: LETTER_FLAP_ROUGHNESS,
    metalness: LETTER_METALNESS,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });
  const flap = new THREE.Mesh(
    extrudeCentered(
      envelopeFlapShape(LETTER_WIDTH, LETTER_HEIGHT, LETTER_FLAP_INSET, LETTER_FLAP_DEPTH_RATIO),
      LETTER_FLAP_THICKNESS,
    ),
    flapMaterial,
  );

  // ---- Flap hinge — a pivot at the flap's own fold line (its flat top
  // edge, matching the body's own top edge) so rotating it swings the
  // flap open around that real fold rather than around the body's own
  // center (see Part 7's own LETTER_FLAP_OPEN_ANGLE for the actual open
  // tween, in Letter.js). Built the same way GiftBoxGeometry.js's own
  // lidHinge is: position the pivot at the fold line, then shift the
  // mesh by the inverse offset so its own fold-line vertices land back
  // on the pivot's local origin.
  const flapHinge = new THREE.Group();
  flapHinge.position.set(0, LETTER_HEIGHT / 2, LETTER_THICKNESS / 2 + LETTER_FLAP_THICKNESS / 2 + 0.001);
  flap.position.set(0, -LETTER_HEIGHT / 2, 0);
  flapHinge.add(flap);
  group.add(flapHinge);

  // ---- Wax seal — a short cylinder (real 3D depth, not a flat decal)
  // sitting right where the flap's own tip meets the body, rotated so
  // its circular caps face along local Z the same way the flap/body do.
  const sealMaterial = new THREE.MeshStandardMaterial({
    color: LETTER_SEAL_COLOR,
    map: buildWaxSealTexture(LETTER_SEAL_COLOR),
    roughness: LETTER_SEAL_ROUGHNESS,
    metalness: LETTER_SEAL_METALNESS,
    transparent: true,
    opacity: 0,
  });
  const sealGeometry = new THREE.CylinderGeometry(LETTER_SEAL_RADIUS, LETTER_SEAL_RADIUS, LETTER_SEAL_HEIGHT, 24);
  sealGeometry.rotateX(Math.PI / 2);
  const seal = new THREE.Mesh(sealGeometry, sealMaterial);
  const flapTipY = LETTER_HEIGHT / 2 - LETTER_HEIGHT * LETTER_FLAP_DEPTH_RATIO;
  const flapFrontZ = flapHinge.position.z;
  seal.position.set(0, flapTipY + LETTER_SEAL_OFFSET_Y, flapFrontZ + LETTER_FLAP_THICKNESS / 2 + LETTER_SEAL_HEIGHT / 2 + 0.001);
  group.add(seal);

  // ---- Interaction cue — a small warm glow sitting just beside the
  // seal, pulsing gently (see Letter.js's own show()/destroy()) to mark
  // the envelope as tappable without a large UI button.
  const cueMaterial = new THREE.SpriteMaterial({
    map: buildGlowDotTexture(),
    color: LETTER_CUE_COLOR,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const cue = new THREE.Sprite(cueMaterial);
  cue.scale.set(LETTER_CUE_SCALE, LETTER_CUE_SCALE, 1);
  cue.position.set(LETTER_CUE_OFFSET_X, seal.position.y + LETTER_CUE_OFFSET_Y, seal.position.z + 0.05);
  group.add(cue);

  const shadowMaterial = new THREE.MeshBasicMaterial({
    map: buildShadowTexture(),
    color: LETTER_SHADOW_COLOR,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(LETTER_WIDTH * LETTER_SHADOW_SCALE, LETTER_HEIGHT * LETTER_SHADOW_SCALE),
    shadowMaterial,
  );
  shadow.position.set(0, LETTER_SHADOW_OFFSET_Y, -LETTER_THICKNESS / 2 - 0.002);
  group.add(shadow);

  const decorGroup = new THREE.Group();
  const decorMaterials = [];
  LETTER_DECOR_ITEMS.forEach((item) => {
    const mesh = buildDecorItem(item);
    mesh.material.opacity = 0;
    decorMaterials.push(mesh.material);
    decorGroup.add(mesh);
  });
  group.add(decorGroup);

  const messageCard = buildMessageCard();
  messageCard.group.position.z = MESSAGE_CARD_START_Z;
  messageCard.group.scale.setScalar(MESSAGE_CARD_START_SCALE);
  group.add(messageCard.group);

  const particles = buildParticles();
  group.add(particles.group);

  return {
    group,
    paper,
    paperMaterial,
    flap,
    flapHinge,
    flapMaterial,
    seal,
    sealMaterial,
    cue,
    cueMaterial,
    shadow,
    shadowMaterial,
    decorGroup,
    decorMaterials,
    messageCard,
    particles,
  };
}

export function disposeLetter({
  paper,
  paperMaterial,
  flap,
  flapMaterial,
  seal,
  sealMaterial,
  cueMaterial,
  shadow,
  shadowMaterial,
  decorGroup,
  decorMaterials,
  messageCard,
  particles,
}) {
  paper.geometry.dispose();
  paperMaterial.map?.dispose();
  paperMaterial.dispose();

  flap.geometry.dispose();
  flapMaterial.dispose();

  seal.geometry.dispose();
  sealMaterial.map?.dispose();
  sealMaterial.dispose();

  cueMaterial.map?.dispose();
  cueMaterial.dispose();

  shadow.geometry.dispose();
  shadowMaterial.map?.dispose();
  shadowMaterial.dispose();

  decorGroup.children.forEach((mesh) => mesh.geometry.dispose());
  decorMaterials.forEach((material) => {
    material.map?.dispose();
    material.dispose();
  });

  messageCard.cardBack.geometry.dispose();
  messageCard.cardBackMaterial.dispose();
  messageCard.card.geometry.dispose();
  messageCard.cardMaterial.map?.dispose();
  messageCard.cardMaterial.dispose();
  messageCard.textPlane.geometry.dispose();
  messageCard.textMaterial.map?.dispose();
  messageCard.textMaterial.dispose();
  messageCard.decorGroup.children.forEach((mesh) => mesh.geometry.dispose());
  messageCard.decorMaterials.forEach((material) => {
    material.map?.dispose();
    material.dispose();
  });

  particles.texture.dispose();
  particles.group.children.forEach((sprite) => sprite.material.dispose());
}
