import gsap from "gsap";
import * as THREE from "three";

import { getCameraPosition } from "./ResponsiveScene";

// ===========================
// Camera choreography for BlackHole, mixed onto BlackHole.prototype (see
// BlackHole.js) rather than instantiated separately — every method here
// reads/writes the controller's own shared state (`this.camera`,
// `this.cameraBase`, `this.lookTarget`, `this.cameraOrbit*`), the same
// way it did before the file split. `play()`'s own opening dolly stays
// local to Animations.js (it's a one-off closure built fresh from that
// sequence's start position, not reused elsewhere); everything reusable
// across scenes lives here.
// ===========================
export default {
  // Moves the camera some fraction of the way from wherever it currently
  // is toward the black hole, without needing the original journey's
  // start/direction vectors — a lighter-weight cousin of play()'s dolly,
  // for the calmer moves Scene 3 needs.
  approachTarget(frac, duration, delay = 0) {
    const targetX = THREE.MathUtils.lerp(
      this.cameraBase.x,
      this.lookTarget.x,
      frac,
    );
    const targetY = THREE.MathUtils.lerp(
      this.cameraBase.y,
      this.lookTarget.y,
      frac,
    );
    const targetZ = THREE.MathUtils.lerp(
      this.cameraBase.z,
      this.lookTarget.z,
      frac,
    );

    gsap.to(this.cameraBase, {
      x: targetX,
      y: targetY,
      z: targetZ,
      duration,
      delay,
      ease: "sine.inOut",
    });
  },

  // Hands the camera off from the dolly+sway language of Scenes 1-2 to a
  // continuous slow orbit — derived from wherever the camera already is,
  // so there's no jump. This becomes the resting state for the rest of
  // the experience.
  beginCameraOrbit(speed) {
    const dx = this.camera.position.x - this.lookTarget.x;
    const dz = this.camera.position.z - this.lookTarget.z;

    this.cameraOrbitAngle = Math.atan2(dz, dx);
    this.cameraOrbitRadius = Math.sqrt(dx * dx + dz * dz);
    this.cameraOrbitHeight = this.camera.position.y - this.lookTarget.y;
    this.cameraOrbitSpeed = speed;
    this.cameraOrbitMode = true;
  },

  // A close, dominant establishing shot — the black hole and its disk
  // should fill the frame, not sit small in the middle of empty space.
  // Still a real ELEVATION angle above the disk plane rather than a
  // level one (a disk viewed near edge-on reads as a line, not a disk),
  // but a shallower one than a top-down look — a "beautiful cinematic
  // view", not a map view. Only the horizontal angle is inherited from
  // wherever the camera already is, so the turn still feels continuous
  // rather than a hard cut. Runs independently of the particle burst
  // (see Animations.stabilizeAfterAbsorption) rather than gating it — the
  // camera can still be arriving when particles erupt. This method only
  // does the "turn" (continuing from wherever the camera already is) —
  // the shot's actual distance/height come pre-resolved from
  // ResponsiveScene.getCameraPosition(), so no framing decision is made
  // here, only the rotation needed to place it.
  transitionToMemoryCameraAngle(duration) {
    const offset = this.cameraBase.clone().sub(this.lookTarget);
    const currentAngle = Math.atan2(offset.z, offset.x);
    const targetAngle = currentAngle + THREE.MathUtils.degToRad(35);

    const { distance, height } = getCameraPosition(this.camera);

    gsap.to(this.cameraBase, {
      x: this.lookTarget.x + Math.cos(targetAngle) * distance,
      y: this.lookTarget.y + height,
      z: this.lookTarget.z + Math.sin(targetAngle) * distance,
      duration,
      ease: "power2.inOut",
    });
  },

  // Per-frame camera placement — either the permanent slow orbit
  // (post-memory-reveal resting state) or the dolly+sway language every
  // earlier beat drives via `this.cameraBase`.
  updateCamera(delta) {
    if (this.cameraOrbitMode) {
      this.cameraOrbitAngle += delta * this.cameraOrbitSpeed;

      const breathe = Math.sin(this.time * 0.08) * 0.6;
      const r = this.cameraOrbitRadius + breathe;

      this.camera.position.set(
        this.lookTarget.x + Math.cos(this.cameraOrbitAngle) * r,
        this.lookTarget.y + this.cameraOrbitHeight,
        this.lookTarget.z + Math.sin(this.cameraOrbitAngle) * r,
      );

      this.camera.lookAt(this.lookTarget);
    } else {
      const swayX =
        Math.sin(this.time * 0.35) * 0.12 + Math.sin(this.time * 0.13) * 0.05;
      const swayY = Math.cos(this.time * 0.28) * 0.08;
      const swayZ = Math.sin(this.time * 0.19) * 0.06;

      this.camera.position.set(
        this.cameraBase.x + swayX,
        this.cameraBase.y + swayY,
        this.cameraBase.z + swayZ,
      );

      this.camera.lookAt(this.lookTarget);
    }
  },
};
