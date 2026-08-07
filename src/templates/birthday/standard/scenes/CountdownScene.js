import BaseScene from "./BaseScene";
import CountdownUI from "../ui/CountdownUI";

// Scene 2 — Countdown. Runs the 3-2-1 + fade-to-black overlay (CountdownUI
// owns the actual animation) and hands off to the Cake Build scene once
// the screen has gone fully dark.
export default class CountdownScene extends BaseScene {
  enter() {
    this.ui = new CountdownUI(this.context.config.countdown);

    this.ui.playSequence(() => {
      this.context.goToNext();
    });
  }

  exit() {
    if (this.ui) {
      this.ui.destroy();
      this.ui = null;
    }
  }
}
