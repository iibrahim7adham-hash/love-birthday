import gsap from "gsap";

import buildBomb, { disposeBomb } from "./BombGeometry";
import FuseFlame from "./FuseFlame";
import FuseBurn from "./FuseBurn";
import {
  BOMB_START_X,
  BOMB_CENTER_X,
  BOMB_Y,
  BOMB_ROLL_ROTATION_START,
  BOMB_ENTRY_DELAY,
  BOMB_ROLL_DURATION,
  BOMB_STOP_PAUSE,
  BOMB_CAP_APPEAR_DURATION,
  BOMB_FUSE_APPEAR_DURATION,
  BOMB_IGNITE_DURATION,
  BOMB_ANTICIPATION_AT,
  BOMB_FACE_TRANSITION_DURATION,
  BOMB_BURN_TRAVEL_DURATION,
} from "./BombConstants";

// Part 1's entire visual surface: builds the bomb (see BombGeometry.js
// for the "what it looks like"), then choreographs entry -> roll ->
// settle -> pause -> cap -> fuse -> ignite -> anticipation -> final
// pre-explosion hold. One master GSAP timeline drives the whole
// sequence, the exact same "single timeline, cursor offset bookkeeping,
// tl.call() for state/audio hooks" shape
// standard/cake/CakeReveal.js's own playSequence() already establishes
// for this project. Deliberately stops at the final hold — no
// explosion, no hearts — those are separate systems built on top of
// this one later (see BoomScene.js's own header comment).
export default class BombIntro {
  constructor({ scene, audio }) {
    this.scene = scene;
    this.audio = audio;

    this.bomb = buildBomb();
    this.bomb.bombGroup.position.set(BOMB_START_X, BOMB_Y, 0);
    this.bomb.bombGroup.rotation.z = BOMB_ROLL_ROTATION_START;
    this.bomb.shadow.position.x = BOMB_START_X;
    this.scene.add(this.bomb.bombGroup);
    this.scene.add(this.bomb.shadow);

    this.fuseFlame = new FuseFlame(this.bomb.spark);
    this.fuseBurn = new FuseBurn(this.bomb.bombGroup, this.fuseFlame, this.bomb.fuse);

    this.readyForExplosion = false;
    // Flips true the instant HeartBurst takes over (see the final
    // tl.call() below) — the bomb/fuse are hidden by HeartBurst.ignite()
    // at that exact same moment, so there is nothing left for this
    // class's own per-frame update() to do afterward.
    this.finished = false;

    this.playSequence();
  }

  playSequence() {
    const tl = gsap.timeline();
    this._timeline = tl;

    let cursor = BOMB_ENTRY_DELAY;

    tl.call(() => this.audio.trigger("boom:bomb-enter"), null, cursor);

    // ---- Roll: one continuous eased tween carries entering, rolling,
    // and slowing-into-place together (power2.out gives the momentum
    // -> deceleration feel the brief asks for, with no bounce/overshoot
    // since none is visible in the reference). Position and rotation
    // are two separate tweens sharing the exact same start time,
    // duration, and ease — GSAP runs them in lockstep, so the roll
    // still reads as one physically-connected motion, while letting
    // rotation land on an exact multiple of a full turn (perfectly
    // upright) independent of the travel distance that reads right on
    // screen (see BombConstants.js's own comment on BOMB_START_X /
    // BOMB_ROLL_ROTATION_START for why those two used to be coupled and
    // why that broke the entrance).
    tl.to(this.bomb.bombGroup.position, { x: BOMB_CENTER_X, duration: BOMB_ROLL_DURATION, ease: "power2.out" }, cursor);
    tl.to(this.bomb.bombGroup.rotation, { z: 0, duration: BOMB_ROLL_DURATION, ease: "power2.out" }, cursor);
    tl.to(this.bomb.shadow.position, { x: BOMB_CENTER_X, duration: BOMB_ROLL_DURATION, ease: "power2.out" }, cursor);
    cursor += BOMB_ROLL_DURATION;

    // ---- Stopping moment: a short deliberate stillness before
    // anything else happens (see BombConstants.js's own comment on
    // BOMB_STOP_PAUSE) — the bomb is never immediately busy the instant
    // it settles.
    cursor += BOMB_STOP_PAUSE;

    // ---- Top cap.
    tl.call(
      () => {
        this.bomb.cap.visible = true;
        this.audio.trigger("boom:cap-appear");
      },
      null,
      cursor,
    );
    tl.fromTo(
      this.bomb.cap.scale,
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 1, z: 1, duration: BOMB_CAP_APPEAR_DURATION, ease: "back.out(1.6)" },
      cursor,
    );
    cursor += BOMB_CAP_APPEAR_DURATION;

    // ---- Fuse.
    tl.call(
      () => {
        this.bomb.fuse.visible = true;
        this.audio.trigger("boom:fuse-appear");
      },
      null,
      cursor,
    );
    tl.fromTo(
      this.bomb.fuse.scale,
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 1, z: 1, duration: BOMB_FUSE_APPEAR_DURATION, ease: "back.out(1.6)" },
      cursor,
    );
    cursor += BOMB_FUSE_APPEAR_DURATION;

    // ---- Ignition — the spark pops in, then FuseFlame's own continuous
    // organic flicker takes over and keeps running through the whole
    // anticipation phase (and beyond, until Part 2 hides the bomb
    // entirely). Started only once the pop-in tween has fully finished,
    // not alongside it — both would otherwise animate the same
    // scale.x/y properties at once, and GSAP overwrites the earlier of
    // two tweens fighting over the same target/properties, which is
    // exactly why the flicker previously went dead the instant the
    // pop-in began.
    tl.call(
      () => {
        this.bomb.spark.visible = true;
        this.audio.trigger("boom:fuse-ignite");
      },
      null,
      cursor,
    );
    tl.fromTo(
      this.bomb.spark.scale,
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 1, z: 1, duration: BOMB_IGNITE_DURATION, ease: "back.out(2)" },
      cursor,
    );
    const burnCursor = cursor + BOMB_IGNITE_DURATION;
    tl.call(() => this.fuseFlame.start(), null, burnCursor);

    // ---- Burn travel — the actual fix this file exists for: the
    // burning point eases from the tip (progress 0) to the base right
    // by the cap (progress 1) over BOMB_BURN_TRAVEL_DURATION, via a
    // plain tweened proxy rather than tweening FuseBurn's own state
    // directly (FuseBurn.setProgress() does real per-frame work — new
    // charred-overlay geometry + re-anchoring FuseFlame — so it belongs
    // behind an onUpdate call, not as a GSAP-animatable target itself).
    // power1.in gives it a faint acceleration into the end, reading as
    // rising urgency rather than a robotic constant rate.
    const burnProxy = { p: 0 };
    tl.to(
      burnProxy,
      {
        p: 1,
        duration: BOMB_BURN_TRAVEL_DURATION,
        ease: "power1.in",
        onUpdate: () => this.fuseBurn.setProgress(burnProxy.p),
      },
      burnCursor,
    );

    // ---- Anticipation: locked to the reference's own absolute ~4.0s
    // mark rather than continuing to accumulate off `cursor`, so the
    // face transition timing stays matched to the reference even if the
    // beats above ever drift slightly. Runs concurrently with the burn
    // travel above, not sequenced after it.
    cursor = BOMB_ANTICIPATION_AT;

    // A gradual crossfade (not an instant swap) between the smiling
    // mouth and the small surprised "o" — both meshes stay visible
    // through the transition, one fading out as the other fades in, per
    // the brief's own "subtle transition, not happy -> explosion".
    this.bomb.mouthSurprised.visible = true;
    tl.to(this.bomb.mouthHappy.material, { opacity: 0, duration: BOMB_FACE_TRANSITION_DURATION, ease: "sine.inOut" }, cursor);
    tl.to(
      this.bomb.mouthSurprised.material,
      { opacity: 1, duration: BOMB_FACE_TRANSITION_DURATION, ease: "sine.inOut" },
      cursor,
    );

    // ---- Handoff. The burn reaching the fuse's base IS the trigger —
    // not a disconnected fixed hold timer — so Part 2 only ever starts
    // once the fuse has actually visibly finished burning down.
    tl.call(() => {
      this.bomb.mouthHappy.visible = false;
      this.readyForExplosion = true;
      this.finished = true;
    }, null, burnCursor + BOMB_BURN_TRAVEL_DURATION);
  }

  // Everything else in this sequence is GSAP-timeline/ticker driven —
  // only the fuse-tip flame and its embers need real per-frame work
  // (see FuseFlame.js's own comment on why it isn't GSAP-tween-driven),
  // the same "the one stage that needs continuous procedural motion
  // gets an update() call, the rest don't" shape
  // standard/cake/CakeReveal.js's own update() already establishes for
  // its candle flicker.
  update(delta) {
    if (this.finished) return;
    this.fuseFlame.update(delta);
    this.fuseBurn.update(delta);
  }

  destroy() {
    if (this._timeline) this._timeline.kill();
    this.fuseFlame.stop();
    this.fuseBurn.destroy();
    gsap.killTweensOf([
      this.bomb.bombGroup.position,
      this.bomb.bombGroup.rotation,
      this.bomb.shadow.position,
      this.bomb.cap.scale,
      this.bomb.fuse.scale,
      this.bomb.spark.scale,
      this.bomb.mouthHappy.material,
      this.bomb.mouthSurprised.material,
    ]);

    disposeBomb(this.bomb);
    this.scene.remove(this.bomb.bombGroup);
    this.scene.remove(this.bomb.shadow);
  }
}
