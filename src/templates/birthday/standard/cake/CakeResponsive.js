import * as THREE from "three";

import Config from "../../../../engine/core/Config";

// The shared Camera.js already holds horizontal FOV constant and grows
// vertical FOV on narrow aspects (see its own computeResponsiveFov) —
// enough for a squat/wide subject, but empirically NOT enough on its
// own for a taller subject like this cake: on narrow mobile portrait
// viewports it rendered as a tiny object with huge unused space above
// and below, exactly the failure mode the brief explicitly warns
// against ("prioritize cake visibility... don't shrink the entire cake
// until it becomes tiny" — verified via Playwright screenshots at
// 360x780 before this fix existed). This mirrors the exact same
// distance-correction love/Responsive.js already uses for its own
// heart (a fresh Standard-owned copy of the technique, not a
// cross-template import — this project never imports one template's
// files into another's), pulling the camera closer on narrow aspects
// so the cake keeps reading as the hero object at any viewport size.
const BASE_FOV = Config.camera.fov;

function getFovCompensation(camera) {
  const baseHalfFovRad = THREE.MathUtils.degToRad(BASE_FOV / 2);
  const currentHalfFovRad = THREE.MathUtils.degToRad(camera.fov / 2);

  return Math.tan(baseHalfFovRad) / Math.tan(currentHalfFovRad);
}

// Reined back in by aspect, same reasoning as love/Responsive.js's own
// aspectConstraint: pure FOV compensation alone over-corrects on
// portrait aspects (the cake's WIDTH would blow past the frame), so
// this blends the correction back for aspect < 1 rather than letting it
// go all the way. At the desktop reference aspect (>= 1) it's a no-op.
function aspectConstraint(camera) {
  return Math.min(1, camera.aspect);
}

export function getCakeCameraDistanceScale(camera) {
  return getFovCompensation(camera) / aspectConstraint(camera);
}

// The shared fix for "objects placed in world-space read a different
// SIZE on different devices" (fireworks, balloons, and anything else
// sized in fixed world units against this template's own reference
// camera basis — see StandardFireworks.js/StandardBalloons.js's own
// _computeReferenceCameraBasis()). Camera.js holds HORIZONTAL fov
// constant and grows VERTICAL fov on narrow aspects to compensate (see
// its own computeResponsiveFov) — which is exactly right for keeping a
// consistent horizontal "slice" of the world in frame, but means the
// world-space span visible at any given depth (world units per screen
// fraction) is NOT constant across aspect ratios: a narrower/taller
// viewport has a bigger vertical fov, so the SAME fixed-world-size
// object at the SAME depth covers a SMALLER fraction of that taller
// frame — exactly the "huge on desktop, tiny on mobile" symptom.
//
// This returns how much bigger (or smaller) a world-space size needs to
// be, right now, to keep occupying the same fraction of the frame it
// would at the BASE_FOV/BASE_ASPECT reference — simply the reciprocal
// of getFovCompensation() above, which already expresses exactly that
// relationship (it exists to pull the CAMERA closer/further for the
// cake; this reuses the identical ratio to grow/shrink an object's own
// SIZE instead of moving the camera). Multiplying a world-space size
// (or a speed, so travel TIME also stays consistent — see
// StandardBalloons.js's own use for riseSpeed) by this value keeps its
// perceived on-screen scale consistent across every aspect ratio,
// without any device-type branching.
export function getResponsiveSizeScale(camera) {
  return 1 / getFovCompensation(camera);
}
