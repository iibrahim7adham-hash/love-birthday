import BaseScene from "./BaseScene";
import BlowCandlesUI from "../ui/BlowCandlesUI";

// Scene 5 — Blow Candles Interaction. Surfaces the "Blow the Candles"
// button (label from content/config/text.js); on click, triggers the
// "candles:blow" audio event (see audio/StandardAudioCues.js — silently
// a no-op until a real file is configured there) and extinguishes every
// candle on `context.cake` in a staggered wave sourced from
// content/config/candles.js, moving on once they've all gone out. The
// celebration atmosphere from Scene 4 keeps animating underneath via
// `context.atmosphere`.
export default class BlowCandlesScene extends BaseScene {
  enter() {
    const { config } = this.context;

    this.ui = new BlowCandlesUI({
      buttonLabel: config.text.blowCandles.buttonLabel,
    });

    this.onBlow = () => this.blowOutCandles();

    window.addEventListener("standard:candles:blow", this.onBlow);
  }

  blowOutCandles() {
    const { cake, config, audio } = this.context;

    audio.trigger("candles:blow");

    if (!cake) {
      this.context.goToNext();
      return;
    }

    const stagger = config.candles.extinguishStagger;

    const extinguishing = cake.candles.map((candle, i) =>
      candle.extinguish(i * stagger),
    );

    Promise.all(extinguishing).then(() => {
      this.context.goToNext();
    });
  }

  update(delta) {
    const { cake, atmosphere } = this.context;

    if (cake) cake.candles.forEach((candle) => candle.update(delta));
    if (atmosphere) atmosphere.update(delta);
  }

  exit() {
    window.removeEventListener("standard:candles:blow", this.onBlow);

    if (this.ui) {
      this.ui.destroy();
      this.ui = null;
    }
  }
}
