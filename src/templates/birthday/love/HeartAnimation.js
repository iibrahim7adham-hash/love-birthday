import gsap from "gsap";

import { HEART_CENTER_Y } from "./Constants";

// A full in/out cycle roughly every ~5.2s — a calm resting pace, not a
// pulse. Kept deliberately slow and small (see BREATH_AMOUNT) per the
// reference: the heart should feel alive, not elastic.
const BREATH_SPEED = 1.2;

// Max scale deviation, +/-3.5% — subtle by design. This is the one
// knob most responsible for "elegant" vs "exaggerated"; keep it small.
const BREATH_AMOUNT = 0.035;

// Breathing ramps in smoothly after a short pause rather than starting
// the instant the heart begins forming, so it never competes with or
// muddies the initial gather.
const BREATH_START_DELAY = 2.5;
const BREATH_FADE_IN_DURATION = 2.5;

// Breathing/pulse/idle motion — entirely separate from HeartFormation,
// which owns only the heart's shape and its initial gather. This class
// never samples a heart coordinate itself: it reads the SAME base
// target positions HeartFormation already computed (passed in, not
// regenerated) and periodically nudges them with a slow, uniform scale
// oscillation around the heart's own center, pushed back into the
// particle engine through its ordinary public setTargets(). The engine
// never learns this motion exists — it just keeps easing toward
// whatever target it's given, exactly as it did for the initial gather.
export default class HeartAnimation {
  constructor(particles, heartTargets) {
    this.particles = particles;
    this.heartTargets = heartTargets;

    this.time = 0;
    this.amplitude = 0;
  }

  begin() {
    gsap.to(this, {
      amplitude: BREATH_AMOUNT,
      duration: BREATH_FADE_IN_DURATION,
      delay: BREATH_START_DELAY,
      ease: "sine.inOut",
    });
  }

  update(delta) {
    this.time += delta;

    if (this.amplitude === 0) return;

    const breatheScale =
      1 + Math.sin(this.time * BREATH_SPEED) * this.amplitude;

    this.particles.setTargets((i) => {
      const base = this.heartTargets[i];

      return {
        x: base.x * breatheScale,
        y: HEART_CENTER_Y + (base.y - HEART_CENTER_Y) * breatheScale,
        z: base.z * breatheScale,
      };
    });
  }
}
