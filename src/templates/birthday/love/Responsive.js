import * as THREE from "three";

// ===========================
// The only place responsible for responsive behavior in this scene.
// Every other system reads a value from here instead of computing its
// own. Nothing here changes what anything IS — the heart's shape, the
// platform's size, the petal count, the breathing amplitude are all
// still the same fixed, artistically-approved world-space values from
// Stages 1-6, completely untouched. This module only changes how far
// away the camera stands to look at that same, unchanged scene, and
// how large a shader particle renders on screen — never the scene
// itself. At the desktop reference aspect (~16:9, the same one every
// artistic constant in this template was tuned against), every
// function below resolves to a no-op scale of 1, so the approved
// desktop shot is reproduced exactly, not just approximately.
// ===========================

// Must match Config.camera.fov in src/engine/core/Config.js — the
// vertical fov engine/camera/Camera.js's responsive system treats as
// the baseline for a 16:9 shot. Every calculation below is relative to
// this one number; if the engine's baseline fov ever changes, update
// this to match.
const BASE_VERTICAL_FOV = 35;

// How far the camera's current (aspect-responsive) vertical fov has
// been pushed from BASE_VERTICAL_FOV. Camera.js holds HORIZONTAL fov
// constant across every aspect ratio and lets vertical fov balloon on
// narrow/portrait screens to compensate for that — so a bigger fov here
// means more of the scene is visible, and the same fixed-world-space
// heart reads as smaller/farther unless the camera moves to match.
function getFovCompensation(camera) {
  const baseHalfFovRad = THREE.MathUtils.degToRad(BASE_VERTICAL_FOV / 2);
  const currentHalfFovRad = THREE.MathUtils.degToRad(camera.fov / 2);

  return Math.tan(baseHalfFovRad) / Math.tan(currentHalfFovRad);
}

// The multiplier LoveCamera scales its fixed, artistically-approved
// CAMERA_DISTANCE by.
//
// Pure fov compensation alone over-corrects on portrait aspects: since
// horizontal fov never changes (Camera.js holds it constant), pulling
// the camera in purely to fix vertical coverage lets the heart's WIDTH
// blow past the frame — verified numerically: an uncorrected phone shot
// puts the heart at ~95% of frame width versus ~25% on desktop, nowhere
// near "the same shot", and leaves almost no empty space beside it.
//
// Dividing by min(1, aspect) is what keeps that in check: for aspect
// >= 1 (landscape, matching the desktop reference) it's a no-op; for
// aspect < 1 (portrait) it blends the correction back so the camera
// never pulls in more than the frame's own width can absorb. The heart
// ends up slightly shorter (relative to a tall portrait frame) than on
// desktop, but comfortably framed on every axis — never edge-to-edge,
// always with visible empty space around it.
export function getCameraDistanceScale(camera) {
  const verticalScale = getFovCompensation(camera);
  const constrainingFraction = Math.min(1, camera.aspect);

  return verticalScale / constrainingFraction;
}

// gl_PointSize is specified in actual device pixels, bypassing the
// normal projection-matrix scaling every other object goes through —
// left alone, heart particles would render at a fixed pixel size
// regardless of screen density or the camera's current fov. Exposed
// here for LoveParticles' existing, already-generic setPointScale()
// hook (see LoveParticles.js's own uPointScale comment) — LoveParticles
// itself stays untouched; only what value it's given changes.
export function getParticleScale(camera) {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

  return pixelRatio * getFovCompensation(camera);
}
