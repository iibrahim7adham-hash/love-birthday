import BaseScene from "./BaseScene";
import IntroUI from "../ui/IntroUI";
import { interpolate } from "../content/config/locale";

// Scene 1 — Intro Screen. Purely the IntroUI DOM overlay for now (title,
// subtitle, START button, all sourced from content/config/text.js and
// content/config/person.js). A future ambient 3D backdrop (soft
// particles, slow camera drift) can be added here later without
// touching the flow — it would just be another object created in
// enter() and disposed in exit().
export default class IntroScene extends BaseScene {
  enter() {
    const { config } = this.context;

    this.ui = new IntroUI({
      title: interpolate(config.text.intro.title, config.person),
      subtitle: config.text.intro.subtitle,
      buttonLabel: config.text.intro.buttonLabel,
    });

    this.onStart = () => this.context.goToNext();

    window.addEventListener("standard:intro:start", this.onStart);
  }

  exit() {
    window.removeEventListener("standard:intro:start", this.onStart);

    if (this.ui) {
      this.ui.destroy();
      this.ui = null;
    }
  }
}
