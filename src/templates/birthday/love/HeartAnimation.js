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
  constructor(particles, heartTargets, audio) {
    this.particles = particles;
    this.heartTargets = heartTargets;
    this.audio = audio;

    this.time = 0;
    this.amplitude = 0;

    // Reused across every setTargets() callback invocation below —
    // LoveParticles.setTargets() reads .x/.y/.z off whatever's returned
    // immediately and synchronously before asking for the next index
    // (see its own loop), so mutating and returning the same object
    // 3000 times a frame is safe, and avoids allocating a fresh one for
    // every particle, every frame, for as long as the heart is
    // breathing (i.e. most of the scene's lifetime).
    this._targetScratch = { x: 0, y: 0, z: 0 };
  }

  begin() {
    gsap.to(this, {
      amplitude: BREATH_AMOUNT,
      duration: BREATH_FADE_IN_DURATION,
      delay: BREATH_START_DELAY,
      ease: "sine.inOut",
      // The gather has settled by the time breathing kicks in — the
      // natural "the heart has formed" moment, not the amplitude ramp's
      // own completion further down the line.
      onStart: () => this.audio.trigger("heart:formation-complete"),
    });
  }

  update(delta) {
    this.time += delta;

    if (this.amplitude === 0) return;

    const breatheScale =
      1 + Math.sin(this.time * BREATH_SPEED) * this.amplitude;

    this.particles.setTargets((i) => {
      const base = this.heartTargets[i];
      const target = this._targetScratch;

      target.x = base.x * breatheScale;
      target.y = HEART_CENTER_Y + (base.y - HEART_CENTER_Y) * breatheScale;
      target.z = base.z * breatheScale;

      return target;
    });
  }
}
