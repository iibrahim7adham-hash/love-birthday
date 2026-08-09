import gsap from "gsap";
import * as THREE from "three";

import { CAMERA_LOOK_TARGET_Y } from "./Constants";

// How much of the remaining distance to the look target the camera
// closes at the push's peak — small on purpose, a nudge, not a dolly.
const CAMERA_PUSH_FRACTION = 0.2;

// The cinematic hand-off from LoveIntro to the main experience: a slow
// camera push toward the scene's center while the intro quietly fades
// to black, a short breath of near-total darkness, then the main
// experience is revealed from that same darkness. No colored overlay,
// no expanding shape — just a plain black fade, the way a real scene
// transition would cut.
//
// Owns its own timing, the camera push, the black overlay, the UI
// dissolve, and its own cleanup — LoveIntro only ever calls play(),
// LoveScene only ever calls update()/destroy().
//
// Reuses the existing scene/camera/render loop throughout: no second
// renderer, no second scene, no separate animation loop. The camera
// push nudges the same shared camera every frame from update(); the
// black fade is a single plain DOM overlay (the same technique
// LoveIntro's own UI already uses), not a 3D object.
export default class LoveTransition {
  constructor({ scene, camera, audio }) {
    this.scene = scene;
    this.camera = camera;
    this.audio = audio;

    this.playing = false;

    // Only true while the intro's own camera composition is still what
    // should be pushed toward center — cleared the instant the scene
    // swaps, so the push never touches the main experience's own fresh
    // camera framing.
    this._pushingCamera = false;

    // A fixed world point, not a live reference to any LoveCamera
    // instance — CAMERA_LOOK_TARGET_Y is the same constant every
    // LoveCamera already looks at, so this needs no per-play() setup
    // and no cleanup.
    this._pushTarget = new THREE.Vector3(0, CAMERA_LOOK_TARGET_Y, 0);

    // Scratch vector, reused every frame — never reallocated in update().
    this._tmpVec = new THREE.Vector3();

    // A plain tweened number, not a Three.js object — GSAP ramps this
    // 0->1 over the push's duration; update() reads it every frame to
    // decide how hard to nudge the camera that frame.
    this._cameraPushProgress = { value: 0 };

    // A plain black div layered over the canvas — pure opacity, no
    // color shift, no shape, no scale. The standard film "fade to
    // black" technique, not a scene effect.
    this.overlay = document.createElement("div");
    this.overlay.style.cssText =
      "position:fixed; inset:0; z-index:999; background:#000000; opacity:0; pointer-events:none;";
    document.body.appendChild(this.overlay);
  }

  // `onComplete` fires once the overlay is fully opaque and has held
  // for a short beat — the moment it's safe (invisible) to swap the
  // intro's world for the real one. The transition keeps playing
  // afterward, fading the overlay back out to reveal what's underneath,
  // and cleans itself up once that finishes.
  play({ yesButton, uiElement, noButton, onComplete }) {
    if (this.playing) return;
    this.playing = true;
    this._pushingCamera = true;

    this.audio.trigger("transition:start");

    this.overlay.style.opacity = "0";

    const tl = gsap.timeline();
    this._timeline = tl;

    // 0.0-0.1s — press. Exactly the existing button feedback.
    tl.to(yesButton, { scale: 0.94, duration: 0.1, ease: "power2.out" }, 0);

    // 0.1-0.4s — release, its own glow intensifies. Exactly the
    // existing button feedback.
    tl.to(
      yesButton,
      {
        scale: 1.15,
        boxShadow:
          "0 0 55px rgba(255, 182, 209, 1), 0 0 110px rgba(255, 143, 190, 0.85)",
        duration: 0.3,
        ease: "power2.out",
      },
      0.1,
    );

    // 0.2-1.2s — UI dissolves rather than cutting.
    tl.to(
      uiElement,
      { opacity: 0, filter: "blur(10px)", duration: 1.0, ease: "power2.in" },
      0.2,
    );
    if (noButton) {
      tl.to(noButton, { opacity: 0, filter: "blur(10px)", duration: 0.9, ease: "power2.in" }, 0.25);
    }

    // 0.0-2.0s — the world quietly fades to black. Slow to start,
    // accelerating into full darkness rather than a linear dim.
    tl.to(this.overlay, { opacity: 1, duration: 2.0, ease: "power2.in" }, 0);

    // 0.0-2.0s — camera eases toward the scene's center the whole time,
    // growing more noticeable as the screen darkens.
    tl.to(this._cameraPushProgress, { value: 1, duration: 2.0, ease: "sine.inOut" }, 0);

    // ~2.0-2.1s — a short breath of near-total darkness before the cut.
    tl.call(
      () => {
        this._pushingCamera = false;
        onComplete();
      },
      null,
      2.1,
    );

    // 2.1-3.0s — gently reveal the new scene from darkness.
    tl.to(this.overlay, { opacity: 0, duration: 0.9, ease: "power2.out" }, 2.1);

    tl.call(() => this._finish(), null, 3.0);
  }

  update() {
    if (!this._pushingCamera) return;

    const push = this._cameraPushProgress.value * CAMERA_PUSH_FRACTION;
    if (push <= 0) return;

    this._tmpVec.copy(this._pushTarget).sub(this.camera.position);
    this.camera.position.addScaledVector(this._tmpVec, push);
  }

  _finish() {
    this.playing = false;
    this._pushingCamera = false;
    this._cameraPushProgress.value = 0;
    this.overlay.remove();

    this.audio.trigger("transition:complete");
  }

  // Safe to call at any time, mid-flight or after a normal finish.
  destroy() {
    if (this._timeline) this._timeline.kill();
    gsap.killTweensOf(this._cameraPushProgress);

    this.playing = false;
    this._pushingCamera = false;

    this.overlay.remove();
  }
}
