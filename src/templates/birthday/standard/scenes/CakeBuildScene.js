import BaseScene from "./BaseScene";
import { CakeBase, Candle } from "../objects/cake";

// Scene 3 — Cake Build. Assembles a CakeBase — entirely driven by
// content/config/cake.js — and, only once that fully resolves, rings its
// top with lit candles from content/config/candles.js, satisfying
// "candles appear only after the cake is complete".
//
// The built cake + its candles are stashed on `context.cake` rather than
// kept scene-local, because Celebration, BlowCandles and the Transition
// scene all need to keep referencing (and updating) the same objects
// after this scene stops being active.
export default class CakeBuildScene extends BaseScene {
  enter() {
    const { scene, config } = this.context;

    this.cakeBase = new CakeBase(config.cake).addTo(scene);

    this.cakeBase.build().then(() => this.spawnCandles());
  }

  spawnCandles() {
    const { config } = this.context;
    const candlesConfig = config.candles;
    const smokeConfig = config.particles.candleSmoke;
    const count = candlesConfig.count;

    const candles = [];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;

      const candle = new Candle({
        x: Math.cos(angle) * candlesConfig.ringRadius,
        z: Math.sin(angle) * candlesConfig.ringRadius,
        y: this.cakeBase.topY,
        candlesConfig,
        smokeConfig,
      }).addTo(this.cakeBase.group);

      candles.push(candle);
    }

    this.context.cake = {
      base: this.cakeBase,
      group: this.cakeBase.group,
      candles,
      topY: this.cakeBase.topY,
    };

    this.context.goToNext();
  }

  update(delta) {
    // Candles don't exist until spawnCandles() resolves; context.cake
    // stays undefined until then.
    if (this.context.cake) {
      this.context.cake.candles.forEach((candle) => candle.update(delta));
    }
  }

  // No exit() cleanup here on purpose — the cake persists into
  // Celebration/BlowCandles/Transition via `context.cake`.
  // CakeTransitionScene is what eventually disposes of it.
}
