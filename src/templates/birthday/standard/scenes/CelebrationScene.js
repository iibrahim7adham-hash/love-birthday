import gsap from "gsap";

import BaseScene from "./BaseScene";
import { CelebrationAtmosphere } from "../objects/celebration";
import { birthdayMessages } from "../content/messages";

// Scene 4 — Celebration. Spawns the CelebrationAtmosphere (balloons,
// fireworks, floating birthday text, ambient dust) — entirely driven by
// content/config/celebration.js — around the cake left on `context.cake`,
// lets it breathe for a configurable beat, then hands off to the Blow
// Candles interaction.
//
// The atmosphere is stored on `context.atmosphere` and NOT disposed in
// exit() — BlowCandlesScene keeps it animating underneath its button.
// CakeTransitionScene is what finally clears it away, alongside the cake.
export default class CelebrationScene extends BaseScene {
  enter() {
    const { scene, config, cake } = this.context;

    if (!this.context.atmosphere) {
      this.context.atmosphere = new CelebrationAtmosphere(scene, {
        topY: cake ? cake.topY : 2,
        config: config.celebration,
        theme: config.theme,
        floatingText: birthdayMessages[0],
      });
    }

    this.advanceTimer = gsap.delayedCall(
      config.celebration.advanceDelay,
      () => {
        this.context.goToNext();
      },
    );
  }

  update(delta) {
    const { cake, atmosphere } = this.context;

    if (cake) cake.candles.forEach((candle) => candle.update(delta));
    if (atmosphere) atmosphere.update(delta);
  }

  exit() {
    if (this.advanceTimer) {
      this.advanceTimer.kill();
      this.advanceTimer = null;
    }
  }
}
