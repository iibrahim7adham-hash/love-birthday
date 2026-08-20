import gsap from "gsap";

import "./Opening.css";
import {
  OPENING_TEXT,
  OPENING_FADE_IN_DELAY,
  OPENING_FADE_IN_DURATION,
  OPENING_DIVIDER_DELAY,
  OPENING_DIVIDER_DURATION,
  OPENING_DIVIDER_OPACITY,
  OPENING_HOLD_DURATION,
  OPENING_EXIT_DURATION,
} from "./Constants";

// Scene 1's own content — just the basmala and its divider. The
// surrounding decorative setting (leaves, marble corners, sparkles) is
// a separate, longer-lived layer owned by Background.js — see
// AliMuneerScene.js, which constructs it once and keeps it alive
// through Scene 2 as well, independent of this class's own lifecycle.
// Same DOM+CSS+GSAP overlay technique every other template's own 2D
// layers already use (see e.g. boom/reveal/Reveal.js).
export default class Opening {
  // `onComplete`, if given, fires once — after the approved entrance
  // above has fully played AND held on screen for a beat — right as
  // the Bismillah finishes fading out, so Scene 2 can begin. Purely a
  // sequencing hook; it changes nothing about the entrance itself.
  constructor(onComplete) {
    this.onComplete = onComplete;

    this.element = document.createElement("div");
    this.element.id = "ali-muneer-opening";
    this.element.innerHTML = `
      <div class="ali-muneer-opening-content">
        <p class="ali-muneer-opening-text" dir="rtl" lang="ar">${OPENING_TEXT}</p>
        <div class="ali-muneer-opening-divider">
          <span class="ali-muneer-opening-divider-line"></span>
          <span class="ali-muneer-opening-divider-mark"></span>
          <span class="ali-muneer-opening-divider-line"></span>
        </div>
      </div>
    `;
    document.body.appendChild(this.element);

    this.text = this.element.querySelector(".ali-muneer-opening-text");
    this.divider = this.element.querySelector(".ali-muneer-opening-divider");

    this._playEntrance();
  }

  _playEntrance() {
    const tl = gsap.timeline({
      onComplete: () => {
        this._holdCall = gsap.delayedCall(OPENING_HOLD_DURATION, () => this._exit());
      },
    });
    this._tween = tl;

    // The Bismillah itself — unchanged timing/duration from the
    // approved Scene 1.
    tl.to(
      this.text,
      { opacity: 1, duration: OPENING_FADE_IN_DURATION, ease: "power1.inOut" },
      OPENING_FADE_IN_DELAY,
    );

    // The divider settles in just after the text, never before it.
    tl.to(
      this.divider,
      { opacity: OPENING_DIVIDER_OPACITY, duration: OPENING_DIVIDER_DURATION, ease: "sine.inOut" },
      OPENING_DIVIDER_DELAY,
    );
  }

  // Only the Bismillah + its divider fade out here — the background
  // (owned separately by Background.js) is never touched. Scene 2 only
  // starts building once this fade-out finishes; the element is then
  // removed outright.
  _exit() {
    gsap.to([this.text, this.divider], {
      opacity: 0,
      duration: OPENING_EXIT_DURATION,
      ease: "power1.inOut",
      onComplete: () => {
        this.destroy();
        if (this.onComplete) this.onComplete();
      },
    });
  }

  update(delta) {}

  destroy() {
    if (this._tween) this._tween.kill();
    if (this._holdCall) this._holdCall.kill();
    gsap.killTweensOf(this.element);

    this.element.remove();
  }
}
