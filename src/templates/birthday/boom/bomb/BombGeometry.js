import * as THREE from "three";

import { getSparkTexture } from "./BombTextures";
import {
  BOMB_BODY_COLOR,
  BOMB_EYE_COLOR,
  BOMB_MOUTH_COLOR,
  BOMB_CHEEK_COLOR,
  BOMB_CAP_COLOR,
  BOMB_FUSE_COLOR,
  BOMB_SPARK_CORE_COLOR,
  BOMB_SHADOW_COLOR,
  BOMB_RADIUS,
  BOMB_EYE_RADIUS,
  BOMB_EYE_OFFSET_X,
  BOMB_EYE_OFFSET_Y,
  BOMB_CHEEK_RADIUS,
  BOMB_CHEEK_SQUASH,
  BOMB_CHEEK_OFFSET_X,
  BOMB_CHEEK_OFFSET_Y,
  BOMB_CHEEK_TILT,
  BOMB_MOUTH_RADIUS,
  BOMB_MOUTH_THICKNESS,
  BOMB_MOUTH_OFFSET_Y,
  BOMB_MOUTH_ARC_START,
  BOMB_MOUTH_ARC_LENGTH,
  BOMB_MOUTH_SURPRISED_RADIUS,
  BOMB_CAP_WIDTH,
  BOMB_CAP_HEIGHT,
  BOMB_CAP_CORNER_RADIUS,
  BOMB_CAP_OFFSET_Y,
  BOMB_FUSE_LENGTH,
  BOMB_FUSE_RADIUS,
  BOMB_FUSE_LEAN,
  BOMB_FUSE_OFFSET_Y,
  BOMB_SPARK_SIZE,
  BOMB_SHADOW_RADIUS,
  BOMB_SHADOW_SQUASH,
  BOMB_SHADOW_OFFSET_Y,
  BOMB_SHADOW_OPACITY,
} from "./BombConstants";

// Pure construction only — no animation, no scene/timeline logic (see
// BombIntro.js for that). Mirrors standard/cake/CakeGeometry.js's own
// buildCake()/disposeCake() shape exactly: a plain default-exported
// builder plus a matching disposer, returning flat references the
// orchestrator can read/animate directly.
//
// Deliberately flat MeshBasicMaterial everywhere, no scene lighting —
// the brief is explicit that this stays a simple flat/cartoon
// character, not a lit 3D object; with no lights, geometry curvature
// (e.g. the fuse's capsule) never actually shades, so every part
// already reads as a clean flat-color silhouette without needing
// canvas-texture artwork for shapes plain geometry already covers.

function createRoundedRectShape(width, height, radius) {
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

function basicMaterial(color, extra) {
  return new THREE.MeshBasicMaterial({ color, ...extra });
}

export default function buildBomb() {
  const bombGroup = new THREE.Group();

  // ---- Body
  const body = new THREE.Mesh(new THREE.CircleGeometry(BOMB_RADIUS, 64), basicMaterial(BOMB_BODY_COLOR));
  body.position.z = 0;
  bombGroup.add(body);

  // ---- Eyes — two simple white dots.
  const eyeGeometry = new THREE.CircleGeometry(BOMB_EYE_RADIUS, 24);
  const eyeMaterial = basicMaterial(BOMB_EYE_COLOR);
  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  leftEye.position.set(-BOMB_EYE_OFFSET_X, BOMB_EYE_OFFSET_Y, 0.01);
  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial.clone());
  rightEye.position.set(BOMB_EYE_OFFSET_X, BOMB_EYE_OFFSET_Y, 0.01);
  bombGroup.add(leftEye, rightEye);

  // ---- Cheeks — small angled pink ovals (a flat circle squashed +
  // rotated, no texture needed).
  const cheekGeometry = new THREE.CircleGeometry(BOMB_CHEEK_RADIUS, 20);
  const cheekMaterial = basicMaterial(BOMB_CHEEK_COLOR);
  const leftCheek = new THREE.Mesh(cheekGeometry, cheekMaterial);
  leftCheek.position.set(-BOMB_CHEEK_OFFSET_X, BOMB_CHEEK_OFFSET_Y, 0.01);
  leftCheek.scale.set(1, BOMB_CHEEK_SQUASH, 1);
  leftCheek.rotation.z = BOMB_CHEEK_TILT;
  const rightCheek = new THREE.Mesh(cheekGeometry, cheekMaterial.clone());
  rightCheek.position.set(BOMB_CHEEK_OFFSET_X, BOMB_CHEEK_OFFSET_Y, 0.01);
  rightCheek.scale.set(1, BOMB_CHEEK_SQUASH, 1);
  rightCheek.rotation.z = -BOMB_CHEEK_TILT;
  bombGroup.add(leftCheek, rightCheek);

  // ---- Mouths — the happy curved smile is a thin arc segment (a
  // partial ring) along the bottom of a circle; the later surprised
  // expression is just a small filled "o". Both built up front and
  // toggled via .visible so BombIntro.js only ever flips a flag /
  // crossfades opacity, never rebuilds geometry mid-sequence.
  const mouthHappy = new THREE.Mesh(
    new THREE.RingGeometry(
      BOMB_MOUTH_RADIUS - BOMB_MOUTH_THICKNESS,
      BOMB_MOUTH_RADIUS,
      32,
      1,
      BOMB_MOUTH_ARC_START,
      BOMB_MOUTH_ARC_LENGTH,
    ),
    basicMaterial(BOMB_MOUTH_COLOR, { transparent: true, side: THREE.DoubleSide }),
  );
  mouthHappy.position.set(0, BOMB_MOUTH_OFFSET_Y, 0.01);
  bombGroup.add(mouthHappy);

  const mouthSurprised = new THREE.Mesh(
    new THREE.CircleGeometry(BOMB_MOUTH_SURPRISED_RADIUS, 20),
    basicMaterial(BOMB_MOUTH_COLOR, { transparent: true, opacity: 0 }),
  );
  mouthSurprised.position.set(0, BOMB_MOUTH_OFFSET_Y, 0.011);
  mouthSurprised.visible = false;
  bombGroup.add(mouthSurprised);

  // ---- Cap — a small rounded rectangle sitting on top, hidden until
  // the bomb has fully settled (see BombIntro.js).
  const cap = new THREE.Mesh(
    new THREE.ShapeGeometry(createRoundedRectShape(BOMB_CAP_WIDTH, BOMB_CAP_HEIGHT, BOMB_CAP_CORNER_RADIUS)),
    basicMaterial(BOMB_CAP_COLOR),
  );
  cap.position.set(0, BOMB_CAP_OFFSET_Y, 0.02);
  cap.visible = false;
  bombGroup.add(cap);

  // ---- Fuse — a short leaning capsule (flat-shaded like everything
  // else here, since nothing in this scene is lit), also hidden until
  // the cap has appeared.
  const fuse = new THREE.Mesh(
    new THREE.CapsuleGeometry(BOMB_FUSE_RADIUS, BOMB_FUSE_LENGTH, 4, 8),
    basicMaterial(BOMB_FUSE_COLOR),
  );
  fuse.position.set(0, BOMB_FUSE_OFFSET_Y, 0.02);
  fuse.rotation.z = -BOMB_FUSE_LEAN;
  fuse.visible = false;
  bombGroup.add(fuse);

  // ---- Spark — a small glowing sprite at the fuse tip, revealed once
  // ignited. A Sprite (not geometry) is fine here specifically because
  // the bomb never rotates again once settled for the rest of Part 1 —
  // unlike the face, there's no rigid-rotation sync to preserve.
  const fuseTipOffset = new THREE.Vector3(0, BOMB_FUSE_LENGTH * 0.62, 0).applyAxisAngle(
    new THREE.Vector3(0, 0, 1),
    -BOMB_FUSE_LEAN,
  );
  const spark = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: getSparkTexture(),
      color: BOMB_SPARK_CORE_COLOR,
      transparent: true,
      depthWrite: false,
    }),
  );
  spark.position.set(fuse.position.x + fuseTipOffset.x, fuse.position.y + fuseTipOffset.y, 0.03);
  spark.scale.set(BOMB_SPARK_SIZE, BOMB_SPARK_SIZE, 1);
  spark.visible = false;
  bombGroup.add(spark);

  // ---- Shadow — a soft, low-opacity stretched ellipse. Kept OUTSIDE
  // bombGroup and positioned independently (see BombIntro.js's own
  // roll tween) since a contact shadow shouldn't spin with the body.
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(BOMB_SHADOW_RADIUS, 32),
    basicMaterial(BOMB_SHADOW_COLOR, { transparent: true, opacity: BOMB_SHADOW_OPACITY }),
  );
  shadow.scale.set(1, BOMB_SHADOW_SQUASH, 1);
  shadow.position.set(0, BOMB_SHADOW_OFFSET_Y, -0.01);

  return {
    bombGroup,
    body,
    eyes: [leftEye, rightEye],
    cheeks: [leftCheek, rightCheek],
    mouthHappy,
    mouthSurprised,
    cap,
    fuse,
    spark,
    shadow,
  };
}

export function disposeBomb(bomb) {
  bomb.body.geometry.dispose();
  bomb.body.material.dispose();

  bomb.eyes[0].geometry.dispose();
  bomb.eyes.forEach((eye) => eye.material.dispose());

  bomb.cheeks[0].geometry.dispose();
  bomb.cheeks.forEach((cheek) => cheek.material.dispose());

  bomb.mouthHappy.geometry.dispose();
  bomb.mouthHappy.material.dispose();
  bomb.mouthSurprised.geometry.dispose();
  bomb.mouthSurprised.material.dispose();

  bomb.cap.geometry.dispose();
  bomb.cap.material.dispose();

  bomb.fuse.geometry.dispose();
  bomb.fuse.material.dispose();

  bomb.spark.material.dispose();

  bomb.shadow.geometry.dispose();
  bomb.shadow.material.dispose();
}
