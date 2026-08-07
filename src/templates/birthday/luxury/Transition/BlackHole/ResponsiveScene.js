import * as THREE from "three";

import { BASE_VERTICAL_FOV, DISK_OUTER_RADIUS } from "./Constants";

// ===========================
// The single authority for Scene 3's cinematic composition — camera
// distance, elevation, particle/photo scale. No camera or scene code
// outside this file should hardcode a framing number; everything here
// is either a real trigonometric derivation from the camera's current
// (already aspect-responsive — see engine/camera/Camera.js) fov, or a
// deliberately flat cinematic constant, never a device/breakpoint
// lookup table. A future scene needing its own framing calls
// getCameraDistance()/getVisibleWorldHeight() directly with its own
// target size and coverage — no new responsive logic needed anywhere
// else.
// ===========================

export function getAspect() {
  return window.innerWidth / window.innerHeight;
}

// How tall a slice of the 3D world is visible at a given distance from
// the camera, purely from its (aspect-responsive) vertical fov — the
// standard perspective-camera frustum relationship. Everything else in
// this module that reasons about "how big will X look" is built on top
// of this one relationship.
export function getVisibleWorldHeight(distance, camera) {
  const halfFovRad = THREE.MathUtils.degToRad(camera.fov / 2);

  return 2 * distance * Math.tan(halfFovRad);
}

export function getVisibleWorldWidth(distance, camera) {
  return getVisibleWorldHeight(distance, camera) * camera.aspect;
}

// Inverts getVisibleWorldHeight()/getVisibleWorldWidth(): the distance
// at which an object `targetRadius * 2` units across occupies
// `screenCoverage` of the WHICHEVER screen dimension is currently more
// constraining — the smaller of the two. `screenCoverage` can be
// greater than 1 on purpose — a deliberately tight, dominant shot where
// the subject is larger than the frame and crops at the edges reads as
// "close and dramatic" rather than "small and centered".
//
// Framing by the constraining dimension (not always height) is what
// actually makes this resolution-independent rather than just
// "responsive to landscape screens": Camera.js holds HORIZONTAL fov
// constant and lets vertical fov balloon on narrow/portrait aspects
// (see its own comment) specifically so scene width stays consistent —
// which means on a portrait phone, height is no longer the tighter
// dimension, width is. Solving purely off camera.fov (vertical) would
// read that ballooned vertical fov as "there's tons of room" and pull
// the camera absurdly close. Using `Math.min(1, camera.aspect)` folds
// in whichever dimension is actually tighter: for aspect >= 1
// (landscape/square, where height is already the smaller of the two)
// it's a no-op and this reduces to a plain vertical-fov solve; for
// aspect < 1 (portrait) it switches to solving against the (constant,
// by Camera.js's own design) horizontal extent instead.
export function getCameraDistance(targetRadius, screenCoverage, camera) {
  const halfFovRad = THREE.MathUtils.degToRad(camera.fov / 2);
  const constrainingFraction = Math.min(1, camera.aspect);

  return (
    targetRadius / (screenCoverage * Math.tan(halfFovRad) * constrainingFraction)
  );
}

// A fixed cinematic pitch above the disk plane — steep enough that the
// disk always reads as a disk (near edge-on, it reads as a flat line
// instead), shallow enough to stay a "beautiful cinematic view" rather
// than a top-down map view. Deliberately NOT aspect-dependent: unlike
// distance, which needs to compensate for how much of the frame a fixed
// vertical fov covers, elevation is a pure art-direction choice, and
// getCameraDistance()/Camera.js's own fov compensation already keep the
// disk correctly framed on every aspect ratio without also varying this.
const MEMORY_SHOT_ELEVATION_DEG = 10;

export function getCameraElevation() {
  return THREE.MathUtils.degToRad(MEMORY_SHOT_ELEVATION_DEG);
}

// The characteristic radius Scene 3's establishing shot frames around —
// the accretion disk's outer edge, which dwarfs the core and ring sitting
// inside it (see Constants.js). Exposed here (rather than importing
// Constants.DISK_OUTER_RADIUS directly) so a future scene asks the
// responsive system for "how big is the thing I'm framing", not the
// world-geometry module.
export function getOrbitRadius() {
  return DISK_OUTER_RADIUS;
}

// Reverse-derived from this shot's original hand-tuned values (~8.4
// units distance at the 16:9 baseline aspect/fov) so the reference
// composition is unchanged: coverage = DISK_OUTER_RADIUS / (8.4 *
// tan(BASE_VERTICAL_FOV / 2)). Once fixed, this single number is what
// makes the shot framing scale correctly to every other aspect ratio
// through getCameraDistance() — no per-device values to maintain.
const MEMORY_SHOT_COVERAGE = 2.567;

// The Scene 3 establishing shot's distance + elevation. Distance comes
// from getCameraDistance() against the disk's actual radius, so the
// black hole + disk occupy the same apparent portion of the screen
// regardless of viewport shape; elevation is the fixed cinematic pitch
// above. Takes the live camera (for its current, already-responsive
// fov) rather than a raw aspect number.
export function getMemoryCameraFraming(camera) {
  const viewDistance = getCameraDistance(
    getOrbitRadius(),
    MEMORY_SHOT_COVERAGE,
    camera,
  );

  return { viewDistance, elevation: getCameraElevation() };
}

// A memory photo's resting scale once it has finished emerging, and its
// glow sprite's scale relative to it. Flat values today (not yet
// aspect-dependent) — centralized here so the cinematic composition has
// one place to tune from, per the same convention as every other getter
// in this module.
export function getPhotoScale() {
  return 0.42;
}

export function getGlowScale() {
  return 1.9;
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
