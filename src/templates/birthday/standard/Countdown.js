import gsap from "gsap";

import "./Countdown.css";

import {
  COUNTDOWN_DIGITS,
  COUNTDOWN_ENTER_DELAY,
  COUNTDOWN_ATMOSPHERE_FADE_DURATION,
  COUNTDOWN_NUMBER_ENTRANCE_DURATION,
  COUNTDOWN_NUMBER_ENTRANCE_START_SCALE,
  COUNTDOWN_NUMBER_HOLD_DURATION,
  COUNTDOWN_NUMBER_EXIT_DURATION,
  COUNTDOWN_NUMBER_EXIT_SCALE,
  COUNTDOWN_NUMBER_GAP,
  COUNTDOWN_ATMOSPHERE_PULSE_SCALE,
  COUNTDOWN_ATMOSPHERE_FINAL_PULSE_SCALE,
  COUNTDOWN_ATMOSPHERE_PULSE_DURATION,
  COUNTDOWN_EXIT_DELAY,
  COUNTDOWN_EXIT_DURATION,
} from "./Constants";

// The lifecycle this file drives, in order — the same lightweight
// plain-string-constants approach envelope/Envelope.js's own
// SEQUENCE_STATE and StartScreen.js's own START_STATE already use (this
// project doesn't need a state-machine library). Nothing here is
// interactive, so unlike those two this state exists purely for
// clarity/observability, not as an input guard — but it's still the
// single source of truth for "where the sequence currently is".
const COUNTDOWN_STATE = {
  COUNTDOWN_ENTER: "countdown-enter", // constructed, atmosphere fading up
  COUNTDOWN_3: "countdown-3",
  COUNTDOWN_2: "countdown-2",
  COUNTDOWN_1: "countdown-1",
  COUNTDOWN_COMPLETE: "countdown-complete", // digits done, dissolving out
};

// Step 2's entire visual surface: the same atmosphere language as
// StartScreen (see Countdown.css's own comment on why this isn't
// literally the same DOM element as Step 1's) plus a single reused
// number element whose text content changes for each beat, rather than
// three separate elements/textures — see _appendNumberBeat(). One
// master GSAP timeline drives the whole
// enter -> 3 -> 2 -> 1 -> complete sequence; nothing here uses
// setTimeout. Constructed by StandardScene once StartScreen's own
// onComplete fires, and calls its own onComplete exactly once, after
// its exit dissolve finishes — the same contract StartScreen already
// follows, so StandardScene didn't need to change shape to host this.
export default class Countdown {
  constructor(audio, onComplete) {
    this.audio = audio;
    this.onComplete = onComplete;

    this.state = COUNTDOWN_STATE.COUNTDOWN_ENTER;

    this.create();
    this.playSequence();
  }

  create() {
    this.element = document.createElement("div");
    this.element.id = "standard-countdown";

    this.element.innerHTML = `
      <div class="standard-countdown-atmosphere" aria-hidden="true"></div>
      <div class="standard-countdown-number" aria-live="polite"></div>
    `;

    document.body.appendChild(this.element);

    this.atmosphere = this.element.querySelector(".standard-countdown-atmosphere");
    this.numberEl = this.element.querySelector(".standard-countdown-number");
  }

  // One master timeline for the entire sequence: a short breath of
  // darkness, the atmosphere arriving, then each digit's own
  // entrance/hold/exit beat back to back, then the whole composition
  // dissolving into the ready-state hand-off. Every beat is a position
  // on this one timeline, never a scattered setTimeout.
  playSequence() {
    const tl = gsap.timeline({ onComplete: () => this._finish() });
    this._timeline = tl;

    let cursor = COUNTDOWN_ENTER_DELAY;

    tl.to(
      this.atmosphere,
      { opacity: 1, duration: COUNTDOWN_ATMOSPHERE_FADE_DURATION, ease: "power2.out" },
      cursor,
    );

    COUNTDOWN_DIGITS.forEach((digit, index) => {
      const isLast = index === COUNTDOWN_DIGITS.length - 1;
      cursor = this._appendNumberBeat(tl, digit, cursor, isLast);
    });

    cursor += COUNTDOWN_EXIT_DELAY;

    tl.call(() => {
      this.state = COUNTDOWN_STATE.COUNTDOWN_COMPLETE;
    }, null, cursor);

    tl.to(
      this.element,
      { opacity: 0, duration: COUNTDOWN_EXIT_DURATION, ease: "power2.inOut" },
      cursor,
    );
  }

  // Appends one digit's call-out + entrance + hold + exit to `tl`
  // starting at `startAt`, and returns the position the next beat
  // should start at — reused for all three digits instead of writing
  // the same block three times. The number begins smaller/transparent
  // ("arriving from the atmosphere" per the brief) and contracts away
  // on exit rather than growing or flying off.
  _appendNumberBeat(tl, digit, startAt, isLast) {
    const stateKey = `COUNTDOWN_${digit}`;

    tl.call(
      () => {
        this.state = COUNTDOWN_STATE[stateKey];
        this.numberEl.textContent = String(digit);
        this.audio.trigger(`countdown:${digit}`);
      },
      null,
      startAt,
    );

    tl.fromTo(
      this.numberEl,
      { opacity: 0, scale: COUNTDOWN_NUMBER_ENTRANCE_START_SCALE },
      { opacity: 1, scale: 1, duration: COUNTDOWN_NUMBER_ENTRANCE_DURATION, ease: "power2.out" },
      startAt,
    );

    // The atmosphere's own restrained pulse alongside the number —
    // stronger on the last digit, per the brief's own example.
    tl.to(
      this.atmosphere,
      {
        scale: isLast ? COUNTDOWN_ATMOSPHERE_FINAL_PULSE_SCALE : COUNTDOWN_ATMOSPHERE_PULSE_SCALE,
        duration: COUNTDOWN_ATMOSPHERE_PULSE_DURATION,
        ease: "power2.out",
      },
      startAt,
    );

    const exitStart = startAt + COUNTDOWN_NUMBER_ENTRANCE_DURATION + COUNTDOWN_NUMBER_HOLD_DURATION;

    tl.to(
      this.numberEl,
      {
        opacity: 0,
        scale: COUNTDOWN_NUMBER_EXIT_SCALE,
        duration: COUNTDOWN_NUMBER_EXIT_DURATION,
        ease: "power2.in",
      },
      exitStart,
    );

    return exitStart + COUNTDOWN_NUMBER_EXIT_DURATION + COUNTDOWN_NUMBER_GAP;
  }

  _finish() {
    this.audio.trigger("countdown:complete");
    this.destroy();
    this.onComplete();
  }

  // Safe to call more than once (StandardScene.destroy() also calls
  // this defensively on teardown) — killing an already-finished
  // timeline/already-cleared tweens is a harmless no-op, and this never
  // calls onComplete itself, so destruction can never trigger a
  // hand-off that didn't actually happen.
  destroy() {
    if (this._timeline) this._timeline.kill();
    gsap.killTweensOf(this.numberEl);
    gsap.killTweensOf(this.atmosphere);
    gsap.killTweensOf(this.element);

    this.element.remove();
  }
}
