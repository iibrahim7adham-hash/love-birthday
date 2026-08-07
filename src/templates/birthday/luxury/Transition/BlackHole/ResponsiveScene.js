import * as THREE from "three";

import { BASE_VERTICAL_FOV } from "./Constants";

// ===========================
// The single place Scene 3's cinematic composition is controlled from.
// Everything here reads live viewport/camera state — nothing is a
// device-specific breakpoint. Adding a new responsive value later means
// adding one function here, not hunting through Animations/CameraController/
// MemorySystem for a hardcoded number.
// ===========================

export function getAspect() {
  return window.innerWidth / window.innerHeight;
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
export function getPointScale(camera) {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

  const baseHalfFovRad = THREE.MathUtils.degToRad(BASE_VERTICAL_FOV / 2);
  const currentHalfFovRad = THREE.MathUtils.degToRad(camera.fov / 2);

  const fovCompensation =
    Math.tan(baseHalfFovRad) / Math.tan(currentHalfFovRad);

  return pixelRatio * fovCompensation;
}

// The Scene 3 establishing shot's distance/elevation, eased by aspect
// ratio so wider viewports sit slightly further back and flatter while
// narrower ones sit a little closer and higher — the same lerp the
// camera transition used inline before this module existed.
export function getMemoryCameraFraming(aspect) {
  const t = THREE.MathUtils.clamp((aspect - 0.6) / (1.78 - 0.6), 0, 1);

  const viewDistance = THREE.MathUtils.lerp(9.8, 8.4, t);
  const elevation = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(16, 10, t));

  return { viewDistance, elevation };
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
