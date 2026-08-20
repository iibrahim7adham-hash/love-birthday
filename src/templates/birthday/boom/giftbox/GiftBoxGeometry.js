import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

import {
  GIFTBOX_BODY_COLOR,
  GIFTBOX_LID_COLOR,
  GIFTBOX_LID_TOP_COLOR,
  GIFTBOX_LID_BEVEL_RADIUS,
  GIFTBOX_LID_BEVEL_SEGMENTS,
  GIFTBOX_RIBBON_COLOR,
  GIFTBOX_RIBBON_TOP_COLOR,
  GIFTBOX_INTERIOR_COLOR,
  GIFTBOX_WIDTH,
  GIFTBOX_DEPTH,
  GIFTBOX_BODY_HEIGHT,
  GIFTBOX_LID_HEIGHT,
  GIFTBOX_LID_OVERHANG,
  GIFTBOX_LID_CAP_HEIGHT_RATIO,
  GIFTBOX_LID_CAP_INSET,
  GIFTBOX_WALL_THICKNESS,
  GIFTBOX_RIBBON_WIDTH,
  GIFTBOX_RIBBON_THICKNESS,
  GIFTBOX_RIBBON_CROSS_LIFT,
  GIFTBOX_BOW_KNOT_SIZE,
  GIFTBOX_BOW_LOOP_LENGTH,
  GIFTBOX_BOW_LOOP_MAX_RADIUS,
  GIFTBOX_BOW_LOOP_FLATTEN,
  GIFTBOX_BOW_LOOP_OFFSET_X,
  GIFTBOX_BOW_LOOP_TILT,
  GIFTBOX_BOW_ASYMMETRY,
  GIFTBOX_BOW_TAIL_LENGTH,
  GIFTBOX_BOW_TAIL_WIDTH,
  GIFTBOX_BOW_TAIL_SPREAD,
  GIFTBOX_BOW_TAIL_TIP_WIDTH,
  GIFTBOX_ROUGHNESS,
  GIFTBOX_METALNESS,
  GIFTBOX_INTERIOR_ROUGHNESS,
  GIFTBOX_GLOW_COLOR,
  GIFTBOX_GLOW_DISTANCE,
  GIFTBOX_GLOW_DECAY,
} from "./GiftBoxConstants";

// Pure construction only — no animation/timeline logic (see GiftBox.js
// for that), the same buildX()/disposeX() shape bomb/BombGeometry.js's
// own buildBomb() already establishes.
//
// Unlike the rest of this template's own flat MeshBasicMaterial cast
// (bomb, hearts — a deliberate flat/cartoon look, see
// BombGeometry.js's own comment), the gift box is lit MeshStandardMaterial
// on purpose: the brief calls for "real 3D depth and simple soft
// lighting" specifically for this object. No new lights are added for
// the BOX ITSELF — the engine's own shared ambient/directional/rim/warm
// lights (engine/lights/Lights.js) already exist in every scene and
// simply had nothing lit by them in Boom until now. The one light this
// file DOES add (glowLight) is the opening interaction's own warm
// interior glow, not general box lighting — see GiftBox.js for how/
// when it's actually turned on.
//
// Everything that must swing open together (lid, its own ribbon
// segments, the ribbon strip across its top, the bow) is parented
// under `lidHinge`, a pivot Group positioned at the lid's own rear-
// bottom edge — rotating lidHinge therefore rotates the lid around
// that back edge, not its own center. The front/back ribbon wrap is
// built as TWO stacked segments (body-height + lid-height) rather than
// one continuous strip specifically so the lid's own segment can move
// with it while the body's segment stays put — at rest the seam
// between them is invisible (same color/width, flush edges), so the
// closed box looks identical to a single continuous strip.

function standardMaterial(color, roughness = GIFTBOX_ROUGHNESS) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: GIFTBOX_METALNESS });
}

// Builds the body as a real open-top shell (bottom + 4 walls) rather
// than a solid block, so it has actual thickness and a visible cavity
// once the lid opens. `inset`/`heightTrim` let the same helper build
// both the outer (exterior-facing) shell and, inset by the wall
// thickness, the inner (cavity-facing) shell in darker material.
function buildShell(material, { width, depth, height, thickness, floorOffsetY = 0 }) {
  const floor = new THREE.Mesh(new THREE.BoxGeometry(width, thickness, depth), material);
  floor.position.set(0, -height / 2 + thickness / 2 + floorOffsetY, 0);

  const wallHeight = height - thickness / 2;
  const wallY = thickness / 4;

  const front = new THREE.Mesh(new THREE.BoxGeometry(width, wallHeight, thickness), material);
  front.position.set(0, wallY, depth / 2 - thickness / 2);
  const back = front.clone();
  back.position.z = -(depth / 2 - thickness / 2);

  const left = new THREE.Mesh(new THREE.BoxGeometry(thickness, wallHeight, depth), material);
  left.position.set(-(width / 2 - thickness / 2), wallY, 0);
  const right = left.clone();
  right.position.x = width / 2 - thickness / 2;

  return { floor, walls: [front, back, left, right] };
}

// A real tied bow is never perfectly mirror-symmetric — the mirrored
// loop gets a slightly different length/tilt/twist (GIFTBOX_BOW_ASYMMETRY)
// instead of being an exact reflection of the first.
//
// A teardrop/petal shape — pointed at the base (where it tucks into the
// knot), rounded at the tip — built by revolving a 2D profile with
// LatheGeometry, the same silhouette a simple 🎀 icon's own loops use.
// This reads as a folded ribbon loop from any angle; a flattened torus
// (tried first) still read as a tube/pipe once viewed close to
// face-on, since a ring's silhouette never actually closes to a point
// the way a real folded loop does.
function buildLoopProfile() {
  const segments = 12;
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    // A single sine bulge from a near-zero base (the pinch at the
    // knot) up to GIFTBOX_BOW_LOOP_MAX_RADIUS around the midpoint, then
    // rounding back in toward the rounded tip.
    const radius = Math.sin(t * Math.PI) * GIFTBOX_BOW_LOOP_MAX_RADIUS + 0.006;
    points.push(new THREE.Vector2(Math.max(radius, 0.006), t * GIFTBOX_BOW_LOOP_LENGTH));
  }
  return points;
}

function buildBowLoop(material, mirror) {
  const sizeFactor = mirror ? 1 - GIFTBOX_BOW_ASYMMETRY : 1 + GIFTBOX_BOW_ASYMMETRY * 0.35;
  const loop = new THREE.Mesh(new THREE.LatheGeometry(buildLoopProfile(), 14), material);
  loop.scale.set(sizeFactor, sizeFactor, sizeFactor * GIFTBOX_BOW_LOOP_FLATTEN);
  // The lathe's own length runs along +Y from its local origin (the
  // pinch point at the knot) — so with NO rotation the petal already
  // points straight up from the knot; a small Z rotation here just
  // leans its tip outward (away from center) rather than re-pointing it
  // entirely, the way a real ribbon loop fans out from where it's tied.
  const lean = mirror ? GIFTBOX_BOW_LOOP_TILT * 0.9 : -GIFTBOX_BOW_LOOP_TILT;
  loop.rotation.z = lean;
  // A small extra twist around Y so the two loops don't sit perfectly
  // flat/parallel — natural curvature rather than a flat cutout.
  loop.rotation.y = mirror ? -0.18 : 0.14;
  loop.position.set(mirror ? -GIFTBOX_BOW_LOOP_OFFSET_X : GIFTBOX_BOW_LOOP_OFFSET_X, 0, 0);
  return loop;
}

// Tapered (wide at the knot, narrowing toward the cut tip) instead of a
// flat rectangular strip — a shallow hex-section cylinder, flattened in
// Z, keeps it in the same low-poly primitive family as the rest of the
// box rather than reaching for a custom/modeled shape.
function buildBowTail(material, mirror) {
  const tail = new THREE.Mesh(
    new THREE.CylinderGeometry(GIFTBOX_BOW_TAIL_WIDTH / 2, GIFTBOX_BOW_TAIL_TIP_WIDTH / 2, GIFTBOX_BOW_TAIL_LENGTH, 6, 1),
    material,
  );
  tail.scale.z = GIFTBOX_RIBBON_THICKNESS / GIFTBOX_BOW_TAIL_WIDTH;
  // Hangs DOWN from the knot (its own wide end starts at local y=0) and
  // spreads wide enough in X to clear the loops' own footprint. Pulled
  // forward in Z to sit just past the front ribbon column's own plane
  // (frontZ, mirroring buildGiftBox()'s own front-wrap placement) —
  // the bow itself sits centered on the lid (z=0, the actual crossing
  // point), but anything hanging DOWN from there dips below the top
  // surface and straight into the lid's own solid interior depth from
  // this template's flat, un-elevated camera, making it invisible.
  // Sitting in front of the box's own front face instead keeps the
  // tails permanently unoccluded, draped down over the ribbon.
  const spreadX = GIFTBOX_BOW_TAIL_WIDTH * GIFTBOX_BOW_TAIL_SPREAD;
  const tailFrontZ = GIFTBOX_DEPTH / 2 + GIFTBOX_RIBBON_THICKNESS * 2;
  tail.position.set(mirror ? -spreadX : spreadX, -GIFTBOX_BOW_TAIL_LENGTH / 2, tailFrontZ);
  tail.rotation.z = mirror ? Math.PI / 9 : -Math.PI / 9;
  return tail;
}

// A softly rounded low-poly knot (a dodecahedron, not a cube corner)
// sitting where the loops/tails meet — reads as an actual tied knot
// rather than a sharp block, while staying in the same
// simple-primitive, non-photorealistic register as the rest of the box.
function buildBowKnot(material) {
  const knot = new THREE.Mesh(new THREE.DodecahedronGeometry(GIFTBOX_BOW_KNOT_SIZE * 0.62, 0), material);
  knot.scale.set(1, 0.88, 0.82);
  return knot;
}

export default function buildGiftBox() {
  const group = new THREE.Group();

  const bodyMaterial = standardMaterial(GIFTBOX_BODY_COLOR);
  const lidMaterial = standardMaterial(GIFTBOX_LID_COLOR);
  // The lid cap's own TOP face only — a touch lighter and a touch
  // glossier than the lid's side material, so the top reads as lit
  // "premium wrapping paper" against the shaded vertical edges (see the
  // lid section below's per-face material array).
  const lidTopMaterial = standardMaterial(GIFTBOX_LID_TOP_COLOR, GIFTBOX_ROUGHNESS - 0.1);
  const ribbonMaterial = standardMaterial(GIFTBOX_RIBBON_COLOR);
  // The lid-top crossing strips only (see ribbonTop/ribbonTopCross
  // below) — a lighter, glossier tint so the "+" reads as lit fabric
  // against the darker ribbon running down the lid's own sides, a
  // per-surface highlight rather than extra overlay geometry.
  const ribbonTopMaterial = standardMaterial(GIFTBOX_RIBBON_TOP_COLOR, GIFTBOX_ROUGHNESS - 0.2);
  // The bow itself sits a hair glossier than the flat ribbon strips —
  // a subtle fabric sheen on the loops/knot/tails only.
  const bowMaterial = standardMaterial(GIFTBOX_RIBBON_COLOR, GIFTBOX_ROUGHNESS - 0.15);
  const interiorMaterial = standardMaterial(GIFTBOX_INTERIOR_COLOR, GIFTBOX_INTERIOR_ROUGHNESS);

  // Every part is first built around the body's own local vertical
  // center (y=0), then the whole assembly is shifted at the end so the
  // BOX+LID as a unit — not just the body alone — sits centered at the
  // group's own origin (see centerShift below).

  // ---- Body — a real open-top shell (bottom + 4 walls) in chocolate-
  // brown, giving the box actual wall thickness instead of a solid
  // block. Bounding footprint/height match the original solid body
  // exactly, so position/scale/camera framing are unaffected.
  const outerShell = buildShell(bodyMaterial, {
    width: GIFTBOX_WIDTH,
    depth: GIFTBOX_DEPTH,
    height: GIFTBOX_BODY_HEIGHT,
    thickness: GIFTBOX_WALL_THICKNESS,
  });
  const body = new THREE.Group();
  body.add(outerShell.floor, ...outerShell.walls);
  group.add(body);

  // ---- Inner bottom + inner walls — a second, inset shell in darker
  // brown lining the cavity, so the interior reads as an actual hollow
  // space with depth once the lid opens (see GiftBox.js's own _open()).
  const innerShell = buildShell(interiorMaterial, {
    width: GIFTBOX_WIDTH - GIFTBOX_WALL_THICKNESS * 2,
    depth: GIFTBOX_DEPTH - GIFTBOX_WALL_THICKNESS * 2,
    height: GIFTBOX_BODY_HEIGHT - GIFTBOX_WALL_THICKNESS * 0.5,
    thickness: GIFTBOX_WALL_THICKNESS * 0.6,
    floorOffsetY: GIFTBOX_WALL_THICKNESS * 0.5,
  });
  const innerBottom = innerShell.floor;
  const innerWalls = new THREE.Group();
  innerWalls.add(...innerShell.walls);
  group.add(innerBottom, innerWalls);

  // ---- Lid — TWO stacked slabs, not one flat block: a full-footprint
  // BASE topped by a smaller INSET cap (see GIFTBOX_LID_CAP_* comments),
  // whose own recessed seam catches the scene's own lights as a real
  // rim/bevel. `lid` itself is a Group (base + cap) so the rest of the
  // file — hinge, centering, animation — can keep treating it as a
  // single positioned object exactly as before.
  const lidWidth = GIFTBOX_WIDTH + GIFTBOX_LID_OVERHANG * 2;
  const lidDepth = GIFTBOX_DEPTH + GIFTBOX_LID_OVERHANG * 2;
  const lidCapHeight = GIFTBOX_LID_HEIGHT * GIFTBOX_LID_CAP_HEIGHT_RATIO;
  const lidBaseHeight = GIFTBOX_LID_HEIGHT - lidCapHeight;
  const lidCapWidth = lidWidth - GIFTBOX_LID_CAP_INSET * 2;
  const lidCapDepth = lidDepth - GIFTBOX_LID_CAP_INSET * 2;

  // RoundedBoxGeometry, not a sharp-cornered BoxGeometry, on both slabs
  // — a real beveled edge/corner instead of a hard machined one (see
  // GIFTBOX_LID_BEVEL_RADIUS's own comment). Its own group layout is
  // inherited unmodified from BoxGeometry (still the standard 6-group
  // [+x, -x, +y, -y, +z, -z] per-face split), so per-face materials
  // below still target the right faces.
  const lidBase = new THREE.Mesh(
    new RoundedBoxGeometry(lidWidth, lidBaseHeight, lidDepth, GIFTBOX_LID_BEVEL_SEGMENTS, GIFTBOX_LID_BEVEL_RADIUS),
    lidMaterial,
  );
  lidBase.position.y = -lidCapHeight / 2;

  // Per-face materials so ONLY the cap's top face (+y, index 2) picks
  // up the lighter lidTopMaterial — its sides stay the same lidMaterial
  // as the base, so the cap still reads as one continuous lid, just lit
  // differently on top (a single clean, uninterrupted top surface).
  const lidCap = new THREE.Mesh(
    new RoundedBoxGeometry(lidCapWidth, lidCapHeight, lidCapDepth, GIFTBOX_LID_BEVEL_SEGMENTS, GIFTBOX_LID_BEVEL_RADIUS),
    [lidMaterial, lidMaterial, lidTopMaterial, lidMaterial, lidMaterial, lidMaterial],
  );
  lidCap.position.y = lidBaseHeight / 2;

  const lid = new THREE.Group();
  lid.add(lidBase, lidCap);
  const lidY = GIFTBOX_BODY_HEIGHT / 2 + GIFTBOX_LID_HEIGHT / 2;
  lid.position.set(0, lidY, 0);
  group.add(lid);

  // ---- Ribbon — TWO perpendicular wraps (front/back AND left/right),
  // each split into a body segment and a lid segment (stacked flush,
  // same width/color) instead of one continuous strip, so the lid's own
  // segments can be reparented under the hinge below while the body's
  // segments stay with the body. The two wraps cross on the lid's own
  // top as a real "+" gift-wrap pattern (see ribbonTop/ribbonTopCross).
  const frontZ = GIFTBOX_DEPTH / 2 + GIFTBOX_RIBBON_THICKNESS / 2;
  const backZ = -(GIFTBOX_DEPTH / 2 + GIFTBOX_RIBBON_THICKNESS / 2);
  const leftX = -(GIFTBOX_WIDTH / 2 + GIFTBOX_RIBBON_THICKNESS / 2);
  const rightX = GIFTBOX_WIDTH / 2 + GIFTBOX_RIBBON_THICKNESS / 2;

  // The body segment's own top edge and the lid segment's own bottom
  // edge sit at the exact same coplanar seam when the lid is closed —
  // under the scene's own lighting that exact touch (no overlap either
  // way) renders as a thin bright seam line across the ribbon. A tiny
  // overlap, extended upward only (the bottom edge is unaffected, so it
  // still seats flush on the body), hides that seam behind the same
  // ribbon material instead.
  const RIBBON_SEAM_OVERLAP = 0.02;

  const ribbonFrontBody = new THREE.Mesh(
    new THREE.BoxGeometry(GIFTBOX_RIBBON_WIDTH, GIFTBOX_BODY_HEIGHT + RIBBON_SEAM_OVERLAP, GIFTBOX_RIBBON_THICKNESS),
    ribbonMaterial,
  );
  ribbonFrontBody.position.set(0, RIBBON_SEAM_OVERLAP / 2, frontZ);
  const ribbonBackBody = ribbonFrontBody.clone();
  ribbonBackBody.position.z = backZ;

  const ribbonLeftBody = new THREE.Mesh(
    new THREE.BoxGeometry(GIFTBOX_RIBBON_THICKNESS, GIFTBOX_BODY_HEIGHT + RIBBON_SEAM_OVERLAP, GIFTBOX_RIBBON_WIDTH),
    ribbonMaterial,
  );
  ribbonLeftBody.position.set(leftX, RIBBON_SEAM_OVERLAP / 2, 0);
  const ribbonRightBody = ribbonLeftBody.clone();
  ribbonRightBody.position.x = rightX;

  const ribbonFrontLid = new THREE.Mesh(
    new THREE.BoxGeometry(GIFTBOX_RIBBON_WIDTH, GIFTBOX_LID_HEIGHT, GIFTBOX_RIBBON_THICKNESS),
    ribbonMaterial,
  );
  ribbonFrontLid.position.set(0, lidY, frontZ);
  const ribbonBackLid = ribbonFrontLid.clone();
  ribbonBackLid.position.z = backZ;

  const ribbonLeftLid = new THREE.Mesh(
    new THREE.BoxGeometry(GIFTBOX_RIBBON_THICKNESS, GIFTBOX_LID_HEIGHT, GIFTBOX_RIBBON_WIDTH),
    ribbonMaterial,
  );
  ribbonLeftLid.position.set(leftX, lidY, 0);
  const ribbonRightLid = ribbonLeftLid.clone();
  ribbonRightLid.position.x = rightX;

  const ribbonTop = new THREE.Mesh(
    new THREE.BoxGeometry(GIFTBOX_RIBBON_WIDTH, GIFTBOX_RIBBON_THICKNESS, lidDepth),
    ribbonTopMaterial,
  );
  const ribbonTopY = lidY + GIFTBOX_LID_HEIGHT / 2 + GIFTBOX_RIBBON_THICKNESS / 2;
  ribbonTop.position.set(0, ribbonTopY, 0);

  // The perpendicular (left/right) top strip — sits a hair above the
  // first so it visibly lies OVER it at the crossing, the way one
  // physical ribbon overlaps another rather than the two z-fighting.
  const ribbonTopCross = new THREE.Mesh(
    new THREE.BoxGeometry(lidWidth, GIFTBOX_RIBBON_THICKNESS, GIFTBOX_RIBBON_WIDTH),
    ribbonTopMaterial,
  );
  ribbonTopCross.position.set(0, ribbonTopY + GIFTBOX_RIBBON_CROSS_LIFT, 0);

  group.add(
    ribbonFrontBody,
    ribbonBackBody,
    ribbonLeftBody,
    ribbonRightBody,
    ribbonFrontLid,
    ribbonBackLid,
    ribbonLeftLid,
    ribbonRightLid,
    ribbonTop,
    ribbonTopCross,
  );

  // ---- Bow — sits on the lid, centered on the ribbon crossing it.
  const bow = new THREE.Group();
  bow.add(buildBowLoop(bowMaterial, false));
  bow.add(buildBowLoop(bowMaterial, true));
  bow.add(buildBowTail(bowMaterial, false));
  bow.add(buildBowTail(bowMaterial, true));
  bow.add(buildBowKnot(bowMaterial));
  bow.position.set(0, ribbonTopY + GIFTBOX_RIBBON_CROSS_LIFT + GIFTBOX_RIBBON_THICKNESS / 2, 0);
  group.add(bow);

  // ---- Warm interior glow — a light, not a visible object, so the
  // inside stays visually empty (see GIFTBOX_GLOW_COLOR's own comment).
  // Sits just inside the body's own opening; off (intensity 0) until
  // GiftBox.js turns it up as the lid starts rotating.
  const glowLight = new THREE.PointLight(GIFTBOX_GLOW_COLOR, 0, GIFTBOX_GLOW_DISTANCE, GIFTBOX_GLOW_DECAY);
  glowLight.position.set(0, GIFTBOX_BODY_HEIGHT / 2 - 0.2, 0);
  group.add(glowLight);

  // Vertically center the BOX+LID unit (the bow is a topper allowed to
  // extend a bit above that) at the group's own origin.
  const centerShift = (-GIFTBOX_BODY_HEIGHT / 2 + (lidY + GIFTBOX_LID_HEIGHT / 2)) / 2;
  [
    body,
    innerBottom,
    innerWalls,
    lid,
    ribbonFrontBody,
    ribbonBackBody,
    ribbonLeftBody,
    ribbonRightBody,
    ribbonFrontLid,
    ribbonBackLid,
    ribbonLeftLid,
    ribbonRightLid,
    ribbonTop,
    ribbonTopCross,
    bow,
    glowLight,
  ].forEach((obj) => {
    obj.position.y -= centerShift;
  });

  // ---- Hinge — a pivot at the lid's own rear-bottom edge. Built AFTER
  // the centering shift above so it's positioned from the lid's own
  // FINAL resting coordinates, then the lid/its ribbon segments/bow are
  // reparented onto it (plain position subtraction is exact here since
  // lidHinge has no rotation yet and both are siblings under `group`).
  const lidHinge = new THREE.Group();
  lidHinge.position.set(lid.position.x, lid.position.y - GIFTBOX_LID_HEIGHT / 2, lid.position.z - lidDepth / 2);
  group.add(lidHinge);

  [lid, ribbonFrontLid, ribbonBackLid, ribbonLeftLid, ribbonRightLid, ribbonTop, ribbonTopCross, bow].forEach((obj) => {
    obj.position.sub(lidHinge.position);
    lidHinge.add(obj);
  });

  return {
    group,
    body,
    innerBottom,
    innerWalls,
    lid,
    lidHinge,
    bodyRibbons: [ribbonFrontBody, ribbonBackBody, ribbonLeftBody, ribbonRightBody],
    lidRibbons: [ribbonFrontLid, ribbonBackLid, ribbonLeftLid, ribbonRightLid, ribbonTop, ribbonTopCross],
    bow,
    glowLight,
    materials: [bodyMaterial, lidMaterial, lidTopMaterial, ribbonMaterial, ribbonTopMaterial, bowMaterial, interiorMaterial],
  };
}

export function disposeGiftBox(giftBox) {
  giftBox.body.children.forEach((child) => child.geometry.dispose());
  giftBox.innerBottom.geometry.dispose();
  giftBox.innerWalls.children.forEach((child) => child.geometry.dispose());
  giftBox.lid.children.forEach((child) => child.geometry.dispose());
  giftBox.bodyRibbons.forEach((ribbon) => ribbon.geometry.dispose());
  giftBox.lidRibbons.forEach((ribbon) => ribbon.geometry.dispose());
  giftBox.bow.children.forEach((child) => child.geometry.dispose());
  giftBox.materials.forEach((material) => material.dispose());
}
