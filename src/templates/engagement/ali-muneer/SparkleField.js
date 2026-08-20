import "./SparkleField.css";
import {
  SPARKLE_FIELD_TWINKLE_DURATION_RANGE,
  SPARKLE_FIELD_TWINKLE_OPACITY_RANGE,
  SPARKLE_FIELD_DUST_DURATION_RANGE,
  SPARKLE_FIELD_DUST_OPACITY_RANGE,
} from "./Constants";

// Bright twinkling points, weighted into four clusters right where the
// frame's own corner filigree already lives (see PageFrame.js) plus a
// couple of faint ones resting on the top/bottom frame line itself —
// deliberately never inside the central band of the screen, which is
// reserved for the Opening/Envelope/Hero copy, so the effect never
// competes with it.
const SPARKLE_POSITIONS = [
  { top: "4%", left: "6%" },
  { top: "9%", left: "3%" },
  { top: "3%", left: "13%" },
  { top: "12%", left: "10%" },
  { top: "4%", left: "94%" },
  { top: "9%", left: "97%" },
  { top: "3%", left: "87%" },
  { top: "12%", left: "90%" },
  { top: "96%", left: "6%" },
  { top: "91%", left: "3%" },
  { top: "97%", left: "13%" },
  { top: "88%", left: "10%" },
  { top: "96%", left: "94%" },
  { top: "91%", left: "97%" },
  { top: "97%", left: "87%" },
  { top: "88%", left: "90%" },
  { top: "2%", left: "50%" },
  { top: "98%", left: "50%" },
];

// Larger, dimmer, slower-drifting motes running down the side edges —
// sparser and set further in from the corners than the sparkles above,
// reading as ambient gold dust rather than a repeat of the same
// twinkle. Still clear of the central band.
const DUST_POSITIONS = [
  { top: "20%", left: "8%" },
  { top: "37%", left: "4%" },
  { top: "63%", left: "5%" },
  { top: "80%", left: "9%" },
  { top: "20%", left: "92%" },
  { top: "37%", left: "96%" },
  { top: "63%", left: "95%" },
  { top: "80%", left: "91%" },
];

function randomBetween([min, max]) {
  return min + Math.random() * (max - min);
}

// A persistent field of tiny gold sparkles/dust fixed to the viewport,
// the same "stays flush regardless of scroll" treatment as PageFrame
// (see PageFrame.js) so it reads as the frame's own ambience rather
// than something tied to any one section. Every particle's own
// opacity/transform animation is driven entirely by CSS @keyframes
// (see SparkleField.css) running on the compositor — this class only
// ever touches the DOM once, at construction, to hand each particle
// its randomized timing via inline custom properties; there is no
// per-frame JS work (update() below is a deliberate no-op, unlike
// Background's own GSAP-driven entrance).
export default class SparkleField {
  constructor() {
    this.element = document.createElement("div");
    this.element.className = "ali-muneer-sparkle-field";
    this.element.setAttribute("aria-hidden", "true");

    SPARKLE_POSITIONS.forEach((position) => {
      this.element.appendChild(
        this._createParticle(
          "ali-muneer-sparkle",
          position,
          SPARKLE_FIELD_TWINKLE_DURATION_RANGE,
          SPARKLE_FIELD_TWINKLE_OPACITY_RANGE,
        ),
      );
    });

    DUST_POSITIONS.forEach((position) => {
      this.element.appendChild(
        this._createParticle(
          "ali-muneer-sparkle-dust",
          position,
          SPARKLE_FIELD_DUST_DURATION_RANGE,
          SPARKLE_FIELD_DUST_OPACITY_RANGE,
        ),
      );
    });

    document.body.appendChild(this.element);
  }

  _createParticle(className, position, durationRange, opacityRange) {
    const particle = document.createElement("span");
    particle.className = className;
    particle.style.top = position.top;
    particle.style.left = position.left;
    particle.style.setProperty("--am-sparkle-duration", `${randomBetween(durationRange).toFixed(2)}s`);
    particle.style.setProperty("--am-sparkle-delay", `${randomBetween([0, durationRange[1]]).toFixed(2)}s`);
    particle.style.setProperty("--am-sparkle-peak", randomBetween(opacityRange).toFixed(2));
    return particle;
  }

  update(delta) {}

  destroy() {
    this.element.remove();
  }
}
