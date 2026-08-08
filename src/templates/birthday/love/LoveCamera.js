import * as THREE from "three";

import {
  CAMERA_ARC_AMOUNT_DEG,
  CAMERA_ARC_SPEED,
  CAMERA_DISTANCE,
  CAMERA_ELEVATION_DEG,
  CAMERA_LOOK_TARGET_Y,
  CAMERA_SWAY_AMOUNT,
  CAMERA_SWAY_SPEED,
} from "./Constants";
import { getCameraDistanceScale } from "./Responsive";

const ELEVATION_RAD = THREE.MathUtils.degToRad(CAMERA_ELEVATION_DEG);

// Places and gently drifts the engine's shared camera — nothing else.
// CAMERA_DISTANCE/CAMERA_ELEVATION_DEG/CAMERA_LOOK_TARGET_Y are the
// artistically-approved desktop reference values (unchanged since
// Stage 1); the only thing this class adapts per device is the
// DISTANCE, scaled by Responsive.js so the same fixed composition
// reads consistently on any aspect ratio. Elevation and look target
// never change — the camera angle is meant to feel identical
// everywhere, not just similar.
export default class LoveCamera {
  constructor(camera) {
    this.camera = camera;
    this.time = 0;

    this.lookTarget = new THREE.Vector3(0, CAMERA_LOOK_TARGET_Y, 0);
    this.base = new THREE.Vector3();

    this.updateBase();
    this.camera.position.copy(this.base);
    this.camera.lookAt(this.lookTarget);
  }

  // Recomputed every frame (cheap — a couple of trig calls) rather
  // than once at setup, so a live window resize is reflected
  // immediately with no extra event wiring — the same convention
  // Responsive.js's own values follow.
  updateBase() {
    const distance = CAMERA_DISTANCE * getCameraDistanceScale(this.camera);

    this.base.set(
      0,
      distance * Math.sin(ELEVATION_RAD),
      distance * Math.cos(ELEVATION_RAD),
    );
  }

  update(delta) {
    this.time += delta;

    this.updateBase();

    // A slow, graceful side-to-side arc around the look target — a real
    // rotation of the base offset (so distance-from-subject never
    // changes, only the angle), not just a nudge on one axis. This is
    // the "camera operator breathing" quality that makes an otherwise
    // locked-off shot feel alive rather than frozen; layered underneath
    // it, the finer sway below adds a second, faster texture on top.
    const arcAngle =
      Math.sin(this.time * CAMERA_ARC_SPEED) *
      THREE.MathUtils.degToRad(CAMERA_ARC_AMOUNT_DEG);

    const offsetX = this.base.x - this.lookTarget.x;
    const offsetZ = this.base.z - this.lookTarget.z;

    const arcedX =
      offsetX * Math.cos(arcAngle) - offsetZ * Math.sin(arcAngle);
    const arcedZ =
      offsetX * Math.sin(arcAngle) + offsetZ * Math.cos(arcAngle);

    // A small idle drift, entirely separate from the base position, so
    // it never accumulates or drifts the shot away from its composition
    // over a long-running scene.
    const swayX = Math.sin(this.time * CAMERA_SWAY_SPEED) * CAMERA_SWAY_AMOUNT;
    const swayY =
      Math.cos(this.time * CAMERA_SWAY_SPEED * 0.7) * CAMERA_SWAY_AMOUNT * 0.6;

    this.camera.position.set(
      this.lookTarget.x + arcedX + swayX,
      this.base.y + swayY,
      this.lookTarget.z + arcedZ,
    );

    this.camera.lookAt(this.lookTarget);
  }
}
