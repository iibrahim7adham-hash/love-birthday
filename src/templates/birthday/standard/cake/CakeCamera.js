import gsap from "gsap";

import {
  CAMERA_LOOK_TARGET_Y,
  CAMERA_WIDE_POSITION,
  CAMERA_HERO_POSITION,
  CAMERA_DOLLY_DURATION,
  CAMERA_DOLLY_EASE,
  CAMERA_IDLE_SWAY_AMOUNT,
  CAMERA_IDLE_SWAY_SPEED,
  CAMERA_PULLBACK_DISTANCE_SCALE,
  CAMERA_PULLBACK_DURATION,
} from "./CakeConstants";
import { getCakeCameraDistanceScale } from "./CakeResponsive";

// The settled, post-reveal framing — CAMERA_HERO_POSITION's own offset
// from the look target, scaled outward by CAMERA_PULLBACK_DISTANCE_SCALE.
// Derived from the same reference points CAMERA_HERO_POSITION is itself
// defined against (the same offset-scaling idiom _scaledPosition() below
// already uses for responsive distance compensation) rather than a
// second hand-tuned raw position, so it always preserves the exact hero
// viewing angle — only the distance changes.
const CAMERA_SETTLED_POSITION = {
  x: CAMERA_HERO_POSITION.x * CAMERA_PULLBACK_DISTANCE_SCALE,
  y: CAMERA_LOOK_TARGET_Y + (CAMERA_HERO_POSITION.y - CAMERA_LOOK_TARGET_Y) * CAMERA_PULLBACK_DISTANCE_SCALE,
  z: CAMERA_HERO_POSITION.z * CAMERA_PULLBACK_DISTANCE_SCALE,
};

// Places and moves the engine's shared camera for the cake reveal —
// nothing else. Same idiom luxury/Animation/IntroCamera.js already uses
// (set a starting position, animate camera.position directly via GSAP,
// re-call lookAt in onUpdate) rather than love/LoveCamera.js's own
// continuous per-frame formula — this is a one-time establishing dolly
// followed by a small idle sway, not a perpetual drift/arc.
//
// CAMERA_WIDE_POSITION/CAMERA_HERO_POSITION are the artistically-
// approved desktop reference points; getCakeCameraDistanceScale (see
// CakeResponsive.js) is what adapts them per aspect ratio — scaling
// each position's own offset from the look target by that factor
// (equivalent to scaling its distance from the subject while keeping
// the same viewing angle) rather than using the fixed points as-is,
// which read as a tiny, distant cake on narrow mobile portrait
// viewports before this existed.
export default class CakeCamera {
  constructor(camera) {
    this.camera = camera;
    this.time = 0;
    this.swaying = false;
    // The idle-sway anchor update() orbits around every frame — starts
    // at the hero framing and is the thing pullBackToSettled() tweens,
    // so there's only ever one write path to camera.position instead of
    // a separate tween fighting the per-frame sway recomputation.
    this._swayReference = { ...CAMERA_HERO_POSITION };

    const wide = this._scaledPosition(CAMERA_WIDE_POSITION);
    this.camera.position.set(wide.x, wide.y, wide.z);
    this.camera.lookAt(0, CAMERA_LOOK_TARGET_Y, 0);
  }

  _scaledPosition(reference) {
    const scale = getCakeCameraDistanceScale(this.camera);

    return {
      x: reference.x * scale,
      y: CAMERA_LOOK_TARGET_Y + (reference.y - CAMERA_LOOK_TARGET_Y) * scale,
      z: reference.z * scale,
    };
  }

  // Starts the slow dolly-in toward the hero framing — spans roughly
  // the whole formation sequence (see CakeReveal.js's own timeline),
  // not a separate discrete beat, so the camera is already easing
  // closer while the cake is still assembling itself. The hero target
  // is (re-)computed from the CURRENT aspect right as the dolly starts,
  // so it's correct even if the viewport differs from whatever it was
  // at construction time (e.g. resized during the countdown).
  dollyToHero() {
    const hero = this._scaledPosition(CAMERA_HERO_POSITION);

    const tl = gsap.timeline({
      onComplete: () => {
        this.swaying = true;
      },
    });
    this._dollyTimeline = tl;

    tl.to(this.camera.position, {
      x: hero.x,
      y: hero.y,
      z: hero.z,
      duration: CAMERA_DOLLY_DURATION,
      ease: CAMERA_DOLLY_EASE,
      onUpdate: () => this.camera.lookAt(0, CAMERA_LOOK_TARGET_Y, 0),
    });

    return tl;
  }

  // Eases the idle-sway anchor from the hero framing out to the wider
  // settled framing, once the cake has fully revealed and held briefly.
  // Only ever touches this._swayReference, never camera.position
  // directly — update() is the sole place that writes to the camera
  // each frame, so this tween can't fight the sway recomputation below.
  pullBackToSettled() {
    const tl = gsap.timeline();
    this._pullbackTimeline = tl;

    tl.to(this._swayReference, {
      x: CAMERA_SETTLED_POSITION.x,
      y: CAMERA_SETTLED_POSITION.y,
      z: CAMERA_SETTLED_POSITION.z,
      duration: CAMERA_PULLBACK_DURATION,
      ease: CAMERA_DOLLY_EASE,
    });

    return tl;
  }

  // A hair of continuous life once settled — only active after the
  // dolly finishes, so it never fights the dolly's own position tween
  // (both would otherwise write to camera.position the same frame).
  // Re-reads the responsive anchor every frame (cheap — a handful of
  // trig calls) rather than caching it once, so a live resize/
  // orientation-change during the hold still reframes correctly, the
  // same "recompute every frame" convention love/LoveCamera.js's own
  // updateBase() already follows. The anchor itself is
  // this._swayReference rather than the CAMERA_HERO_POSITION constant
  // directly, so pullBackToSettled() smoothly retargets it without any
  // extra branching here.
  update(delta) {
    if (!this.swaying) return;

    this.time += delta;

    // Inlined rather than calling _scaledPosition() (which returns a
    // fresh { x, y, z } object every call) — this runs every single
    // frame for the rest of the experience once the camera settles, so
    // that allocation was a genuine continuous source of GC pressure
    // (see the perf-audit note in StandardBalloons.js's own update() for
    // the same class of fix). Same exact math, just written into plain
    // local numbers instead of a heap-allocated object.
    const scale = getCakeCameraDistanceScale(this.camera);
    const anchorX = this._swayReference.x * scale;
    const anchorY = CAMERA_LOOK_TARGET_Y + (this._swayReference.y - CAMERA_LOOK_TARGET_Y) * scale;
    const anchorZ = this._swayReference.z * scale;
    const sway = Math.sin(this.time * CAMERA_IDLE_SWAY_SPEED) * CAMERA_IDLE_SWAY_AMOUNT;

    this.camera.position.set(anchorX + sway, anchorY, anchorZ);
    this.camera.lookAt(0, CAMERA_LOOK_TARGET_Y, 0);
  }

  destroy() {
    if (this._dollyTimeline) this._dollyTimeline.kill();
    if (this._pullbackTimeline) this._pullbackTimeline.kill();
    this.swaying = false;
  }
}
