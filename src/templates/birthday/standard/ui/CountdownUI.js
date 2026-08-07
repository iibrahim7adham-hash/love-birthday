import "./CountdownUI.css";
import gsap from "gsap";

// 3-2-1 countdown overlay + fade-to-black. `playSequence()` drives itself
// off content/config.js's countdown settings and calls `onComplete` once
// the screen has gone fully dark — CountdownScene uses that as the cue to
// advance into the Cake Build scene.
export default class CountdownUI {
  constructor(config) {
    this.config = config;

    this.create();
  }

  create() {
    this.element = document.createElement("div");
    this.element.id = "standard-countdown-ui";

    this.element.innerHTML = `
      <div class="standard-countdown-number"></div>
      <div class="standard-countdown-darkness"></div>
    `;

    document.body.appendChild(this.element);

    this.numberEl = this.element.querySelector(".standard-countdown-number");
    this.darknessEl = this.element.querySelector(
      ".standard-countdown-darkness",
    );
  }

  playSequence(onComplete) {
    const { from, stepDuration, darknessDuration } = this.config;

    const tl = gsap.timeline({
      onComplete: () => {
        if (onComplete) onComplete();
      },
    });

    for (let n = from; n >= 1; n--) {
      tl.call(() => {
        this.numberEl.textContent = n;
      });

      tl.fromTo(
        this.numberEl,
        { scale: 0.6, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: stepDuration * 0.4,
          ease: "back.out(2)",
        },
      );

      tl.to(this.numberEl, {
        opacity: 0,
        duration: stepDuration * 0.3,
        delay: stepDuration * 0.3,
      });
    }

    tl.to(this.darknessEl, {
      opacity: 1,
      duration: darknessDuration,
      ease: "power2.in",
    });

    return tl;
  }

  destroy() {
    this.element.remove();
  }
}
