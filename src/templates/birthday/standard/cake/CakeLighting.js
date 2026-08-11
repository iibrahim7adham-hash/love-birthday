import * as THREE from "three";
import gsap from "gsap";

import {
  REVEAL_WARM_LIGHT_FADE_DURATION,
  CANDLELIGHT_FADE_DURATION,
  CANDLE_TOP_SURFACE_Y,
  CANDLE_BLOWOUT_DIM_DURATION,
} from "./CakeConstants";

// The candle light goes fully out (the candles are, after all, out) and
// the reveal light dims to a low fraction of whatever it's currently at
// — never fully to 0, so the cake keeps a faint ambient presence rather
// than vanishing into black (see the blow-out sequence's own brief:
// "the cake should remain visible... a very subtle amount of ambient
// illumination" should remain).
const BLOWOUT_REVEAL_LIGHT_FRACTION = 0.32;

// Two Standard-owned lights layered on top of the shared engine's own
// ambient/main/rim/warm lights (see engine/lights/Lights.js — those are
// constructed once for every template and are NOT touched here; this
// only ADDS to them, the same way luxury/Environment/ adds its own
// extra lights without ever modifying the shared Lights class). Both
// start at intensity 0 so the environment is genuinely dark/cool before
// the reveal begins, exactly as the brief asks — the warmth is
// something that visibly ARRIVES, not something already lighting the
// (currently empty) scene from Steps 1-2.
export default class CakeLighting {
  constructor(scene) {
    this.scene = scene;

    // The cake's own key light — arrives gradually as the cake forms,
    // then stays on as its main warm illumination.
    this.revealLight = new THREE.PointLight(0xffb35a, 0, 14);
    this.revealLight.position.set(0, 2.6, 4);
    this.scene.add(this.revealLight);

    // A smaller, more localized light right at candle height — only
    // switched on at the ignite beat, so "candlelight adds localized
    // glow" reads as its own distinct moment rather than blending into
    // the reveal light already being on.
    this.candleLight = new THREE.PointLight(0xffa142, 0, 4);
    this.candleLight.position.set(0, CANDLE_TOP_SURFACE_Y + 0.3, 0);
    this.scene.add(this.candleLight);
  }

  fadeInRevealLight(targetIntensity) {
    return gsap.to(this.revealLight, {
      intensity: targetIntensity,
      duration: REVEAL_WARM_LIGHT_FADE_DURATION,
      ease: "power2.out",
    });
  }

  fadeInCandleLight(targetIntensity) {
    return gsap.to(this.candleLight, {
      intensity: targetIntensity,
      duration: CANDLELIGHT_FADE_DURATION,
      ease: "power2.out",
    });
  }

  // The candle-blowout sequence's own lighting beat — the candle light
  // (no longer meaningful once the flames are out) fades fully to 0
  // while the reveal light dims to a low fraction of its own CURRENT
  // intensity (not a hardcoded target), so this reads correctly however
  // bright the scene happens to be when it's called.
  dimForBlowOut(duration = CANDLE_BLOWOUT_DIM_DURATION) {
    const tl = gsap.timeline();

    tl.to(this.candleLight, { intensity: 0, duration, ease: "power2.out" }, 0);
    tl.to(
      this.revealLight,
      { intensity: this.revealLight.intensity * BLOWOUT_REVEAL_LIGHT_FRACTION, duration, ease: "power2.out" },
      0,
    );

    return tl;
  }

  destroy() {
    gsap.killTweensOf(this.revealLight);
    gsap.killTweensOf(this.candleLight);

    this.scene.remove(this.revealLight);
    this.scene.remove(this.candleLight);
  }
}
