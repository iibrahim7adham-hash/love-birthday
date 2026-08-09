import gsap from "gsap";

import "./Letter.css";

import {
  LETTER_LINES,
  LETTER_SIGNATURE,
  LETTER_TEXT_DIRECTION,
  LETTER_TEXT_LANGUAGE,
  LETTER_EMERGE_RISE_PX,
  LETTER_EMERGE_START_SCALE,
  LETTER_EMERGE_START_ROTATION_DEG,
  LETTER_EMERGE_DURATION,
  LETTER_SETTLE_DURATION,
  LETTER_TEXT_START_DELAY,
  LETTER_WORD_STAGGER,
  LETTER_WORD_FADE_DURATION,
  LETTER_WORD_RISE_PX,
  LETTER_LINE_DURATION,
  LETTER_LINE_RISE_PX,
  LETTER_SIGNATURE_EXTRA_DELAY,
  LETTER_READING_DELAY,
  LETTER_RETURN_LIFT_PX,
  LETTER_RETURN_LIFT_DURATION,
  LETTER_RETURN_DURATION,
  LETTER_RETURN_END_SCALE,
  LETTER_RETURN_ROTATION_DEG,
} from "./LetterConstants";

// The letter's own presentation only — how it rises out of the
// envelope's opening, how its text reveals word by word, and how it
// glides back into the envelope's opening once the reading window is
// over. It knows nothing about envelopes, seals, or stickers;
// Envelope.js constructs one and calls emerge() at the right moment,
// then (once the letter itself signals "letter:return" — see emerge()
// below) calls returnToEnvelope() with a target element to aim for.
// That target is the ONLY thing about the envelope this file ever
// touches, and only as a plain DOM element to measure, never imported
// or referenced by type.
export default class Letter {
  constructor(audio) {
    this.audio = audio;
    this._returned = false;

    this.element = document.createElement("div");
    this.element.className = "love-letter";

    const linesHtml = LETTER_LINES.map((line) => {
      const wordsHtml = line
        .split(" ")
        .map((word) => `<span class="love-letter-word">${word}</span>`)
        .join(" ");
      return `<p class="love-letter-line">${wordsHtml}</p>`;
    }).join("");

    this.element.innerHTML = `
      <div class="love-letter-paper" dir="${LETTER_TEXT_DIRECTION}" lang="${LETTER_TEXT_LANGUAGE}">
        <span class="love-letter-corner love-letter-corner--tl" aria-hidden="true"></span>
        <span class="love-letter-corner love-letter-corner--tr" aria-hidden="true"></span>
        <span class="love-letter-corner love-letter-corner--bl" aria-hidden="true"></span>
        <span class="love-letter-corner love-letter-corner--br" aria-hidden="true"></span>
        <div class="love-letter-flourish" aria-hidden="true">
          <span class="love-letter-flourish-line"></span>
          <span class="love-letter-flourish-heart">&#10084;</span>
          <span class="love-letter-flourish-line"></span>
        </div>
        ${linesHtml}
        <span class="love-letter-divider" aria-hidden="true"></span>
        <p class="love-letter-signature">${LETTER_SIGNATURE}</p>
      </div>
    `;

    document.body.appendChild(this.element);

    this.wordElements = Array.from(this.element.querySelectorAll(".love-letter-word"));
    this.signatureElement = this.element.querySelector(".love-letter-signature");
  }

  // Rises up and out of the envelope's opening — a small starting
  // rotation that corrects itself as it settles, rather than a plain
  // straight-line rise, is what keeps it from feeling mechanical. Once
  // settled, the message reveals one word at a time, in reading order —
  // never all at once, never a character-by-character typewriter. This
  // works unchanged for the letter's RTL Arabic text: wordElements are
  // built from LETTER_LINES in logical (reading) order regardless of
  // script, and the browser's own bidi algorithm — driven by the
  // dir="rtl" set on .love-letter-paper above — handles laying that
  // same DOM order out right-to-left on screen; nothing here needs to
  // know or care which direction that ends up being. The
  // signature fades in as its own distinct beat (not word-by-word) once
  // the last word has landed, and after a reading pause sized to the
  // message's own length, this fires "letter:return" — the cue
  // Envelope.js listens for to call returnToEnvelope() once it's ready.
  emerge() {
    this.audio.trigger("letter:emerge");

    const tl = gsap.timeline();
    this._timeline = tl;

    tl.set(this.element, {
      opacity: 0,
      y: LETTER_EMERGE_RISE_PX,
      scale: LETTER_EMERGE_START_SCALE,
      rotation: LETTER_EMERGE_START_ROTATION_DEG,
    });

    tl.to(this.element, {
      opacity: 1,
      y: -18,
      scale: 1.03,
      rotation: 0,
      duration: LETTER_EMERGE_DURATION,
      ease: "power2.out",
    });

    // A small settle past rest — the same "this has real weight, not
    // just a UI element" quality the envelope's own arrival has.
    tl.to(this.element, {
      y: 0,
      scale: 1,
      duration: LETTER_SETTLE_DURATION,
      ease: "power1.inOut",
    });

    tl.addLabel("textStart", `+=${LETTER_TEXT_START_DELAY}`);

    tl.call(() => this.audio.trigger("letter:revealStart"), null, "textStart");

    this.wordElements.forEach((word, index) => {
      tl.fromTo(
        word,
        { opacity: 0, y: LETTER_WORD_RISE_PX },
        { opacity: 1, y: 0, duration: LETTER_WORD_FADE_DURATION, ease: "power2.out" },
        index === 0 ? "textStart" : `textStart+=${index * LETTER_WORD_STAGGER}`,
      );
    });

    const lastWordStart = (this.wordElements.length - 1) * LETTER_WORD_STAGGER;
    const signatureStart = lastWordStart + LETTER_SIGNATURE_EXTRA_DELAY;

    tl.fromTo(
      this.signatureElement,
      { opacity: 0, y: LETTER_LINE_RISE_PX },
      { opacity: 1, y: 0, duration: LETTER_LINE_DURATION, ease: "power2.out" },
      `textStart+=${signatureStart}`,
    );

    tl.call(
      () => {
        this.audio.trigger("letter:revealComplete");
        this.audio.trigger("letter:readingStart");
      },
      null,
      `textStart+=${signatureStart + LETTER_LINE_DURATION}`,
    );

    // The reading pause itself — long enough for the actual message
    // length (see LETTER_READING_DELAY's own derivation), not a flat
    // guess. Nothing else needs to be scheduled off of this: whoever
    // holds this Letter instance (Envelope.js) reacts to the event
    // itself and calls returnToEnvelope() when ready.
    tl.call(() => this.audio.trigger("letter:return"), null, `+=${LETTER_READING_DELAY}`);

    return tl;
  }

  // The reverse of emerge(): a small physical "picking it up" lift,
  // then a longer glide toward targetElement's own current on-screen
  // position — computed fresh via getBoundingClientRect() right here,
  // never a hard-coded offset, so this lands correctly regardless of
  // viewport size or how the envelope itself has moved/scaled by this
  // point. Shrinking to a small fraction and fading out together is
  // what reads as "sliding inside" rather than just "disappearing" —
  // the glow fades with it since it's the same filter/drop-shadow on
  // this element, not a separately-tracked property.
  //
  // "letter:return" has already fired (see emerge()'s own timeline,
  // the cue that told the caller it was time to call this) — this
  // method doesn't re-trigger it, only performs the motion.
  returnToEnvelope(targetElement, onComplete) {
    if (this._returned) return this._returnTimeline;
    this._returned = true;

    const letterRect = this.element.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();

    const dx = targetRect.left + targetRect.width / 2 - (letterRect.left + letterRect.width / 2);
    const dy = targetRect.top + targetRect.height / 2 - (letterRect.top + letterRect.height / 2);

    const tl = gsap.timeline({
      onComplete: () => {
        this.element.remove();
        if (onComplete) onComplete();
      },
    });
    this._returnTimeline = tl;

    tl.to(this.element, {
      y: `-=${LETTER_RETURN_LIFT_PX}`,
      scale: 1.02,
      duration: LETTER_RETURN_LIFT_DURATION,
      ease: "power2.out",
    });

    tl.to(this.element, {
      x: dx,
      y: dy,
      scale: LETTER_RETURN_END_SCALE,
      rotation: LETTER_RETURN_ROTATION_DEG,
      opacity: 0,
      duration: LETTER_RETURN_DURATION,
      ease: "power2.inOut",
    });

    return tl;
  }

  destroy() {
    if (this._timeline) this._timeline.kill();
    if (this._returnTimeline) this._returnTimeline.kill();

    gsap.killTweensOf(this.element);
    gsap.killTweensOf(this.wordElements);
    gsap.killTweensOf(this.signatureElement);

    this.element.remove();
  }
}
