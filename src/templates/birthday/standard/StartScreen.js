import gsap from "gsap";

import "./StartScreen.css";

import {
  START_MARK,
  START_HEADING,
  START_SUBTITLE,
  START_LABEL,
  START_ATMOSPHERE_FADE_DURATION,
  START_MARK_DELAY,
  START_MARK_DURATION,
  START_HEADING_DELAY,
  START_HEADING_DURATION,
  START_HEADING_RISE_VH,
  START_SUBTITLE_DELAY,
  START_SUBTITLE_DURATION,
  START_SUBTITLE_RISE_VH,
  START_BUTTON_DELAY,
  START_BUTTON_DURATION,
  START_BUTTON_RISE_VH,
  START_BREATH_SCALE,
  START_BREATH_DURATION,
  START_HOVER_SCALE,
  START_PRESS_SCALE,
  START_PRESS_DURATION,
  START_PRESS_GLOW_SCALE,
  START_PRESS_GLOW_DURATION,
  START_EXIT_DURATION,
} from "./Constants";

// The lifecycle this file drives, in order — see each handler below
// for what happens at that stage. The same lightweight
// plain-string-constants approach envelope/Envelope.js's own
// SEQUENCE_STATE uses (this project doesn't need a state-machine
// library): _setHovering/_handlePress guard on it so hover/press only
// ever do anything during IDLE, which is also what makes this
// interrupt-safe (no double-press, no hover feedback fighting the exit
// dissolve).
const START_STATE = {
  INTRO: "intro", // constructed, entrance still playing
  IDLE: "idle", // settled and breathing — the only state that accepts input
  START_PRESSED: "start-pressed", // press feedback playing
  EXIT: "exit", // dissolving out, about to hand off
};

// Step 1's entire visual surface: the dark cinematic atmosphere, the
// small decorative mark, the heading/subtitle, and the START control —
// one composition entering together, not independent per-element
// animations. The same DOM+CSS+GSAP overlay technique every other
// template's own 2D UI already uses (see e.g. love/LoveIntro.js) — this
// owns its own entrance, idle breathing, hover/press feedback, and exit
// dissolve, and calls onComplete() exactly once, after its own exit
// finishes, the same contract LoveIntro's own onComplete already
// follows. It knows nothing about what comes after — StandardScene
// decides that.
export default class StartScreen {
  // `ambientAtmosphere` is the persistent night-sky background (see
  // StandardAmbientAtmosphere.js) — constructed once by StandardScene
  // BEFORE this, and outliving it. StartScreen no longer creates or owns
  // any atmosphere/particles of its own; it just drives that SAME
  // instance's own entrance fade-in and one-shot press bloom, the same
  // way it always visually has, so pressing START never makes the stars/
  // nebula disappear along with the rest of this screen.
  constructor(audio, onComplete, ambientAtmosphere) {
    this.audio = audio;
    this.onComplete = onComplete;
    this.ambientAtmosphere = ambientAtmosphere;

    this.state = START_STATE.INTRO;

    this.create();
    this.playEntrance();
    this.bindEvents();
  }

  create() {
    this.element = document.createElement("div");
    this.element.id = "standard-start";

    this.element.innerHTML = `
      <div class="standard-start-content">
        <span class="standard-start-mark" aria-hidden="true">${START_MARK}</span>
        <h1 class="standard-start-heading">${START_HEADING}</h1>
        <p class="standard-start-subtitle">${START_SUBTITLE}</p>
        <button class="standard-start-button" type="button" aria-label="${START_LABEL}">
          <span class="standard-start-button-glow" aria-hidden="true"></span>
          <span class="standard-start-label">${START_LABEL}</span>
        </button>
      </div>
    `;

    document.body.appendChild(this.element);

    this.atmosphere = this.ambientAtmosphere.element;
    this.mark = this.element.querySelector(".standard-start-mark");
    this.heading = this.element.querySelector(".standard-start-heading");
    this.subtitle = this.element.querySelector(".standard-start-subtitle");
    this.button = this.element.querySelector(".standard-start-button");
  }

  // One cascading composition arriving as a whole: the atmosphere
  // fades up first, then the small mark, then the heading, then the
  // subtitle, then the button — each beginning a little before the
  // last finishes rather than waiting in a strict queue, so it reads as
  // one continuous arrival instead of a checklist. Only once everything
  // has settled does the button start its own idle breathing and the
  // scene start accepting input.
  playEntrance() {
    const tl = gsap.timeline({
      onComplete: () => {
        this.state = START_STATE.IDLE;
        this._startBreathing();
      },
    });
    this._entranceTimeline = tl;

    tl.to(
      this.atmosphere,
      { opacity: 1, duration: START_ATMOSPHERE_FADE_DURATION, ease: "power2.out" },
      0,
    );

    tl.to(
      this.mark,
      { opacity: 1, duration: START_MARK_DURATION, ease: "power2.out" },
      START_MARK_DELAY,
    );

    tl.fromTo(
      this.heading,
      { opacity: 0, y: `${START_HEADING_RISE_VH}vh` },
      { opacity: 1, y: 0, duration: START_HEADING_DURATION, ease: "power3.out" },
      START_HEADING_DELAY,
    );

    tl.fromTo(
      this.subtitle,
      { opacity: 0, y: `${START_SUBTITLE_RISE_VH}vh` },
      { opacity: 1, y: 0, duration: START_SUBTITLE_DURATION, ease: "power3.out" },
      START_SUBTITLE_DELAY,
    );

    tl.fromTo(
      this.button,
      { opacity: 0, y: `${START_BUTTON_RISE_VH}vh`, scale: 0.92 },
      { opacity: 1, y: 0, scale: 1, duration: START_BUTTON_DURATION, ease: "power3.out" },
      START_BUTTON_DELAY,
    );
  }

  _startBreathing() {
    if (this.state !== START_STATE.IDLE) return;

    this._breathTween = gsap.to(this.button, {
      scale: START_BREATH_SCALE,
      duration: START_BREATH_DURATION,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
    });
  }

  bindEvents() {
    this._onPointerEnter = () => this._setHovering(true);
    this._onPointerLeave = () => this._setHovering(false);
    this._onClick = () => this._handlePress();

    // Hover is driven entirely through GSAP here (never a CSS :hover
    // transform — see StartScreen.css's own comment on why). `click`
    // (not a raw pointerdown/up pair) is what fires for mouse clicks,
    // touch taps, AND keyboard Enter/Space activation on a focused
    // button — the one binding every other interactive control in this
    // project already uses (envelope/Envelope.js's seal, love's own
    // Yes/No buttons), so mouse/touch/pointer all get identical
    // behavior for free rather than three separate code paths.
    this.button.addEventListener("pointerenter", this._onPointerEnter);
    this.button.addEventListener("pointerleave", this._onPointerLeave);
    this.button.addEventListener("click", this._onClick);
  }

  _setHovering(hovering) {
    if (this.state !== START_STATE.IDLE) return;

    if (hovering) {
      if (this._breathTween) this._breathTween.pause();
      gsap.to(this.button, {
        scale: START_HOVER_SCALE,
        boxShadow: "0 0 30px rgba(246, 182, 204, 0.5), 0 0 75px rgba(248, 201, 217, 0.25)",
        duration: 0.3,
        ease: "power2.out",
      });
    } else {
      gsap.to(this.button, {
        scale: 1,
        boxShadow: "0 0 20px rgba(246, 182, 204, 0.35), 0 0 55px rgba(248, 201, 217, 0.15)",
        duration: 0.3,
        ease: "power2.out",
        onComplete: () => {
          if (this._breathTween) this._breathTween.resume();
        },
      });
    }
  }

  // Press-squash-and-release (the same physical feedback shape
  // envelope/Envelope.js's own seal press uses) plus a brief bloom of
  // the atmosphere behind it, then the whole composition dissolves and
  // hands off. `state` flips to START_PRESSED synchronously as the very
  // first line, so a second click during the animation can never
  // re-enter this.
  _handlePress() {
    if (this.state !== START_STATE.IDLE) return;
    this.state = START_STATE.START_PRESSED;

    if (this._breathTween) this._breathTween.kill();
    gsap.killTweensOf(this.button);
    gsap.killTweensOf(this.atmosphere);

    this.audio.trigger("standard:start-press");

    const tl = gsap.timeline({
      onComplete: () => {
        this.state = START_STATE.EXIT;
      },
    });
    this._timeline = tl;

    // The button's own tactile response.
    tl.to(this.button, {
      scale: START_PRESS_SCALE,
      duration: START_PRESS_DURATION,
      ease: "power2.out",
    });
    tl.to(this.button, {
      scale: 1.05,
      boxShadow: "0 0 40px rgba(248, 201, 217, 0.65), 0 0 95px rgba(246, 182, 204, 0.35)",
      duration: START_PRESS_DURATION * 1.5,
      ease: "power2.out",
    });

    // The central glow blooms outward once, right alongside the
    // button's own flash — "intensify the button/central glow" from
    // the brief, as a single beat rather than a new continuous effect —
    // then eases back to its own resting scale. This atmosphere element
    // is the PERSISTENT one (see StandardAmbientAtmosphere.js), so
    // unlike before, it's never removed right after — it must return to
    // scale 1 itself, or the whole night sky would stay permanently
    // zoomed in for the rest of the experience.
    tl.to(
      this.atmosphere,
      { scale: START_PRESS_GLOW_SCALE, duration: START_PRESS_GLOW_DURATION, ease: "power2.out" },
      "<",
    );
    tl.to(this.atmosphere, { scale: 1, duration: START_PRESS_GLOW_DURATION * 1.4, ease: "power2.inOut" });

    // Then the rest of the composition (title/button — NOT the
    // persistent atmosphere) dissolves as one piece.
    tl.to(
      this.element,
      { opacity: 0, duration: START_EXIT_DURATION, ease: "power2.inOut" },
      "+=0.1",
    );

    tl.call(() => {
      this.audio.trigger("standard:start-complete");
      this.destroy();
      this.onComplete();
    });
  }

  // Safe to call more than once (StandardScene.destroy() also calls
  // this defensively on teardown) — everything here already tolerates
  // being re-run on an already-cleaned-up element/tweens. Does NOT touch
  // this.atmosphere at all — it's the persistent instance StandardScene
  // owns, not this file's own; StandardScene.destroy() is responsible
  // for it, at true teardown only.
  destroy() {
    if (this._entranceTimeline) this._entranceTimeline.kill();
    if (this._timeline) this._timeline.kill();
    if (this._breathTween) this._breathTween.kill();
    gsap.killTweensOf(this.button);

    this.button.removeEventListener("pointerenter", this._onPointerEnter);
    this.button.removeEventListener("pointerleave", this._onPointerLeave);
    this.button.removeEventListener("click", this._onClick);

    this.element.remove();
  }
}
