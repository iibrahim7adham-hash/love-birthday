import * as THREE from "three";
import gsap from "gsap";

import "./StandardCandleBlowout.css";

import { CANDLE_BLOWOUT_DIM_DURATION } from "./cake/CakeConstants";
import {
  BLOWOUT_BUTTON_TEXT,
  BLOWOUT_BUTTON_ENTER_DELAY,
  BLOWOUT_BUTTON_ENTER_DURATION,
  BLOWOUT_FLAME_REACT_DURATION,
  BLOWOUT_FLAME_SHRINK_DURATION,
  BLOWOUT_FLAME_VANISH_DURATION,
  BLOWOUT_FLAME_STAGGER,
  BLOWOUT_FLAME_REACT_SCALE,
  BLOWOUT_SMOKE_START_DELAY,
  BLOWOUT_SMOKE_COUNT_PER_CANDLE,
  BLOWOUT_SMOKE_STAGGER,
  BLOWOUT_SMOKE_RISE_MIN,
  BLOWOUT_SMOKE_RISE_MAX,
  BLOWOUT_SMOKE_DRIFT_X,
  BLOWOUT_SMOKE_DURATION_MIN,
  BLOWOUT_SMOKE_DURATION_MAX,
  BLOWOUT_SMOKE_MIN_SCALE,
  BLOWOUT_SMOKE_MAX_SCALE,
  BLOWOUT_SMOKE_GROWTH,
  BLOWOUT_SMOKE_PEAK_OPACITY,
  BLOWOUT_SMOKE_COLOR,
  BLOWOUT_LIGHTING_DIM_START_DELAY,
  BLOWOUT_ATMOSPHERE_DIM_FRACTION,
  BLOWOUT_DARK_PAUSE_DURATION,
} from "./StandardCandleBlowoutConstants";

const BLOWOUT_STATE = {
  NORMAL: "blowout-normal",
  BLOWING_CANDLES: "blowout-blowing-candles",
  LIGHTS_DIMMING: "blowout-lights-dimming",
  FIREWORKS: "blowout-fireworks",
};

// A soft radial-gradient sprite texture — the same "cache a canvas
// gradient, reuse the map, tint via material.color" technique every
// other glow/particle system in this template already uses, kept local
// to this file per that same convention. Used here for smoke puffs
// (NOT additive-blended — see _spawnSmoke()'s own comment on why).
let sharedSmokeTexture = null;

function getSmokeTexture() {
  if (sharedSmokeTexture) return sharedSmokeTexture;

  const size = 96;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  sharedSmokeTexture = new THREE.CanvasTexture(canvas);
  return sharedSmokeTexture;
}

// The interactive "blow out the candles" moment — a single button
// beneath the cake that, once pressed exactly once, plays a cinematic
// sequence: the five candle flames extinguish (with a few soft smoke
// wisps), the cake's own lighting and CakeAtmosphere both dim, a brief
// dark pause holds for anticipation, then StandardFireworks.js's own
// playCinematicSequence() takes over for the emotional-climax fireworks
// celebration.
//
// Constructed once from StandardScene's own _enterCelebrationStage() —
// the exact same hook BirthdayReveal/StandardFireworks are already built
// from — given direct references to the already-built `cakeReveal`
// (for its `cake.flames`, `lighting`, `atmosphere`, and `scene`) and
// `fireworks` instances rather than re-deriving/duplicating any of that
// machinery. Pure DOM+CSS+GSAP for the button itself (the same overlay
// pattern StartScreen.js/BirthdayReveal.js already use), reaching
// directly into the real Three.js scene for the extinguish/smoke beats —
// this stage doesn't own any persistent 3D content of its own, so
// there's nothing to keep or dispose beyond what it creates during its
// own one-time sequence.
export default class StandardCandleBlowout {
  constructor({ cakeReveal, fireworks, balloons, floatingText, audio }) {
    this.cakeReveal = cakeReveal;
    this.fireworks = fireworks;
    this.balloons = balloons;
    this.floatingText = floatingText;
    this.audio = audio;

    this.state = BLOWOUT_STATE.NORMAL;
    this._smokeEntries = new Set();

    this._onPointerEnter = () => this._setHovering(true);
    this._onPointerLeave = () => {
      this._setHovering(false);
      this._setPressed(false);
    };
    this._onPointerDown = () => this._setPressed(true);
    this._onPointerUp = () => this._setPressed(false);
    this._onClick = () => this._handleClick();

    this.create();
    this._playEntrance();
  }

  create() {
    this.element = document.createElement("div");
    this.element.id = "standard-candle-blowout";

    this.element.innerHTML = `
      <button type="button" class="standard-blowout-button" dir="rtl" aria-label="${BLOWOUT_BUTTON_TEXT}">
        ${BLOWOUT_BUTTON_TEXT}
      </button>
    `;

    document.body.appendChild(this.element);

    this.button = this.element.querySelector(".standard-blowout-button");

    // click (not a raw pointerdown/up pair) is what fires uniformly for
    // mouse clicks, touch taps, AND keyboard Enter/Space on a focused
    // button — the same binding every other interactive control in this
    // project uses (see StartScreen.js's own bindEvents()).
    this.button.addEventListener("pointerenter", this._onPointerEnter);
    this.button.addEventListener("pointerleave", this._onPointerLeave);
    this.button.addEventListener("pointerdown", this._onPointerDown);
    this.button.addEventListener("pointerup", this._onPointerUp);
    this.button.addEventListener("click", this._onClick);
  }

  _playEntrance() {
    this._entranceCall = gsap.delayedCall(BLOWOUT_BUTTON_ENTER_DELAY, () => {
      gsap.fromTo(
        this.button,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: BLOWOUT_BUTTON_ENTER_DURATION, ease: "power2.out" },
      );
    });
  }

  // Desktop hover — border glow strengthens slightly, a very subtle
  // scale increase, smooth. Guarded to NORMAL state only, so a hover
  // that was already in flight when the button gets pressed/disabled
  // can never re-brighten it afterward.
  _setHovering(hovering) {
    if (this.state !== BLOWOUT_STATE.NORMAL) return;

    gsap.to(this.button, {
      scale: hovering ? 1.04 : 1,
      boxShadow: hovering
        ? "0 0 22px rgba(246, 182, 204, 0.45), 0 0 52px rgba(248, 201, 217, 0.2)"
        : "0 0 16px rgba(246, 182, 204, 0.3), 0 0 40px rgba(248, 201, 217, 0.12)",
      duration: 0.25,
      ease: "power2.out",
    });
  }

  // The subtle press/touch feedback the brief asks for on mobile (where
  // there's no hover state) — also fires on desktop alongside the hover
  // tween above, which is harmless since they animate different
  // property targets at different moments (press is instantaneous,
  // hover is sustained).
  _setPressed(pressed) {
    if (this.state !== BLOWOUT_STATE.NORMAL) return;

    gsap.to(this.button, { scale: pressed ? 0.96 : 1, duration: 0.15, ease: "power2.out" });
  }

  // The interaction happens exactly once — guarded by `state`, the same
  // "check first, transition immediately" idiom StartScreen.js's own
  // _handlePress() already establishes, so a rapid double-click can
  // never start the sequence twice.
  _handleClick() {
    if (this.state !== BLOWOUT_STATE.NORMAL) return;

    this.state = BLOWOUT_STATE.BLOWING_CANDLES;
    this.button.disabled = true;

    gsap.to(this.button, { opacity: 0, scale: 0.92, duration: 0.5, ease: "power2.in" });

    this.audio.trigger("candle-blowout:press");
    this._playSequence();
  }

  // The full cinematic sequence: candles extinguish (with smoke), the
  // lighting/atmosphere dim, a brief dark pause, then fireworks. One
  // master timeline, the same "every beat is a position on this one
  // timeline, never a scattered setTimeout" convention CakeReveal.js's
  // own playSequence() already establishes.
  _playSequence() {
    const tl = gsap.timeline();
    this._timeline = tl;

    this._extinguishCandles(tl);

    tl.call(() => this._spawnSmoke(), null, BLOWOUT_SMOKE_START_DELAY);

    tl.call(() => {
      this.state = BLOWOUT_STATE.LIGHTS_DIMMING;
    }, null, BLOWOUT_LIGHTING_DIM_START_DELAY);

    tl.add(this.cakeReveal.lighting.dimForBlowOut(CANDLE_BLOWOUT_DIM_DURATION), BLOWOUT_LIGHTING_DIM_START_DELAY);
    tl.add(
      this.cakeReveal.atmosphere.dim(CANDLE_BLOWOUT_DIM_DURATION, BLOWOUT_ATMOSPHERE_DIM_FRACTION),
      BLOWOUT_LIGHTING_DIM_START_DELAY,
    );

    const fireworksStart = BLOWOUT_LIGHTING_DIM_START_DELAY + CANDLE_BLOWOUT_DIM_DURATION + BLOWOUT_DARK_PAUSE_DURATION;

    tl.call(
      () => {
        this.state = BLOWOUT_STATE.FIREWORKS;
        this.audio.trigger("candle-blowout:fireworks-begin");
        this.fireworks.playCinematicSequence();
        this.balloons.start();
        this.floatingText.start();
      },
      null,
      fireworksStart,
    );
  }

  // Each flame reacts (a quick small flare), shrinks rapidly, then
  // vanishes — a small per-candle stagger so the five don't extinguish
  // in perfect robotic unison. `userData.extinguished` is set to `true`
  // for every flame SYNCHRONOUSLY, before any tween is even created —
  // CakeReveal.update()'s own per-frame flicker loop checks this flag
  // and bails out immediately once set (see its own comment), so there
  // is no possible race between that loop and this timeline both
  // touching the same tip.scale/glow.material.opacity in the same
  // frame.
  _extinguishCandles(tl) {
    this.cakeReveal.cake.flames.forEach(({ group }) => {
      group.userData.extinguished = true;
    });

    this.cakeReveal.cake.flames.forEach(({ group, tip, glow }, index) => {
      const startAt = index * BLOWOUT_FLAME_STAGGER;
      const shrinkAt = startAt + BLOWOUT_FLAME_REACT_DURATION;
      const vanishAt = shrinkAt + BLOWOUT_FLAME_SHRINK_DURATION;

      tl.to(
        tip.scale,
        { x: BLOWOUT_FLAME_REACT_SCALE, y: BLOWOUT_FLAME_REACT_SCALE, z: BLOWOUT_FLAME_REACT_SCALE, duration: BLOWOUT_FLAME_REACT_DURATION, ease: "power1.out" },
        startAt,
      );
      tl.to(tip.scale, { x: 0.05, y: 0.05, z: 0.05, duration: BLOWOUT_FLAME_SHRINK_DURATION, ease: "power2.in" }, shrinkAt);
      tl.to(
        glow.material,
        { opacity: 0, duration: BLOWOUT_FLAME_SHRINK_DURATION + BLOWOUT_FLAME_VANISH_DURATION, ease: "power2.in" },
        shrinkAt,
      );
      tl.to(tip.scale, { x: 0, y: 0, z: 0, duration: BLOWOUT_FLAME_VANISH_DURATION, ease: "power1.in" }, vanishAt);
      tl.call(
        () => {
          group.visible = false;
        },
        null,
        vanishAt + BLOWOUT_FLAME_VANISH_DURATION,
      );
    });
  }

  // A handful of small soft grey wisps per candle, rising and gently
  // drifting/expanding while fading — deliberately NOT additive-blended
  // (every other glow/particle sprite in this template is, since
  // they're all meant to read as light; this is smoke, and additive
  // blending on a grey sprite over a dark background would read as a
  // dim glow rather than an opaque puff). Fully self-disposing one-shot
  // sprites — this only ever happens once per experience, so there's no
  // pooling concern (a few small sprites created once is trivial).
  // World position reuses the exact
  // `flameGroup.getWorldPosition(vector)` convention CakeReveal.js's own
  // sparkle bursts already establish.
  _spawnSmoke() {
    const scene = this.cakeReveal.scene;
    const worldPos = new THREE.Vector3();

    this.cakeReveal.cake.flames.forEach(({ group }) => {
      group.getWorldPosition(worldPos);
      const origin = worldPos.clone();

      for (let i = 0; i < BLOWOUT_SMOKE_COUNT_PER_CANDLE; i++) {
        const material = new THREE.SpriteMaterial({
          map: getSmokeTexture(),
          color: new THREE.Color(BLOWOUT_SMOKE_COLOR),
          transparent: true,
          opacity: 0,
          depthWrite: false,
        });

        const sprite = new THREE.Sprite(material);
        const scale = gsap.utils.random(BLOWOUT_SMOKE_MIN_SCALE, BLOWOUT_SMOKE_MAX_SCALE);
        sprite.scale.setScalar(scale);
        sprite.position.copy(origin);
        scene.add(sprite);

        const rise = gsap.utils.random(BLOWOUT_SMOKE_RISE_MIN, BLOWOUT_SMOKE_RISE_MAX);
        const driftX = gsap.utils.random(-BLOWOUT_SMOKE_DRIFT_X, BLOWOUT_SMOKE_DRIFT_X);
        const duration = gsap.utils.random(BLOWOUT_SMOKE_DURATION_MIN, BLOWOUT_SMOKE_DURATION_MAX);
        const delay = gsap.utils.random(0, BLOWOUT_SMOKE_STAGGER);

        const dispose = () => {
          scene.remove(sprite);
          material.dispose();
        };

        const tl = gsap.timeline({
          delay,
          onComplete: () => {
            this._smokeEntries.delete(entry);
            dispose();
          },
        });
        const entry = { tl, dispose };
        this._smokeEntries.add(entry);

        tl.to(material, { opacity: BLOWOUT_SMOKE_PEAK_OPACITY, duration: duration * 0.3, ease: "power1.out" }, 0);
        tl.to(
          sprite.position,
          { x: origin.x + driftX, y: origin.y + rise, z: origin.z, duration, ease: "power1.out" },
          0,
        );
        tl.to(
          sprite.scale,
          { x: scale * BLOWOUT_SMOKE_GROWTH, y: scale * BLOWOUT_SMOKE_GROWTH, z: scale * BLOWOUT_SMOKE_GROWTH, duration, ease: "power1.out" },
          0,
        );
        tl.to(material, { opacity: 0, duration: duration * 0.5, ease: "power1.in" }, duration * 0.5);
      }
    });
  }

  // Safe to call more than once, the same contract every other Standard
  // stage's own destroy() follows.
  destroy() {
    if (this._entranceCall) this._entranceCall.kill();
    if (this._timeline) this._timeline.kill();

    this._smokeEntries.forEach(({ tl, dispose }) => {
      tl.kill();
      dispose();
    });
    this._smokeEntries.clear();

    gsap.killTweensOf(this.button);

    this.button.removeEventListener("pointerenter", this._onPointerEnter);
    this.button.removeEventListener("pointerleave", this._onPointerLeave);
    this.button.removeEventListener("pointerdown", this._onPointerDown);
    this.button.removeEventListener("pointerup", this._onPointerUp);
    this.button.removeEventListener("click", this._onClick);

    this.element.remove();
  }
}
