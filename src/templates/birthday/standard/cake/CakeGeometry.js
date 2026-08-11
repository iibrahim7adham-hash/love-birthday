import * as THREE from "three";

import {
  CAKE_BODY_COLOR,
  CAKE_CREAM_COLOR,
  CAKE_PLATE_COLOR,
  CAKE_ACCENT_PINK,
  CAKE_ACCENT_PINK_SOFT,
  CAKE_ACCENT_PINK_PALE,
  CAKE_ACCENT_ROSE,
  CANDLE_BODY_COLOR,
  CANDLE_STRIPE_COLOR,
  FLAME_COLOR,
  FLAME_GLOW_COLOR,
  PLATE_RADIUS_TOP,
  PLATE_RADIUS_BOTTOM,
  PLATE_HEIGHT,
  PLATE_Y,
  LOWER_RADIUS_TOP,
  LOWER_RADIUS_BOTTOM,
  LOWER_HEIGHT,
  LOWER_Y,
  CREAM_RING_HEIGHT,
  CREAM_RING_Y,
  UPPER_RADIUS_TOP,
  UPPER_RADIUS_BOTTOM,
  UPPER_HEIGHT,
  UPPER_Y,
  TOP_FROSTING_HEIGHT,
  TOP_FROSTING_Y,
  TOP_FROSTING_MAX_RADIUS,
  TOP_FROSTING_MIN_RADIUS,
  CANDLE_TOP_SURFACE_Y,
  CANDLE_COUNT,
  CANDLE_RING_RADIUS,
  CANDLE_HEIGHT,
  CANDLE_RADIUS,
  FLAME_HEIGHT,
  FLAME_GLOW_SCALE,
} from "./CakeConstants";

// A soft radial-gradient sprite texture for the candle flames' own
// glow-behind-flame layering — the same technique
// stickers/PhotoSticker.js already uses for its glow-behind-photo
// sprite pair, built locally here rather than cross-imported (see
// FormationSparkles.js's own comment on why).
let flameGlowTexture = null;

function getFlameGlowTexture() {
  if (flameGlowTexture) return flameGlowTexture;

  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, FLAME_GLOW_COLOR);
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  flameGlowTexture = new THREE.CanvasTexture(canvas);
  return flameGlowTexture;
}

// A "piped frosting" silhouette — tapers between two radii with a
// gentle central bulge and a light scalloped ripple, rather than a
// flat cylinder. Reused for both the cream ring between tiers and the
// top frosting dome, just with different radius/height inputs.
function buildFrostingProfile({ height, startRadius, endRadius, bulge, rippleAmount, rippleCount, steps = 22 }) {
  const points = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = t * height;

    const base = THREE.MathUtils.lerp(startRadius, endRadius, t);
    const bulgeAmount = Math.sin(t * Math.PI) * bulge;
    const ripple = Math.sin(t * Math.PI * rippleCount) * rippleAmount * Math.sin(t * Math.PI);

    points.push(new THREE.Vector2(Math.max(base + bulgeAmount + ripple, 0.02), y));
  }

  return points;
}

// A small flat heart outline, extruded a hair for a real (not painted-
// on) tiny frosting-decoration look — shared/reused for every top-of-
// cake heart accent below.
function buildHeartGeometry(size) {
  const shape = new THREE.Shape();
  shape.moveTo(0, size * 0.3);
  shape.bezierCurveTo(0, size * 0.3, -size * 0.5, -size * 0.1, -size * 0.5, -size * 0.35);
  shape.bezierCurveTo(-size * 0.5, -size * 0.65, -size * 0.2, -size * 0.85, 0, -size * 1.05);
  shape.bezierCurveTo(size * 0.2, -size * 0.85, size * 0.5, -size * 0.65, size * 0.5, -size * 0.35);
  shape.bezierCurveTo(size * 0.5, -size * 0.1, 0, size * 0.3, 0, size * 0.3);
  return new THREE.ExtrudeGeometry(shape, { depth: size * 0.35, bevelEnabled: false });
}

// Baby-pink decorative accents, added directly onto the existing lower/
// upper tier meshes and the top frosting dome as CHILD meshes — not a
// separate object/group. Being children means they automatically
// inherit whatever their parent tier is doing: the same reveal scale-in
// (CakeReveal.js's own choreography animates lowerLayer/upperLayer/
// topFrosting's own scale — a child at 0.001 scale hides right along
// with it), the same MeshStandardMaterial lighting/shading, and the
// same responsive camera framing (nothing here is sized against the
// viewport — it's sized against the cake's own local geometry, so it
// scales exactly as the cake itself does on any device). Three
// complementary pink shades (baby/soft/rose) plus ribbons, pearl rows,
// sprinkles, and a few tiny hearts — noticeably more decorated than a
// single thin trim, while cream/white still stays the dominant color.
function buildPinkAccents(lowerLayer, upperLayer, topFrosting) {
  const pinkMaterial = standardMaterial(CAKE_ACCENT_PINK, { roughness: 0.45 });
  const softPinkMaterial = standardMaterial(CAKE_ACCENT_PINK_SOFT, { roughness: 0.45 });
  const palePinkMaterial = standardMaterial(CAKE_ACCENT_PINK_PALE, { roughness: 0.5 });
  const roseMaterial = standardMaterial(CAKE_ACCENT_ROSE, { roughness: 0.4 });
  const dotGeometry = new THREE.SphereGeometry(0.038, 10, 10);
  const heartGeometry = buildHeartGeometry(0.075);
  const geometries = [dotGeometry, heartGeometry];
  const pearlMaterials = [pinkMaterial, roseMaterial];

  // ---- Lower tier: a clean pink ribbon near the top edge, a softer
  // line near the bottom edge, and a row of tiny pearls between them —
  // all following the tier's own circular curvature.
  const lowerRibbonGeometry = new THREE.TorusGeometry(LOWER_RADIUS_TOP - 0.02, 0.05, 8, 48);
  const lowerRibbon = new THREE.Mesh(lowerRibbonGeometry, pinkMaterial);
  lowerRibbon.rotation.x = Math.PI / 2;
  lowerRibbon.position.y = LOWER_HEIGHT - 0.08;
  lowerLayer.add(lowerRibbon);
  geometries.push(lowerRibbonGeometry);

  const lowerLineGeometry = new THREE.TorusGeometry(LOWER_RADIUS_BOTTOM - 0.02, 0.032, 8, 48);
  const lowerLine = new THREE.Mesh(lowerLineGeometry, softPinkMaterial);
  lowerLine.rotation.x = Math.PI / 2;
  lowerLine.position.y = 0.09;
  lowerLayer.add(lowerLine);
  geometries.push(lowerLineGeometry);

  const LOWER_PEARL_COUNT = 20;
  for (let i = 0; i < LOWER_PEARL_COUNT; i++) {
    const angle = (i / LOWER_PEARL_COUNT) * Math.PI * 2;
    const r = LOWER_RADIUS_TOP - 0.005;
    const pearl = new THREE.Mesh(dotGeometry, pearlMaterials[i % pearlMaterials.length]);
    pearl.position.set(Math.cos(angle) * r, LOWER_HEIGHT * 0.5, Math.sin(angle) * r);
    lowerLayer.add(pearl);
  }

  // ---- Upper tier: a pink border near the bottom edge, an elegant trim
  // near the top edge, and a scatter of tiny pearls around the side.
  const upperTopRibbonGeometry = new THREE.TorusGeometry(UPPER_RADIUS_TOP - 0.015, 0.032, 8, 40);
  const upperTopRibbon = new THREE.Mesh(upperTopRibbonGeometry, pinkMaterial);
  upperTopRibbon.rotation.x = Math.PI / 2;
  upperTopRibbon.position.y = UPPER_HEIGHT - 0.06;
  upperLayer.add(upperTopRibbon);
  geometries.push(upperTopRibbonGeometry);

  const upperBottomRibbonGeometry = new THREE.TorusGeometry(UPPER_RADIUS_BOTTOM - 0.015, 0.026, 8, 40);
  const upperBottomRibbon = new THREE.Mesh(upperBottomRibbonGeometry, softPinkMaterial);
  upperBottomRibbon.rotation.x = Math.PI / 2;
  upperBottomRibbon.position.y = 0.07;
  upperLayer.add(upperBottomRibbon);
  geometries.push(upperBottomRibbonGeometry);

  const UPPER_PEARL_COUNT = 16;
  for (let i = 0; i < UPPER_PEARL_COUNT; i++) {
    const angle = (i / UPPER_PEARL_COUNT) * Math.PI * 2;
    const r = UPPER_RADIUS_TOP - 0.008;
    const pearl = new THREE.Mesh(dotGeometry, pearlMaterials[i % pearlMaterials.length]);
    pearl.position.set(Math.cos(angle) * r, UPPER_HEIGHT * 0.44, Math.sin(angle) * r);
    upperLayer.add(pearl);
  }

  // ---- Top surface: sprinkles + a close ring of tiny pearls around the
  // candles, plus a few small hearts — CANDLE_RING_RADIUS is 0.5, so
  // everything here sits outside it, never crowding/covering a candle.
  const topDotMaterials = [pinkMaterial, softPinkMaterial, palePinkMaterial];
  const TOP_SPRINKLE_COUNT = 12;
  for (let i = 0; i < TOP_SPRINKLE_COUNT; i++) {
    const angle = (i / TOP_SPRINKLE_COUNT) * Math.PI * 2 + Math.random() * 0.3;
    const r = THREE.MathUtils.randFloat(0.66, 0.88);
    const sprinkle = new THREE.Mesh(dotGeometry, topDotMaterials[i % topDotMaterials.length]);
    sprinkle.scale.setScalar(0.85);
    sprinkle.position.set(Math.cos(angle) * r, TOP_FROSTING_HEIGHT * 0.46, Math.sin(angle) * r);
    topFrosting.add(sprinkle);
  }

  const TOP_PEARL_COUNT = 8;
  for (let i = 0; i < TOP_PEARL_COUNT; i++) {
    const angle = (i / TOP_PEARL_COUNT) * Math.PI * 2;
    const r = 0.58;
    const pearl = new THREE.Mesh(dotGeometry, pearlMaterials[i % pearlMaterials.length]);
    pearl.scale.setScalar(0.7);
    pearl.position.set(Math.cos(angle) * r, TOP_FROSTING_HEIGHT * 0.52, Math.sin(angle) * r);
    topFrosting.add(pearl);
  }

  const HEART_ANGLES = [Math.PI / 2.5, Math.PI * 1.15, Math.PI * 1.75];
  HEART_ANGLES.forEach((angle) => {
    const r = 0.78;
    const heart = new THREE.Mesh(heartGeometry, pinkMaterial);
    heart.rotation.x = -Math.PI / 2.3;
    heart.rotation.z = angle;
    heart.position.set(Math.cos(angle) * r, TOP_FROSTING_HEIGHT * 0.46, Math.sin(angle) * r);
    topFrosting.add(heart);
  });

  return { geometries, materials: [pinkMaterial, softPinkMaterial, palePinkMaterial, roseMaterial] };
}

function standardMaterial(color, { roughness = 0.7, metalness = 0.05, emissive, emissiveIntensity } = {}) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness,
    metalness,
    emissive: emissive ? new THREE.Color(emissive) : undefined,
    emissiveIntensity,
  });
}

// Builds every mesh the cake reveal needs and returns them as a plain,
// named structure — this file only knows "what the cake looks like",
// never "when" or "how" any part reveals itself (that's entirely
// CakeReveal.js's job). Every part starts at scale 0.001 (so the reveal
// choreography can scale each one in independently, the same "start
// tiny, animate to full scale" convention stickers/PhotoSticker.js's
// own entrance already uses) AND visible = false. The scale alone isn't
// enough to hide a part: GSAP writes a tween's target values as soon as
// the timeline is built, not only once the playhead reaches it, so
// every part's scale gets touched well before its own formation step —
// visible stays the actual gate on whether a part renders at all, and
// CakeReveal.js's own _revealPart flips it to true at the exact moment
// that part's formation step begins.
export default function buildCake() {
  const group = new THREE.Group();

  // ---- Plate / stand.
  // CylinderGeometry is centered on its own local origin by default. The
  // frosting layers below (creamRing/topFrosting) instead use a
  // LatheGeometry profile whose points already start at local y=0, so
  // their own local origin sits at their BASE — which is why their
  // position.y subtracts half their height (anchoring that base at the
  // correct world Y) and why GSAP scaling them grows upward from where
  // they rest. Translating each cylinder's geometry the same way keeps
  // every cake part on one consistent "scale pivot = the part's own
  // base" convention, so nothing appears to hover independent of the
  // piece it sits on while the formation scale-in is still mid-tween.
  const plateGeometry = new THREE.CylinderGeometry(PLATE_RADIUS_TOP, PLATE_RADIUS_BOTTOM, PLATE_HEIGHT, 48);
  plateGeometry.translate(0, PLATE_HEIGHT / 2, 0);
  const plate = new THREE.Mesh(plateGeometry, standardMaterial(CAKE_PLATE_COLOR, { roughness: 0.35, metalness: 0.6 }));
  plate.position.y = PLATE_Y - PLATE_HEIGHT / 2;
  plate.scale.setScalar(0.001);
  plate.visible = false;
  group.add(plate);

  // ---- Lower tier.
  const lowerGeometry = new THREE.CylinderGeometry(LOWER_RADIUS_TOP, LOWER_RADIUS_BOTTOM, LOWER_HEIGHT, 40);
  lowerGeometry.translate(0, LOWER_HEIGHT / 2, 0);
  const lowerLayer = new THREE.Mesh(lowerGeometry, standardMaterial(CAKE_BODY_COLOR, { roughness: 0.75 }));
  lowerLayer.position.y = LOWER_Y - LOWER_HEIGHT / 2;
  lowerLayer.scale.setScalar(0.001);
  lowerLayer.visible = false;
  group.add(lowerLayer);

  // ---- Cream ring between tiers.
  const creamProfile = buildFrostingProfile({
    height: CREAM_RING_HEIGHT,
    startRadius: LOWER_RADIUS_TOP,
    endRadius: UPPER_RADIUS_BOTTOM,
    bulge: 0.12,
    rippleAmount: 0.03,
    rippleCount: 5,
  });
  const creamRing = new THREE.Mesh(
    new THREE.LatheGeometry(creamProfile, 40),
    standardMaterial(CAKE_CREAM_COLOR, { roughness: 0.55 }),
  );
  creamRing.position.y = CREAM_RING_Y - CREAM_RING_HEIGHT / 2;
  creamRing.scale.setScalar(0.001);
  creamRing.visible = false;
  group.add(creamRing);

  // ---- Upper tier.
  const upperGeometry = new THREE.CylinderGeometry(UPPER_RADIUS_TOP, UPPER_RADIUS_BOTTOM, UPPER_HEIGHT, 36);
  upperGeometry.translate(0, UPPER_HEIGHT / 2, 0);
  const upperLayer = new THREE.Mesh(upperGeometry, standardMaterial(CAKE_BODY_COLOR, { roughness: 0.75 }));
  upperLayer.position.y = UPPER_Y - UPPER_HEIGHT / 2;
  upperLayer.scale.setScalar(0.001);
  upperLayer.visible = false;
  group.add(upperLayer);

  // ---- Top frosting dome.
  const topProfile = buildFrostingProfile({
    height: TOP_FROSTING_HEIGHT,
    startRadius: TOP_FROSTING_MAX_RADIUS,
    endRadius: TOP_FROSTING_MIN_RADIUS,
    bulge: 0.05,
    rippleAmount: 0.02,
    rippleCount: 6,
  });
  const topFrosting = new THREE.Mesh(
    new THREE.LatheGeometry(topProfile, 36),
    standardMaterial(CAKE_CREAM_COLOR, { roughness: 0.5 }),
  );
  topFrosting.position.y = TOP_FROSTING_Y - TOP_FROSTING_HEIGHT / 2;
  topFrosting.scale.setScalar(0.001);
  topFrosting.visible = false;
  group.add(topFrosting);

  const pinkAccents = buildPinkAccents(lowerLayer, upperLayer, topFrosting);

  // ---- Candles + flames.
  const candleMaterial = standardMaterial(CANDLE_BODY_COLOR, { roughness: 0.5 });
  const stripeMaterial = standardMaterial(CANDLE_STRIPE_COLOR, { roughness: 0.5 });
  const flameMaterial = standardMaterial(FLAME_COLOR, {
    roughness: 0.3,
    emissive: FLAME_COLOR,
    emissiveIntensity: 1.6,
  });
  const flameGlowMaterial = new THREE.SpriteMaterial({
    map: getFlameGlowTexture(),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const candles = [];
  const flames = [];

  for (let i = 0; i < CANDLE_COUNT; i++) {
    // +PI/2 offset: with an odd candle count and a front-facing camera
    // looking down -Z, starting the ring at angle 0 puts two symmetric
    // pairs at identical X (only differing in depth), so two of the
    // five visually overlap into what reads as a single candle from
    // the hero framing. Rotating the whole ring a quarter turn gives
    // every candle a distinct on-screen X position instead.
    const angle = (i / CANDLE_COUNT) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(angle) * CANDLE_RING_RADIUS;
    const z = Math.sin(angle) * CANDLE_RING_RADIUS;

    const candleGroup = new THREE.Group();
    candleGroup.position.set(x, CANDLE_TOP_SURFACE_Y, z);
    candleGroup.scale.setScalar(0.001);
    candleGroup.visible = false;

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(CANDLE_RADIUS, CANDLE_RADIUS, CANDLE_HEIGHT, 12),
      candleMaterial,
    );
    body.position.y = CANDLE_HEIGHT / 2;
    candleGroup.add(body);

    // A single thin decorative stripe band — restrained detail, not a
    // fully patterned candle.
    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(CANDLE_RADIUS * 1.02, CANDLE_RADIUS * 1.02, CANDLE_HEIGHT * 0.16, 12),
      stripeMaterial,
    );
    stripe.position.y = CANDLE_HEIGHT * 0.62;
    candleGroup.add(stripe);

    group.add(candleGroup);
    candles.push(candleGroup);

    // Flame: a small warm cone (the visible tip) plus an additive glow
    // sprite behind it — the same glow-behind-object layering
    // stickers/PhotoSticker.js already uses, not a fire simulation.
    const flameGroup = new THREE.Group();
    flameGroup.position.set(x, CANDLE_TOP_SURFACE_Y + CANDLE_HEIGHT, z);
    flameGroup.scale.setScalar(0.001);
    flameGroup.visible = false;
    // Read by CakeReveal.update()'s own per-frame flicker — a per-flame
    // random phase/speed so all five don't flicker in lockstep.
    flameGroup.userData.flickerPhase = Math.random() * Math.PI * 2;
    flameGroup.userData.flickerSpeed = THREE.MathUtils.randFloat(2.5, 4);

    const glow = new THREE.Sprite(flameGlowMaterial.clone());
    glow.scale.setScalar(FLAME_GLOW_SCALE);
    glow.position.y = FLAME_HEIGHT * 0.4;
    flameGroup.add(glow);

    const tip = new THREE.Mesh(new THREE.ConeGeometry(FLAME_HEIGHT * 0.32, FLAME_HEIGHT, 10), flameMaterial);
    tip.position.y = FLAME_HEIGHT / 2;
    flameGroup.add(tip);

    group.add(flameGroup);
    flames.push({ group: flameGroup, glow, tip });
  }

  group.position.y = 0;

  return {
    group,
    plate,
    lowerLayer,
    creamRing,
    upperLayer,
    topFrosting,
    candles,
    flames,
    pinkAccents,
    // candleMaterial/stripeMaterial/flameMaterial are each shared
    // across all CANDLE_COUNT candles/flames (one material, many
    // meshes) — kept here so disposeCake() can dispose each exactly
    // once rather than once per mesh that references it.
    sharedMaterials: { candleMaterial, stripeMaterial, flameMaterial },
  };
}

// Disposes every geometry/material this module created — called once
// by CakeReveal.destroy(). Instanced/shared caches (the glow texture)
// are left alone, matching the same "shared caches outlive any single
// instance" convention stickers/PhotoStickerTexture.js already
// establishes for its own cache.
export function disposeCake(cake) {
  cake.plate.geometry.dispose();
  cake.plate.material.dispose();

  cake.lowerLayer.geometry.dispose();
  cake.lowerLayer.material.dispose();

  cake.creamRing.geometry.dispose();
  cake.creamRing.material.dispose();

  cake.upperLayer.geometry.dispose();
  cake.upperLayer.material.dispose();

  cake.topFrosting.geometry.dispose();
  cake.topFrosting.material.dispose();

  cake.pinkAccents.geometries.forEach((geometry) => geometry.dispose());
  cake.pinkAccents.materials.forEach((material) => material.dispose());

  cake.candles.forEach((candleGroup) => {
    candleGroup.children.forEach((mesh) => mesh.geometry.dispose());
  });

  cake.flames.forEach(({ tip, glow }) => {
    tip.geometry.dispose();
    // tip.material is the shared flameMaterial, disposed once below.
    glow.material.dispose(); // each flame's own cloned glow material
  });

  cake.sharedMaterials.candleMaterial.dispose();
  cake.sharedMaterials.stripeMaterial.dispose();
  cake.sharedMaterials.flameMaterial.dispose();
}
