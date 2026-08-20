import "./FinalMessage.css";
import { FINAL_MESSAGE_TEXT, FINAL_MESSAGE_FADE_DURATION } from "./FinalHeartFallConstants";

// Part 21 — the final "I love you" line, sitting perfectly centered
// over the heart pile. A single static DOM element (no per-frame work
// of its own) — show() just adds the class that CSS fades in (see
// FinalMessage.css), triggered once by FinalHeartFall's own onFull
// hook (see GiftBox.js).
export default class FinalMessage {
  constructor() {
    this.element = document.createElement("div");
    this.element.id = "boom-final-message";
    this.element.style.setProperty("--boom-final-message-duration", `${FINAL_MESSAGE_FADE_DURATION}s`);
    this.element.textContent = FINAL_MESSAGE_TEXT;
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
