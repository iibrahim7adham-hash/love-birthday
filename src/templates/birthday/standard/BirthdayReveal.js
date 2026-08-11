import gsap from "gsap";

import "./BirthdayReveal.css";

import {
  REVEAL_MAIN_TEXT,
  REVEAL_SUB_TEXT,
  REVEAL_PARTICLE_COUNT,
  REVEAL_MOBILE_BREAKPOINT,
  REVEAL_PARTICLE_MIN_RADIUS_VW,
  REVEAL_PARTICLE_MAX_RADIUS_VW,
  REVEAL_PARTICLE_MIN_SIZE,
  REVEAL_PARTICLE_MAX_SIZE,
  REVEAL_PARTICLE_COLORS,
  REVEAL_ENTER_DELAY,
  REVEAL_PARTICLE_GATHER_DURATION,
  REVEAL_PARTICLE_GATHER_STAGGER,
  REVEAL_TEXT_START_OFFSET,
  REVEAL_LETTER_DURATION,
  REVEAL_LETTER_STAGGER_MAIN,
  REVEAL_LETTER_RISE_PX,
  REVEAL_SUB_DELAY_AFTER_MAIN,
  REVEAL_LETTER_DURATION_SUB,
  REVEAL_LETTER_STAGGER_SUB,
  REVEAL_TRACER_SIZE,
  REVEAL_TRACER_ECHO_SIZE,
  REVEAL_TRACER_ECHO_DELAY_FRACTION,
  REVEAL_TRACER_PEAK_OPACITY,
  REVEAL_TRACER_ECHO_PEAK_OPACITY,
  REVEAL_PULSE_DELAY,
  REVEAL_PULSE_SCALE,
  REVEAL_PULSE_DURATION,
  REVEAL_PARTICLE_FADE_DURATION,
} from "./BirthdayRevealConstants";

// The lifecycle this file drives, in order — same lightweight
// plain-string-constants approach every other Standard stage already
// uses (StartScreen.js's START_STATE, BirthdayMessage.js's own
// BIRTHDAY_MESSAGE_STATE).
const REVEAL_STATE = {
  ENTER: "birthday-reveal-enter",
  PARTICLES_GATHER: "birthday-reveal-particles-gather",
  WRITE_MAIN: "birthday-reveal-write-main",
  WRITE_SUB: "birthday-reveal-write-sub",
  PULSE: "birthday-reveal-pulse",
  HOLD: "birthday-reveal-hold",
};

// The cinematic "Birthday Reveal" moment: once the cake has fully formed
// and CakeCamera's own pullback has settled (this is constructed from
// StandardScene's own _enterCelebrationStage() — the exact same seam
// StandardFireworks is built from, which only ever fires once CakeReveal's
// master timeline has completely finished, pullback included), a brief
// calm pause, a small cluster of particles gathering above the cake, then
// "Happy Birthday" writes itself letter by letter with a small glowing
// tracer sweeping across it, a short pause, "to You" writes itself the
// same way (faster/softer), and a single extremely subtle glow pulse
// settles the finished greeting — which then simply stays, the same
// "fire and forget, holds forever" contract StandardFireworks/
// CakeAtmosphere already use, rather than dispersing itself the way the
// EARLIER, separate BirthdayMessage stage does.
//
// Pure DOM+CSS+GSAP, the same overlay pattern BirthdayMessage.js/
// Countdown.js/StartScreen.js already use — not a Three.js/scene
// addition. This stage sits ABOVE an already-fully-formed, already-
// settled cake (unlike BirthdayMessage, which plays before the cake
// exists at all), so it deliberately does NOT reuse CakeAtmosphere's own
// camera-relative 3D projection helpers — a plain top-anchored DOM
// overlay is simpler, matches this template's own established
// convention for 2D text content, and never needs to re-derive a
// world-space position after the camera has already finished moving.
export default class BirthdayReveal {
  constructor(audio) {
    this.audio = audio;

    this.state = REVEAL_STATE.ENTER;

    this.create();
    this.playSequence();
  }

  create() {
    this.element = document.createElement("div");
    this.element.id = "standard-birthday-reveal";

    this.element.innerHTML = `
      <div class="standard-reveal-particles" aria-hidden="true"></div>
      <div class="standard-reveal-text">
        <p class="standard-reveal-main" aria-live="polite"></p>
        <p class="standard-reveal-sub"></p>
        <span class="standard-reveal-tracer"></span>
        <span class="standard-reveal-tracer"></span>
      </div>
    `;

    document.body.appendChild(this.element);

    this.particleField = this.element.querySelector(".standard-reveal-particles");
    this.textWrapper = this.element.querySelector(".standard-reveal-text");
    this.mainLine = this.element.querySelector(".standard-reveal-main");
    this.subLine = this.element.querySelector(".standard-reveal-sub");

    const tracers = this.element.querySelectorAll(".standard-reveal-tracer");
    this.tracer = tracers[0];
    this.tracerEcho = tracers[1];
    this.tracer.style.width = `${REVEAL_TRACER_SIZE}px`;
    this.tracer.style.height = `${REVEAL_TRACER_SIZE}px`;
    this.tracerEcho.style.width = `${REVEAL_TRACER_ECHO_SIZE}px`;
    this.tracerEcho.style.height = `${REVEAL_TRACER_ECHO_SIZE}px`;

    this.mainLetters = this._buildLetters(this.mainLine, REVEAL_MAIN_TEXT);
    this.subLetters = this._buildLetters(this.subLine, REVEAL_SUB_TEXT);

    this.particles = this._buildParticles();
  }

  // Splits `text` into per-letter spans (each starting invisible/risen —
  // see .standard-reveal-letter's own CSS), leaving plain spaces between
  // words as ordinary text nodes rather than spans, so normal inline
  // flow still wraps at word boundaries if a line ever needs to (never
  // mid-word) — returns the array of letter spans for the caller's own
  // GSAP `stagger` tween.
  _buildLetters(lineEl, text) {
    const letters = [];

    text.split(" ").forEach((word, wordIndex) => {
      if (wordIndex > 0) lineEl.appendChild(document.createTextNode(" "));

      word.split("").forEach((char) => {
        const span = document.createElement("span");
        span.className = "standard-reveal-letter";
        span.textContent = char;
        gsap.set(span, { y: REVEAL_LETTER_RISE_PX, scale: 0.9 });
        lineEl.appendChild(span);
        letters.push(span);
      });
    });

    return letters;
  }

  // A handful of small glow dots gathering above the cake right before
  // the lettering begins — the same centered-via-top/left/margin +
  // GSAP x/y drift technique BirthdayMessage.js's own _buildParticles()
  // already establishes, just scattered around THIS stage's own text
  // position (the particle field shares the full-viewport container, but
  // every particle's "home" offset is small enough that they visually
  // read as gathering right around where the text is about to appear,
  // near the top of the frame — see BirthdayReveal.css's own
  // padding-top). Count halved on narrow viewports.
  _buildParticles() {
    const count =
      window.innerWidth < REVEAL_MOBILE_BREAKPOINT ? Math.round(REVEAL_PARTICLE_COUNT / 2) : REVEAL_PARTICLE_COUNT;

    const particles = [];

    for (let i = 0; i < count; i++) {
      const dot = document.createElement("span");
      dot.className = "standard-reveal-particle";

      const size = gsap.utils.random(REVEAL_PARTICLE_MIN_SIZE, REVEAL_PARTICLE_MAX_SIZE);
      const color = REVEAL_PARTICLE_COLORS[i % REVEAL_PARTICLE_COLORS.length];

      dot.style.top = "12vh";
      dot.style.left = "50%";
      dot.style.width = `${size}px`;
      dot.style.height = `${size}px`;
      dot.style.marginTop = `${-size / 2}px`;
      dot.style.marginLeft = `${-size / 2}px`;
      dot.style.background = color;
      dot.style.boxShadow = `0 0 ${size * 2.5}px ${color}`;

      this.particleField.appendChild(dot);

      const angle = Math.random() * Math.PI * 2;
      const radiusVw = gsap.utils.random(REVEAL_PARTICLE_MIN_RADIUS_VW, REVEAL_PARTICLE_MAX_RADIUS_VW);
      const homeX = Math.cos(angle) * radiusVw;
      const homeY = Math.sin(angle) * radiusVw * 0.5; // flatter vertical spread — this cluster sits in a shorter band than BirthdayMessage's own full-screen-centered one

      gsap.set(dot, { x: `${homeX}vw`, y: `${homeY}vw`, scale: 0, opacity: 0 });

      particles.push({ element: dot, homeX, homeY });
    }

    return particles;
  }

  // One master timeline for the entire moment: calm pause, particles
  // gathering, "Happy Birthday" writing itself with a tracer sweep, a
  // short pause, "to You" writing itself the same way (faster/softer),
  // one subtle glow pulse, then the gather particles quietly fade —
  // everything after that (the finished greeting itself) simply holds,
  // no exit/disperse beat, since this stage is meant to remain visible
  // for the rest of the scene.
  playSequence() {
    const tl = gsap.timeline();
    this._timeline = tl;

    let cursor = REVEAL_ENTER_DELAY;

    tl.call(
      () => {
        this.state = REVEAL_STATE.PARTICLES_GATHER;
        this.audio.trigger("birthday-reveal:appear");
      },
      null,
      cursor,
    );

    this.particles.forEach((particle) => {
      const startAt = cursor + gsap.utils.random(0, REVEAL_PARTICLE_GATHER_STAGGER);

      tl.to(
        particle.element,
        {
          x: `${particle.homeX}vw`,
          y: `${particle.homeY}vw`,
          scale: 1,
          opacity: 0.8,
          duration: REVEAL_PARTICLE_GATHER_DURATION,
          ease: "power2.out",
        },
        startAt,
      );
    });

    // ---- "Happy Birthday" writes itself letter by letter via a single
    // GSAP `stagger` tween across the whole letters array, with a small
    // glowing tracer sweeping across the line in sync (see
    // _sweepTracer()) so it reads as being magically written rather than
    // just fading in.
    const mainStart = cursor + REVEAL_TEXT_START_OFFSET;
    const mainSweepDuration = REVEAL_LETTER_DURATION + REVEAL_LETTER_STAGGER_MAIN * (this.mainLetters.length - 1);

    tl.call(() => {
      this.state = REVEAL_STATE.WRITE_MAIN;
    }, null, mainStart);

    tl.to(
      this.mainLetters,
      { opacity: 1, y: 0, scale: 1, duration: REVEAL_LETTER_DURATION, ease: "power2.out", stagger: REVEAL_LETTER_STAGGER_MAIN },
      mainStart,
    );
    this._sweepTracer(tl, this.mainLine, mainStart, mainSweepDuration + REVEAL_LETTER_DURATION * 0.5);

    // ---- A short pause, then "to You" — same technique, faster/softer.
    const subStart = mainStart + mainSweepDuration + REVEAL_LETTER_DURATION + REVEAL_SUB_DELAY_AFTER_MAIN;
    const subSweepDuration = REVEAL_LETTER_DURATION_SUB + REVEAL_LETTER_STAGGER_SUB * (this.subLetters.length - 1);

    tl.call(() => {
      this.state = REVEAL_STATE.WRITE_SUB;
    }, null, subStart);

    tl.to(
      this.subLetters,
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: REVEAL_LETTER_DURATION_SUB,
        ease: "power2.out",
        stagger: REVEAL_LETTER_STAGGER_SUB,
      },
      subStart,
    );
    this._sweepTracer(tl, this.subLine, subStart, subSweepDuration + REVEAL_LETTER_DURATION_SUB * 0.5);

    // ---- One extremely subtle glow pulse once both lines have settled,
    // then the gather particles quietly fade — they were only ever meant
    // to accompany the writing moment, not linger alongside the finished
    // greeting.
    const pulseStart = subStart + subSweepDuration + REVEAL_LETTER_DURATION_SUB + REVEAL_PULSE_DELAY;

    tl.call(() => {
      this.state = REVEAL_STATE.PULSE;
    }, null, pulseStart);

    tl.to(
      this.textWrapper,
      { scale: REVEAL_PULSE_SCALE, duration: REVEAL_PULSE_DURATION / 2, ease: "sine.inOut", yoyo: true, repeat: 1 },
      pulseStart,
    );

    this.particles.forEach((particle) => {
      tl.to(particle.element, { opacity: 0, duration: REVEAL_PARTICLE_FADE_DURATION, ease: "power1.in" }, pulseStart);
    });

    const holdStart = pulseStart + REVEAL_PULSE_DURATION;

    tl.call(
      () => {
        this.state = REVEAL_STATE.HOLD;
        this.audio.trigger("birthday-reveal:complete");
      },
      null,
      holdStart,
    );
  }

  // Measures `lineEl`'s own rendered position relative to the shared
  // .standard-reveal-text wrapper (both tracers are positioned absolute
  // within it), then sweeps the tracer + a dimmer, slightly-delayed echo
  // from the line's own left edge to its right edge, fading in and back
  // out — a small glowing point "writing" the line, plus a very short
  // fading trail behind it, never a permanent line.
  _sweepTracer(tl, lineEl, startAt, duration) {
    const wrapperRect = this.textWrapper.getBoundingClientRect();
    const lineRect = lineEl.getBoundingClientRect();
    const left = lineRect.left - wrapperRect.left;
    const top = lineRect.top - wrapperRect.top + lineRect.height / 2;
    const right = left + lineRect.width;

    const echoDelay = duration * REVEAL_TRACER_ECHO_DELAY_FRACTION;

    gsap.set(this.tracer, { x: left, y: top, opacity: 0 });
    gsap.set(this.tracerEcho, { x: left, y: top, opacity: 0 });

    tl.to(this.tracer, { x: right, duration, ease: "none" }, startAt);
    tl.to(this.tracer, { opacity: REVEAL_TRACER_PEAK_OPACITY, duration: duration * 0.15, ease: "power1.out" }, startAt);
    tl.to(this.tracer, { opacity: 0, duration: duration * 0.3, ease: "power1.in" }, startAt + duration * 0.7);

    tl.to(this.tracerEcho, { x: right, duration: duration - echoDelay, ease: "none" }, startAt + echoDelay);
    tl.to(
      this.tracerEcho,
      { opacity: REVEAL_TRACER_ECHO_PEAK_OPACITY, duration: duration * 0.15, ease: "power1.out" },
      startAt + echoDelay,
    );
    tl.to(this.tracerEcho, { opacity: 0, duration: duration * 0.3, ease: "power1.in" }, startAt + duration * 0.7);
  }

  // Safe to call more than once, the same contract every other Standard
  // stage's own destroy() follows — kills the master timeline first (so
  // no further tl.call can fire), then every loose tween, then removes
  // the whole DOM subtree in one call. Never calls an onComplete — this
  // stage has no next-stage seam to hand off to, the same "fire and
  // forget" contract StandardFireworks already uses.
  destroy() {
    if (this._timeline) this._timeline.kill();

    gsap.killTweensOf(this.textWrapper);
    gsap.killTweensOf(this.mainLetters);
    gsap.killTweensOf(this.subLetters);
    gsap.killTweensOf([this.tracer, this.tracerEcho]);
    this.particles.forEach((particle) => gsap.killTweensOf(particle.element));

    this.element.remove();
  }
}
