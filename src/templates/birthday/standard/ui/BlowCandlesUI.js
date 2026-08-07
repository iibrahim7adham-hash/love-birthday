import "./BlowCandlesUI.css";
import gsap from "gsap";

// "Blow the Candles" call-to-action button. Kept separate from
// CelebrationScene's atmosphere so BlowCandlesScene owns exactly this one
// piece of UI and its own lifecycle, independent of the balloons/fireworks
// running underneath it. Dispatches "standard:candles:blow" on click —
// real breath-detection (mic input) can replace/augment this later
// without BlowCandlesScene's listener needing to change.
export default class BlowCandlesUI {
  constructor(config) {
    this.config = config;

    this.create();
    this.events();
  }

  create() {
    this.element = document.createElement("div");
    this.element.id = "standard-blow-candles-ui";

    this.element.innerHTML = `
      <button class="standard-blow-btn">${this.config.buttonLabel}</button>
    `;

    document.body.appendChild(this.element);

    this.button = this.element.querySelector(".standard-blow-btn");

    gsap.from(this.button, {
      opacity: 0,
      y: 20,
      duration: 0.6,
      ease: "power2.out",
    });
  }

  events() {
    this.onClick = () => {
      this.button.disabled = true;

      window.dispatchEvent(new CustomEvent("standard:candles:blow"));
    };

    this.button.addEventListener("click", this.onClick);
  }

  destroy() {
    this.button.removeEventListener("click", this.onClick);
    this.element.remove();
  }
}
