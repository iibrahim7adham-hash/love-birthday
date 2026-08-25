import "./HeartMessage.css";

const MESSAGE_TEXT = "I Love You 💕"; // a single static phrase, no animation of its own — see HeartMessage.js's own comment on why
const FADE_DURATION = 2;

// A single static DOM element sitting in the empty middle of the
// particle heart (see HeartCurve.js — the contour is a hollow band,
// nothing samples the interior) — same "plain CSS overlay, no per-frame
// work of its own" convention as boom/giftbox/FinalMessage.js, since
// this project loads no font a Three.js TextGeometry could use anyway.
// show() just adds the class CSS fades in (see HeartMessage.css).
export default class HeartMessage {
  constructor() {
    this.element = document.createElement("div");
    this.element.id = "hyatei-heart-message";
    this.element.style.setProperty(
      "--hyatei-heart-message-duration",
      `${FADE_DURATION}s`,
    );
    this.element.textContent = MESSAGE_TEXT;
    this.element.setAttribute("aria-hidden", "true");
    document.body.appendChild(this.element);
  }

  show() {
    this.element.classList.add("is-visible");
  }

  destroy() {
    this.element.remove();
  }
}
