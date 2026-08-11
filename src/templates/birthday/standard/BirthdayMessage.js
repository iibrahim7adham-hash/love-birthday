import gsap from "gsap";

import "./BirthdayMessage.css";

import {
  BIRTHDAY_MESSAGE_SPARKLE,
  BIRTHDAY_MESSAGE_WORD_1,
  BIRTHDAY_MESSAGE_WORD_2,
  BIRTHDAY_MESSAGE_PARTICLE_COLORS,
  BIRTHDAY_MESSAGE_PARTICLE_COUNT,
  BIRTHDAY_MESSAGE_MOBILE_BREAKPOINT,
  BIRTHDAY_MESSAGE_PARTICLE_MIN_RADIUS_VW,
  BIRTHDAY_MESSAGE_PARTICLE_MAX_RADIUS_VW,
  BIRTHDAY_MESSAGE_PARTICLE_MIN_SIZE,
  BIRTHDAY_MESSAGE_PARTICLE_MAX_SIZE,
  MESSAGE_ENTER_DELAY,
  MESSAGE_ATMOSPHERE_FADE_DURATION,
  PARTICLE_GATHER_DURATION,
  PARTICLE_GATHER_STAGGER,
  TEXT_REVEAL_START_OFFSET,
  SPARKLE_REVEAL_DURATION,
  WORD_REVEAL_DURATION,
  WORD_REVEAL_RISE_VH,
  MESSAGE_BEAT_STAGGER,
  MESSAGE_BREATHE_SCALE,
  MESSAGE_BREATHE_DURATION,
  MESSAGE_HOLD_DURATION,
  MESSAGE_EXIT_DURATION,
  MESSAGE_EXIT_SCALE,
  PARTICLE_DISPERSE_DURATION,
  PARTICLE_DISPERSE_RADIUS_VW,
} from "./BirthdayMessageConstants";

// The lifecycle this file drives, in order — same lightweight
// plain-string-constants approach StartScreen.js/Countdown.js already
// use. Purely for clarity/observability (nothing here is interactive).
const BIRTHDAY_MESSAGE_STATE = {
  ENTER: "birthday-message-enter",
  PARTICLES_GATHER: "birthday-message-particles-gather",
  TEXT_REVEAL: "birthday-message-text-reveal",
  HOLD: "birthday-message-hold",
  DISPERSE: "birthday-message-disperse",
  COMPLETE: "birthday-message-complete",
};

// The short emotional beat between Countdown and CakeReveal: tiny points
// of light drift in toward the center, a sparkle forms, "Happy Birthday"
// reveals piece by piece, the composition holds and breathes once, then
// everything disperses back into the same darkness CakeReveal's own
// opening breath begins from. One master GSAP timeline drives the whole
// sequence, mirroring Countdown.js's own single-timeline approach — no
// scattered setTimeout anywhere.
//
// Pure DOM+CSS+GSAP, the same overlay pattern StartScreen.js/Countdown.js
// already use — deliberately NOT a Three.js/scene addition. There's no
// 3D content behind this stage yet (the cake hasn't formed, and
// CakeCamera's own dolly hasn't even started), so anchoring particles to
// real 3D world-space would need a camera position this stage has no
// business choosing. "Particles" are small absolutely-positioned dots
// animated via GSAP transform/opacity instead — cheap, GPU-composited,
// and they mirror FormationSparkles' own *idea* (small glow points
// converging on a target) without duplicating its Three.js machinery,
// which exists specifically to anchor onto real 3D cake geometry this
// stage doesn't have.
export default class BirthdayMessage {
  constructor(audio, onComplete) {
    this.audio = audio;
    this.onComplete = onComplete;

    this.state = BIRTHDAY_MESSAGE_STATE.ENTER;

    this.create();
    this.playSequence();
  }

  create() {
    this.element = document.createElement("div");
    this.element.id = "standard-birthday-message";

    this.element.innerHTML = `
      <div class="standard-birthday-atmosphere" aria-hidden="true"></div>
      <div class="standard-birthday-particles" aria-hidden="true"></div>
      <p class="standard-birthday-phrase" aria-live="polite">
        <span class="standard-birthday-sparkle standard-birthday-sparkle-left">${BIRTHDAY_MESSAGE_SPARKLE}</span>
        <span class="standard-birthday-word">${BIRTHDAY_MESSAGE_WORD_1}</span>
        <span class="standard-birthday-word">${BIRTHDAY_MESSAGE_WORD_2}</span>
        <span class="standard-birthday-sparkle standard-birthday-sparkle-right">${BIRTHDAY_MESSAGE_SPARKLE}</span>
      </p>
    `;

    document.body.appendChild(this.element);

    this.atmosphere = this.element.querySelector(".standard-birthday-atmosphere");
    this.particleField = this.element.querySelector(".standard-birthday-particles");
    this.phrase = this.element.querySelector(".standard-birthday-phrase");
    this.sparkleLeft = this.element.querySelector(".standard-birthday-sparkle-left");
    this.sparkleRight = this.element.querySelector(".standard-birthday-sparkle-right");
    this.words = Array.from(this.element.querySelectorAll(".standard-birthday-word"));

    this.particles = this._buildParticles();
  }

  // A handful of small glow dots scattered around the center at random
  // angles/radii (in vw, so they scale with viewport rather than using
  // fixed desktop pixels), each centered on the container via inline
  // top/left/margin and starting collapsed/invisible — playSequence()
  // converges them toward their own "home" offset as its first beat,
  // then drifts them further out again on dispersal. Count is halved on
  // narrow viewports per the brief's own "reduce particle count on
  // smaller devices" guidance.
  _buildParticles() {
    const count =
      window.innerWidth < BIRTHDAY_MESSAGE_MOBILE_BREAKPOINT
        ? Math.round(BIRTHDAY_MESSAGE_PARTICLE_COUNT / 2)
        : BIRTHDAY_MESSAGE_PARTICLE_COUNT;

    const particles = [];

    for (let i = 0; i < count; i++) {
      const dot = document.createElement("span");
      dot.className = "standard-birthday-particle";

      const size = gsap.utils.random(BIRTHDAY_MESSAGE_PARTICLE_MIN_SIZE, BIRTHDAY_MESSAGE_PARTICLE_MAX_SIZE);
      const color = BIRTHDAY_MESSAGE_PARTICLE_COLORS[i % BIRTHDAY_MESSAGE_PARTICLE_COLORS.length];

      dot.style.top = "50%";
      dot.style.left = "50%";
      dot.style.width = `${size}px`;
      dot.style.height = `${size}px`;
      dot.style.marginTop = `${-size / 2}px`;
      dot.style.marginLeft = `${-size / 2}px`;
      dot.style.background = color;
      dot.style.boxShadow = `0 0 ${size * 2.5}px ${color}`;

      this.particleField.appendChild(dot);

      const angle = Math.random() * Math.PI * 2;
      const radiusVw = gsap.utils.random(
        BIRTHDAY_MESSAGE_PARTICLE_MIN_RADIUS_VW,
        BIRTHDAY_MESSAGE_PARTICLE_MAX_RADIUS_VW,
      );
      const homeX = Math.cos(angle) * radiusVw;
      const homeY = Math.sin(angle) * radiusVw * 0.6; // flatter vertical spread than horizontal

      gsap.set(dot, { x: `${homeX}vw`, y: `${homeY}vw`, scale: 0, opacity: 0 });

      particles.push({ element: dot, homeX, homeY });
    }

    return particles;
  }

  // One master timeline for the entire sequence: a short breath of
  // darkness, particles drifting in, the phrase condensing out of them
  // piece by piece, a single soft breathe on hold, then everything
  // dispersing back into darkness. Every beat is a position on this one
  // timeline, never a scattered setTimeout — the same convention
  // Countdown.js's own playSequence() already establishes.
  playSequence() {
    const tl = gsap.timeline({ onComplete: () => this._finish() });
    this._timeline = tl;

    let cursor = MESSAGE_ENTER_DELAY;

    tl.call(() => {
      this.state = BIRTHDAY_MESSAGE_STATE.PARTICLES_GATHER;
      this.audio.trigger("birthday-message:appear");
    }, null, cursor);

    tl.to(this.atmosphere, { opacity: 1, duration: MESSAGE_ATMOSPHERE_FADE_DURATION, ease: "power2.out" }, cursor);

    // ---- Particles drift in toward the center, each starting at a
    // slightly different moment within the stagger window so they never
    // move in lockstep — "tiny particles appear... slowly drift inward"
    // from the brief.
    this.particles.forEach((particle) => {
      const startAt = cursor + gsap.utils.random(0, PARTICLE_GATHER_STAGGER);

      tl.to(
        particle.element,
        {
          x: `${particle.homeX}vw`,
          y: `${particle.homeY}vw`,
          scale: 1,
          opacity: 0.85,
          duration: PARTICLE_GATHER_DURATION,
          ease: "power2.out",
        },
        startAt,
      );
    });

    // ---- Sparkle -> "Happy" -> "Birthday" -> sparkle, one small beat at
    // a time via the shared _revealSpan() helper — starts partway
    // through the particle gather (not after it finishes), so the
    // phrase feels like it's condensing out of the still-arriving
    // particles rather than waiting on them.
    const textStart = cursor + TEXT_REVEAL_START_OFFSET;

    tl.call(() => {
      this.state = BIRTHDAY_MESSAGE_STATE.TEXT_REVEAL;
    }, null, textStart);

    cursor = this._revealSpan(tl, this.sparkleLeft, textStart, SPARKLE_REVEAL_DURATION);
    cursor = this._revealSpan(tl, this.words[0], cursor, WORD_REVEAL_DURATION);
    cursor = this._revealSpan(tl, this.words[1], cursor, WORD_REVEAL_DURATION);
    cursor = this._revealSpan(tl, this.sparkleRight, cursor, SPARKLE_REVEAL_DURATION);

    // ---- Hold: the finished phrase breathes once, softly, then sits
    // still for the rest of the hold — never a repeating pulse, just
    // enough that it doesn't read as a frozen frame.
    tl.call(() => {
      this.state = BIRTHDAY_MESSAGE_STATE.HOLD;
    }, null, cursor);

    tl.to(
      this.phrase,
      {
        scale: MESSAGE_BREATHE_SCALE,
        duration: MESSAGE_BREATHE_DURATION,
        ease: "sine.inOut",
        yoyo: true,
        repeat: 1,
      },
      cursor + 0.2,
    );

    cursor += MESSAGE_HOLD_DURATION;

    // ---- Disperse: the phrase dissolves while particles drift a little
    // further outward and fade, and the warm atmosphere fades with
    // them — a lingering glow rather than a hard cut, so it leads
    // naturally into CakeReveal's own dark breath + warm light fade-in
    // right after this stage tears itself down.
    tl.call(() => {
      this.state = BIRTHDAY_MESSAGE_STATE.DISPERSE;
    }, null, cursor);

    tl.to(
      this.phrase,
      { opacity: 0, scale: MESSAGE_EXIT_SCALE, duration: MESSAGE_EXIT_DURATION, ease: "power2.in" },
      cursor,
    );

    this.particles.forEach((particle) => {
      const outwardX = particle.homeX + Math.sign(particle.homeX || 1) * PARTICLE_DISPERSE_RADIUS_VW;
      const outwardY = particle.homeY + PARTICLE_DISPERSE_RADIUS_VW * 0.5;

      tl.to(
        particle.element,
        { x: `${outwardX}vw`, y: `${outwardY}vw`, opacity: 0, duration: PARTICLE_DISPERSE_DURATION, ease: "power1.in" },
        cursor,
      );
    });

    tl.to(this.atmosphere, { opacity: 0, duration: PARTICLE_DISPERSE_DURATION, ease: "power2.in" }, cursor);

    cursor += Math.max(MESSAGE_EXIT_DURATION, PARTICLE_DISPERSE_DURATION);

    tl.call(() => {
      this.state = BIRTHDAY_MESSAGE_STATE.COMPLETE;
    }, null, cursor);
  }

  // Fades + rises + settles one span into place — the shared reveal beat
  // every piece of the phrase (both sparkles, both words) uses, returning
  // the position the next piece should start at. The same
  // _appendNumberBeat()-style helper reuse Countdown.js's own digits
  // already establish, rather than writing the same tween four times.
  _revealSpan(tl, el, startAt, duration) {
    tl.fromTo(
      el,
      { opacity: 0, y: `${WORD_REVEAL_RISE_VH}vh`, scale: 0.92 },
      { opacity: 1, y: "0vh", scale: 1, duration, ease: "power2.out" },
      startAt,
    );

    return startAt + MESSAGE_BEAT_STAGGER;
  }

  _finish() {
    this.audio.trigger("birthday-message:complete");
    this.destroy();
    this.onComplete();
  }

  // Safe to call more than once (StandardScene.destroy() also calls this
  // defensively on teardown), same contract as Countdown.destroy() —
  // kills the master timeline first (so no further tl.call can fire),
  // then every loose tween, then removes the whole DOM subtree in one
  // call. Never calls onComplete itself.
  destroy() {
    if (this._timeline) this._timeline.kill();

    gsap.killTweensOf(this.phrase);
    gsap.killTweensOf(this.atmosphere);
    gsap.killTweensOf([this.sparkleLeft, this.sparkleRight, ...this.words]);
    this.particles.forEach((particle) => gsap.killTweensOf(particle.element));

    this.element.remove();
  }
}
