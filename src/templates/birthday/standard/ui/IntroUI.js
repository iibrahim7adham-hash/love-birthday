import "./IntroUI.css";
import gsap from "gsap";

// Landing screen DOM overlay: title, subtitle and a START button, all
// pulled from content/config.js so copy can be customized per order
// without touching this file. Dispatches "standard:intro:start" on the
// START click — IntroScene listens for that to advance the flow, the
// same window-CustomEvent pattern the luxury template's IntroUI uses.
export default class IntroUI {
  constructor(config) {
    this.config = config;

    this.create();
    this.animate();
    this.events();
  }

  create() {
    this.element = document.createElement("div");
    this.element.id = "standard-intro-ui";

    this.element.innerHTML = `
      <div class="standard-intro-card">
        <h1>${this.config.title}</h1>
        <p class="standard-intro-subtitle">${this.config.subtitle}</p>
        <button class="standard-start-btn">${this.config.buttonLabel}</button>
      </div>
    `;

    document.body.appendChild(this.element);

    this.card = this.element.querySelector(".standard-intro-card");
    this.button = this.element.querySelector(".standard-start-btn");
  }

  animate() {
    gsap.from(this.card, {
      opacity: 0,
      y: 30,
      duration: 1,
      ease: "power3.out",
    });
  }

  events() {
    this.onClick = () => {
      gsap.to(this.element, {
        opacity: 0,
        duration: 0.5,
        onComplete: () => {
          window.dispatchEvent(new CustomEvent("standard:intro:start"));
          this.destroy();
        },
      });
    };

    this.button.addEventListener("click", this.onClick);
  }

  destroy() {
    this.button.removeEventListener("click", this.onClick);
    this.element.remove();
  }
}
