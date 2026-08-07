import * as THREE from "three";

import { BASE_VERTICAL_FOV } from "./Constants";

// ===========================
// The only place responsible for responsive values in this scene.
// CameraController/MemorySystem/AccretionDisk (and any future scene)
// ask this module for a value; they never compute one themselves.
// Camera.js already owns responsive FOV — nothing here duplicates
// that, it only reacts to camera.fov/camera.aspect as given.
// ===========================

// Scene 3's establishing shot, as one hand-composed reference (the
// current desktop/16:9 look) plus one narrow-aspect reference it smoothly
// eases toward — not a mathematical derivation, an artistic choice, the
// same way the shot was originally tuned. Distance/elevation (not
// distance/height) are the tuning knobs here because they're what a
// human actually reasons about when composing a shot; getCameraPosition()
// below resolves them into the flat {distance, height} pair the camera
// actually needs so nothing downstream has to redo that trig.
const WIDE_ASPECT = 16 / 9;
const NARROW_ASPECT = 0.6;

const WIDE_DISTANCE = 8.4;
const WIDE_ELEVATION_DEG = 10;

const NARROW_DISTANCE = 9.8;
const NARROW_ELEVATION_DEG = 16;

// Clamped, not extrapolated — aspects narrower than NARROW_ASPECT or
// wider than WIDE_ASPECT simply settle at that endpoint's known-good,
// deliberately-composed shot instead of a formula guessing at values
// nobody has actually looked at. No breakpoints either: aspect is a
// continuous input, eased smoothly across the whole range in between.
function easeByAspect(aspect, fromValue, toValue) {
  const t = THREE.MathUtils.clamp(
    (aspect - NARROW_ASPECT) / (WIDE_ASPECT - NARROW_ASPECT),
    0,
    1,
  );

  return THREE.MathUtils.lerp(fromValue, toValue, t);
}

// Scene 3's establishing shot position, relative to wherever it's
// looking (see getCameraLookTarget()). Returns {distance, height} —
// distance being the horizontal radius from the look target and height
// the vertical offset above it — so CameraController can place the
// camera with nothing more than the circular positioning math it
// already does for every other camera move, no elevation trig of its
// own.
export function getCameraPosition(camera) {
  const distance = easeByAspect(camera.aspect, NARROW_DISTANCE, WIDE_DISTANCE);
  const elevationDeg = easeByAspect(
    camera.aspect,
    NARROW_ELEVATION_DEG,
    WIDE_ELEVATION_DEG,
  );
  const elevationRad = THREE.MathUtils.degToRad(elevationDeg);

  return {
    distance: distance * Math.cos(elevationRad),
    height: distance * Math.sin(elevationRad),
  };
}

// The fixed point Scene 3 orbits and looks at — the black hole group's
// own position. Centralized here so it's set in exactly one place
// (BlackHole.js reads this for the group's placement) rather than the
// same coordinates existing as a second hardcoded copy anywhere a scene
// needs to know what it's framing.
export function getCameraLookTarget() {
  return new THREE.Vector3(0, 0, -5);
}

// A memory photo's resting scale once it has finished emerging. Flat
// today (not yet aspect-dependent) — centralized here so the cinematic
// composition has one place to tune from, per every other value in this
// module.
export function getPhotoScale() {
  return 0.42;
}

// Recomputed every frame (cheap — a handful of scalars) rather than once
// at setup, so it stays correct through a live window resize or phone
// rotation mid-scene without needing any resize event wired in.
// Combines two independent corrections:
//  - device pixel ratio, since gl_PointSize is specified in actual
//    device pixels;
//  - how far the camera's current (responsive) fov has been pushed from
//    BASE_VERTICAL_FOV — the same baseline Camera.js's own responsive-fov
//    system is built around (see engine/camera/Camera.js) — so particles
//    shrink/grow in step with everything else in frame as the fov
//    compensates for aspect ratio, instead of holding a fixed pixel size
//    regardless of how zoomed the shot currently is.
export function getParticleScale(camera) {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

  const baseHalfFovRad = THREE.MathUtils.degToRad(BASE_VERTICAL_FOV / 2);
  const currentHalfFovRad = THREE.MathUtils.degToRad(camera.fov / 2);

  const fovCompensation =
    Math.tan(baseHalfFovRad) / Math.tan(currentHalfFovRad);

  return pixelRatio * fovCompensation;
}
