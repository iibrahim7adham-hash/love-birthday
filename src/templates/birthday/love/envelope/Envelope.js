import gsap from "gsap";

import "./Envelope.css";

import Letter from "./Letter";
import {
  ENVELOPE_ENTRANCE_DELAY,
  ENVELOPE_ENTRANCE_RISE_VH,
  ENVELOPE_ENTRANCE_START_SCALE,
  ENVELOPE_ENTRANCE_DURATION,
  ENVELOPE_SETTLE_DURATION,
  ENVELOPE_SETTLE_OVERSHOOT_PX,
  ENVELOPE_SWAY_AMOUNT_PX,
  ENVELOPE_SWAY_DURATION,
  ENVELOPE_SPARKLE_COUNT,
  ENVELOPE_SPARKLE_DURATION,
  SEAL_BREATH_SCALE,
  SEAL_BREATH_DURATION,
  SEAL_HOVER_SCALE,
  SEAL_PRESS_SCALE,
  SEAL_PRESS_DURATION,
  SEAL_CRACK_DELAY,
  SEAL_CRACK_DURATION,
  ENVELOPE_SHAKE_DELAY,
  ENVELOPE_SHAKE_DURATION,
  FLAP_OPEN_DELAY,
  FLAP_OPEN_DURATION,
  GLOW_REVEAL_DELAY,
  GLOW_REVEAL_DURATION,
  ENVELOPE_RECEDE_DELAY,
  ENVELOPE_RECEDE_DURATION,
  ENVELOPE_RECEDE_SCALE,
  ENVELOPE_RECEDE_OPACITY,
  LETTER_FOCUS_DELAY,
  ENVELOPE_CLOSE_RESTORE_DURATION,
  FLAP_CLOSE_DELAY,
  FLAP_CLOSE_DURATION,
  WARM_LIGHT_CLOSE_DURATION,
  SEAL_REFORM_DURATION,
  ENVELOPE_EXIT_PAUSE,
  ENVELOPE_EXIT_DURATION,
  ENVELOPE_EXIT_END_SCALE,
} from "./EnvelopeConstants";
import { LETTER_EMERGE_DELAY } from "./LetterConstants";

// The full lifecycle this file drives, in order — see each handler
// below for what happens at that stage. Kept as plain string constants
// (not a separate state-machine class/library — this project doesn't
// need one) so _handleOpen/_handleLetterReturn/_handleEnvelopeClose/
// _handleEnvelopeExit can each guard against running twice or running
// out of order, AND so the seal button's own interactivity has a
// single source of truth: it only ever accepts input while
// this.state === READY (see _handleOpen's guard and the
// this.seal.disabled toggles around _playEntrance/_handleOpen below) —
// INACTIVE and APPEARING exist specifically so "the envelope hasn't
// finished arriving yet" is a real, distinct, provably-non-interactive
// state rather than something only expressed through the button's own
// opacity.
const SEQUENCE_STATE = {
  INACTIVE: "inactive", // constructed, but the entrance delay hasn't fired yet
  APPEARING: "appearing", // entrance animation is actively playing
  READY: "ready", // settled and idle — the only state that accepts a click
  LETTER_OPENING: "letter-opening",
  LETTER_REVEALING: "letter-revealing",
  LETTER_READING: "letter-reading",
  LETTER_RETURNING: "letter-returning",
  ENVELOPE_CLOSING: "envelope-closing",
  ENVELOPE_EXITING: "envelope-exiting",
  COMPLETE: "complete",
};

// The final stage after the heart + orbiting stickers: a self-contained
// envelope that rises into the foreground, whose wax seal is the
// interaction point, and which — once pressed — opens into the letter
// (see Letter.js, a completely separate file/concern; this only
// constructs one and calls emerge() on it at the right moment). Once
// the letter has been read, it returns here and this closes and exits
// on its own, handing focus back to the heart.
//
// Never touches the heart, the ring, the stickers' own materials, or
// any other existing system directly — its only outward effect on
// anything else is the semantic "letter:focus" event it fires once the
// letter has taken over as the scene's focus, which
// stickers/PhotoStickerOrbit.js listens for on its own to dim/slow
// itself. Everything here is DOM + CSS + GSAP, the same technique
// LoveIntro's own 2D UI already uses, layered over the same canvas.
export default class Envelope {
  constructor(audio) {
    this.audio = audio;
    this.state = SEQUENCE_STATE.INACTIVE;
    this.letter = null;

    this.element = document.createElement("div");
    this.element.className = "love-envelope";

    this.element.innerHTML = `
      <div class="love-envelope-body">
        <div class="love-envelope-pocket">
          <div class="love-envelope-warm-light"></div>
        </div>
        <div class="love-envelope-flap"></div>
        <button class="love-envelope-seal" type="button" aria-label="Open your letter">
          <span class="love-envelope-seal-half love-envelope-seal-half--top"></span>
          <span class="love-envelope-seal-half love-envelope-seal-half--bottom"></span>
          <span class="love-envelope-seal-heart">♥</span>
        </button>
      </div>
    `;

    document.body.appendChild(this.element);

    this.body = this.element.querySelector(".love-envelope-body");
    this.pocket = this.element.querySelector(".love-envelope-pocket");
    this.warmLight = this.element.querySelector(".love-envelope-warm-light");
    this.flap = this.element.querySelector(".love-envelope-flap");
    this.seal = this.element.querySelector(".love-envelope-seal");
    this.sealHalfTop = this.element.querySelector(".love-envelope-seal-half--top");
    this.sealHalfBottom = this.element.querySelector(".love-envelope-seal-half--bottom");
    this.sealHeart = this.element.querySelector(".love-envelope-seal-heart");

    // The actual interaction/hit-testing gate, not a visual one: a
    // disabled native <button> receives no pointer events at all
    // (click, hover, focus) regardless of its own or its ancestors'
    // opacity — so during INACTIVE/APPEARING there is no invisible
    // clickable button sitting under the scene, and this holds even if
    // the CSS entrance/opacity tuning ever changes independently. Only
    // re-enabled once _playEntrance()'s own settle completes (state
    // becomes READY), and disabled again the moment _handleOpen() runs
    // — see both below.
    this.seal.disabled = true;

    this._bindSealEvents();

    // The two cues the letter fires on its own timeline (see
    // Letter.js's emerge()) that this side needs to react to: reading
    // has begun (state only, no animation), and reading is over so the
    // letter is ready to be sent back. This is the entire coupling
    // between the two files in this direction — the same one-way
    // pattern "letter:focus" already uses for PhotoStickerOrbit.
    this._unsubscribeReadingStart = this.audio.on("letter:readingStart", () =>
      this._handleReadingStart(),
    );
    this._unsubscribeLetterReturn = this.audio.on("letter:return", () =>
      this._handleLetterReturn(),
    );

    this._entranceCall = gsap.delayedCall(ENVELOPE_ENTRANCE_DELAY, () => this._playEntrance());
  }

  _bindSealEvents() {
    this._onPointerEnter = () => this._setHovering(true);
    this._onPointerLeave = () => this._setHovering(false);
    this._onClick = () => this._handleOpen();

    // Hover is driven entirely through GSAP here (never a CSS :hover
    // transform) — GSAP writes `transform` as an inline style, which
    // would silently win over any CSS class rule targeting the same
    // property, so mixing the two would make one of them do nothing.
    this.seal.addEventListener("pointerenter", this._onPointerEnter);
    this.seal.addEventListener("pointerleave", this._onPointerLeave);
    this.seal.addEventListener("click", this._onClick);
  }

  _playEntrance() {
    this.state = SEQUENCE_STATE.APPEARING;

    this.audio.trigger("envelope:appear");

    const tl = gsap.timeline();
    this._entranceTimeline = tl;

    tl.set(this.body, {
      opacity: 0,
      scale: ENVELOPE_ENTRANCE_START_SCALE,
      y: `${ENVELOPE_ENTRANCE_RISE_VH}vh`,
    });

    tl.to(this.body, {
      opacity: 1,
      scale: 1.04,
      y: 0,
      duration: ENVELOPE_ENTRANCE_DURATION,
      ease: "power2.out",
    });

    // A small settle past rest — "real physical weight", not a UI
    // element that simply stops moving.
    tl.to(this.body, {
      scale: 1,
      duration: ENVELOPE_SETTLE_DURATION,
      ease: "power1.inOut",
    });
    tl.fromTo(
      this.body,
      { y: 0 },
      { y: ENVELOPE_SETTLE_OVERSHOOT_PX, duration: ENVELOPE_SETTLE_DURATION / 2, ease: "power1.out", yoyo: true, repeat: 1 },
      "<",
    );

    tl.call(() => {
      this._spawnSparkles();
      this._startIdleSway();
      this._startSealBreathing();

      // The exact point the envelope "becomes available to the viewer"
      // (settle animation finished) — this is the only place the seal
      // is ever re-enabled after construction.
      this.state = SEQUENCE_STATE.READY;
      this.seal.disabled = false;
    });
  }

  // A handful of tiny sparkles that fade in, drift outward, fade out,
  // and are removed for good — a brief accent, not an ongoing effect.
  // Reused as-is for the envelope's own exit (see _handleEnvelopeExit)
  // as its "light motes dissolve" beat, rather than building a second
  // sparkle system for that.
  _spawnSparkles() {
    for (let i = 0; i < ENVELOPE_SPARKLE_COUNT; i++) {
      const sparkle = document.createElement("span");
      sparkle.className = "love-envelope-sparkle";

      const angle = (i / ENVELOPE_SPARKLE_COUNT) * Math.PI * 2 + Math.random() * 0.6;
      // Same proportion of the envelope's own width as before scaling
      // it down (radius was tuned at ~24-33% of a ~230px-wide envelope;
      // the envelope is now smaller, so this follows it down).
      const radius = 34 + Math.random() * 12;

      sparkle.style.left = `calc(50% + ${Math.cos(angle) * radius}px)`;
      sparkle.style.top = `calc(35% + ${Math.sin(angle) * radius}px)`;

      this.body.appendChild(sparkle);

      gsap.fromTo(
        sparkle,
        { opacity: 0, scale: 0.4 },
        {
          opacity: 1,
          scale: 1,
          duration: ENVELOPE_SPARKLE_DURATION * 0.4,
          ease: "power1.out",
          delay: i * 0.12,
          onComplete: () => {
            gsap.to(sparkle, {
              opacity: 0,
              y: -14,
              duration: ENVELOPE_SPARKLE_DURATION * 0.6,
              ease: "power1.in",
              onComplete: () => sparkle.remove(),
            });
          },
        },
      );
    }
  }

  _startIdleSway() {
    this._swayTween = gsap.to(this.body, {
      y: ENVELOPE_SWAY_AMOUNT_PX,
      rotation: 0.6,
      duration: ENVELOPE_SWAY_DURATION,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
    });
  }

  _startSealBreathing() {
    this._breathTween = gsap.to(this.seal, {
      scale: SEAL_BREATH_SCALE,
      duration: SEAL_BREATH_DURATION,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
    });
  }

  // A single breath cycle (not a loop) — the closing sequence's own
  // "seal briefly glows/pulses" beat, distinct from the continuous
  // idle breathing above which never restarts once the envelope is
  // opened.
  _pulseSealOnce() {
    gsap.to(this.seal, {
      scale: SEAL_BREATH_SCALE,
      duration: SEAL_BREATH_DURATION / 2,
      ease: "sine.inOut",
      yoyo: true,
      repeat: 1,
    });
  }

  _setHovering(hovering) {
    if (this.state !== SEQUENCE_STATE.READY) return;

    if (hovering) {
      if (this._breathTween) this._breathTween.pause();
      gsap.to(this.seal, { scale: SEAL_HOVER_SCALE, duration: 0.25, ease: "power2.out" });
    } else {
      gsap.to(this.seal, {
        scale: 1,
        duration: 0.25,
        ease: "power2.out",
        onComplete: () => {
          if (this._breathTween) this._breathTween.resume();
        },
      });
    }
  }

  // The full cinematic open — press, crack, shake, the flap opening,
  // warm light, the letter emerging (owned entirely by Letter.js from
  // that point on), the envelope receding to cede focus, and finally
  // the "letter:focus" event the sticker orbit reacts to on its own.
  _handleOpen() {
    if (this.state !== SEQUENCE_STATE.READY) return;
    this.state = SEQUENCE_STATE.LETTER_OPENING;

    // Interaction is over for the rest of this envelope's life — it
    // never becomes clickable again (reforming/pulsing while closing is
    // a visual echo only, not a second invitation to click), so this is
    // the only other place this.seal.disabled is ever touched.
    this.seal.disabled = true;

    if (this._breathTween) this._breathTween.kill();
    gsap.killTweensOf(this.seal);

    const tl = gsap.timeline();
    this._openTimeline = tl;

    // A. Press.
    tl.to(this.seal, { scale: SEAL_PRESS_SCALE, duration: SEAL_PRESS_DURATION, ease: "power2.out" }, 0);

    // B. Sound, right at the press.
    tl.call(() => this.audio.trigger("envelope:seal-crack"), null, SEAL_CRACK_DELAY);

    // C. The seal cracks in two and falls away.
    tl.to(
      this.sealHalfTop,
      { y: -14, rotation: -18, opacity: 0, duration: SEAL_CRACK_DURATION, ease: "power2.in" },
      SEAL_CRACK_DELAY,
    );
    tl.to(
      this.sealHalfBottom,
      { y: 14, rotation: 18, opacity: 0, duration: SEAL_CRACK_DURATION, ease: "power2.in" },
      SEAL_CRACK_DELAY,
    );
    tl.to(
      this.sealHeart,
      { opacity: 0, duration: SEAL_CRACK_DURATION * 0.6, ease: "power1.in" },
      SEAL_CRACK_DELAY,
    );

    // D. A tiny physical shake.
    const shakeStep = ENVELOPE_SHAKE_DURATION / 4;
    tl.to(this.body, { x: -5, duration: shakeStep, ease: "power1.inOut" }, ENVELOPE_SHAKE_DELAY);
    tl.to(this.body, { x: 5, duration: shakeStep, ease: "power1.inOut" }, ENVELOPE_SHAKE_DELAY + shakeStep);
    tl.to(this.body, { x: -3, duration: shakeStep, ease: "power1.inOut" }, ENVELOPE_SHAKE_DELAY + shakeStep * 2);
    tl.to(this.body, { x: 0, duration: shakeStep, ease: "power1.inOut" }, ENVELOPE_SHAKE_DELAY + shakeStep * 3);

    // E. The flap opens.
    tl.to(
      this.flap,
      { rotationX: -165, duration: FLAP_OPEN_DURATION, ease: "power2.inOut" },
      FLAP_OPEN_DELAY,
    );
    tl.call(() => this.audio.trigger("envelope:open"), null, FLAP_OPEN_DELAY);

    // F. Warm light spills out.
    tl.to(
      this.warmLight,
      { opacity: 1, duration: GLOW_REVEAL_DURATION, ease: "power2.out" },
      GLOW_REVEAL_DELAY,
    );

    // G-H. The letter emerges — entirely Letter.js's own animation from
    // here, including its own word-by-word reveal and reading pause;
    // this only decides *when* to start it and reacts later (via the
    // "letter:readingStart"/"letter:return" subscriptions set up in the
    // constructor) once the letter is ready to come back.
    tl.call(
      () => {
        this.letter = new Letter(this.audio);
        this.letter.emerge();
        this.state = SEQUENCE_STATE.LETTER_REVEALING;
      },
      null,
      LETTER_EMERGE_DELAY,
    );

    // I. The envelope recedes so the letter reads as the new focus.
    tl.to(
      this.body,
      {
        scale: ENVELOPE_RECEDE_SCALE,
        opacity: ENVELOPE_RECEDE_OPACITY,
        duration: ENVELOPE_RECEDE_DURATION,
        ease: "power2.inOut",
      },
      ENVELOPE_RECEDE_DELAY,
    );

    // J. The rest of the scene softens to let the letter dominate — see
    // stickers/PhotoStickerOrbit.js's own subscription to this event.
    tl.call(() => this.audio.trigger("letter:focus"), null, LETTER_FOCUS_DELAY);
  }

  _handleReadingStart() {
    if (this.state !== SEQUENCE_STATE.LETTER_REVEALING) return;
    this.state = SEQUENCE_STATE.LETTER_READING;
  }

  // The letter has finished its reading pause and is ready to come
  // back — hand it the pocket (the envelope's own opening) as the
  // target to glide toward; Letter.js measures that element's live
  // on-screen position itself, so this stays correct at any viewport
  // size without either file hard-coding the other's layout.
  _handleLetterReturn() {
    if (this.state !== SEQUENCE_STATE.LETTER_READING || !this.letter) return;
    this.state = SEQUENCE_STATE.LETTER_RETURNING;

    this.letter.returnToEnvelope(this.pocket, () => this._handleEnvelopeClose());
  }

  // Once the letter has physically slid back inside: the body recovers
  // from its receded open-state size/opacity, the flap swings shut,
  // the warm light fades, and the seal reforms with one brief pulse —
  // "the end of a chapter", then hands off to _handleEnvelopeExit.
  _handleEnvelopeClose() {
    if (this.state !== SEQUENCE_STATE.LETTER_RETURNING) return;
    this.state = SEQUENCE_STATE.ENVELOPE_CLOSING;

    const tl = gsap.timeline({ onComplete: () => this._handleEnvelopeExit() });
    this._closeTimeline = tl;

    tl.call(() => this.audio.trigger("envelope:close"), null, 0);

    tl.to(
      this.body,
      { scale: 1, opacity: 1, duration: ENVELOPE_CLOSE_RESTORE_DURATION, ease: "power2.out" },
      0,
    );

    tl.to(
      this.flap,
      { rotationX: 0, duration: FLAP_CLOSE_DURATION, ease: "power2.inOut" },
      FLAP_CLOSE_DELAY,
    );

    tl.to(
      this.warmLight,
      { opacity: 0, duration: WARM_LIGHT_CLOSE_DURATION, ease: "power2.in" },
      FLAP_CLOSE_DELAY,
    );

    // The seal's two halves/heart were flung apart when it cracked
    // open (see _handleOpen's step C) — reset their position/rotation
    // while still invisible, then fade the whole thing back in, so it
    // reads as the seal reforming rather than the old fragments
    // visibly flying back into place.
    const sealReformStart = FLAP_CLOSE_DELAY + FLAP_CLOSE_DURATION;
    tl.set([this.sealHalfTop, this.sealHalfBottom], { y: 0, rotation: 0 }, sealReformStart);
    tl.to(
      [this.sealHalfTop, this.sealHalfBottom, this.sealHeart],
      { opacity: 1, duration: SEAL_REFORM_DURATION, ease: "power2.out" },
      sealReformStart,
    );
    tl.call(() => this._pulseSealOnce(), null, `+=0.1`);
  }

  // The envelope's own short cinematic exit: a brief pause, a soft
  // bloom of the same warm light used throughout (not a new light
  // source), the existing sparkle accent reused as dissolving light
  // motes, then a gentle downward drift + shrink + fade — never a
  // snap-to-zero, spin, or fly-away.
  _handleEnvelopeExit() {
    if (this.state !== SEQUENCE_STATE.ENVELOPE_CLOSING) return;
    this.state = SEQUENCE_STATE.ENVELOPE_EXITING;

    const tl = gsap.timeline({
      onComplete: () => {
        this.audio.trigger("envelope:complete");
        this.state = SEQUENCE_STATE.COMPLETE;
        this.element.remove();
      },
    });
    this._exitTimeline = tl;

    tl.call(() => this._spawnSparkles(), null, ENVELOPE_EXIT_PAUSE);

    tl.to(this.warmLight, { opacity: 0.35, duration: 0.4, ease: "power1.out" }, ENVELOPE_EXIT_PAUSE);
    tl.to(
      this.warmLight,
      { opacity: 0, duration: ENVELOPE_EXIT_DURATION * 0.6, ease: "power1.in" },
      `+=0.1`,
    );

    tl.to(
      this.body,
      {
        y: "+=36",
        scale: ENVELOPE_EXIT_END_SCALE,
        opacity: 0,
        duration: ENVELOPE_EXIT_DURATION,
        ease: "power2.inOut",
      },
      ENVELOPE_EXIT_PAUSE + 0.15,
    );
  }

  destroy() {
    if (this._unsubscribeReadingStart) this._unsubscribeReadingStart();
    if (this._unsubscribeLetterReturn) this._unsubscribeLetterReturn();

    if (this._entranceCall) this._entranceCall.kill();
    if (this._entranceTimeline) this._entranceTimeline.kill();
    if (this._openTimeline) this._openTimeline.kill();
    if (this._closeTimeline) this._closeTimeline.kill();
    if (this._exitTimeline) this._exitTimeline.kill();
    if (this._swayTween) this._swayTween.kill();
    if (this._breathTween) this._breathTween.kill();

    gsap.killTweensOf(this.body);
    gsap.killTweensOf(this.seal);
    gsap.killTweensOf(this.sealHalfTop);
    gsap.killTweensOf(this.sealHalfBottom);
    gsap.killTweensOf(this.sealHeart);
    gsap.killTweensOf(this.warmLight);

    this.body.querySelectorAll(".love-envelope-sparkle").forEach((sparkle) => {
      gsap.killTweensOf(sparkle);
      sparkle.remove();
    });

    this.seal.removeEventListener("pointerenter", this._onPointerEnter);
    this.seal.removeEventListener("pointerleave", this._onPointerLeave);
    this.seal.removeEventListener("click", this._onClick);

    if (this.letter) this.letter.destroy();

    this.element.remove();
  }
}
