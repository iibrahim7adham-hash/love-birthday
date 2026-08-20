import * as THREE from "three";

import BoomAudio from "./audio/BoomAudio";
import BombIntro from "./bomb/BombIntro";
import HeartBurst from "./heartburst/HeartBurst";
import Reveal from "./reveal/Reveal";
import GiftBox from "./giftbox/GiftBox";
import { GIFTBOX_START_AT } from "./giftbox/GiftBoxConstants";
import {
  BOOM_BACKGROUND_CENTER_COLOR,
  BOOM_BACKGROUND_EDGE_COLOR,
  BOOM_CAMERA_Z,
  BOOM_MIN_VERTICAL_FOV,
} from "./Constants";

// Scene composition only — the same role every other template's own
// top-level scene class plays (see standard/StandardScene.js,
// love/LoveScene.js, luxury/Scene/LuxuryScene.js). Registered in
// engine/core/Experience.js's own TEMPLATES map as "boom".
//
// PART 1 + PART 2 + PART 3 + PART 5: the pink panel, the bomb's own
// entry -> roll -> settle -> cap -> fuse -> ignite -> anticipation ->
// pre-explosion hold (bomb/BombIntro.js, locked), the heart burst that
// takes over once BombIntro signals it's ready (heartburst/
// HeartBurst.js, locked) — hearts stay scattered and gently drifting
// afterward, never gathering into a shape — the romantic
// title/subtitle reveal that starts at the same moment (reveal/
// Reveal.js), and — once that reveal has had time to be read — the
// closed gift box fading in (giftbox/GiftBox.js). Each system stays
// independent; the only coupling is this class's own update() below,
// which polls BombIntro's own flag to fire HeartBurst/Reveal, then
// tracks elapsed time since that moment to show the gift box.
export default class BoomScene {
  constructor(experience) {
    this.experience = experience;

    this.scene = experience.scene.instance;
    this.camera = experience.camera.instance;
    this.audio = experience.audio;

    this._explosionTriggered = false;
    this._explosionElapsed = 0;
    this._giftBoxShown = false;

    this.create();
  }

  create() {
    this.scene.background = this._createBackgroundTexture();

    // A fixed, front-on shot — the reference never moves its camera, so
    // this is a plain static position, not a choreographed rig.
    this.camera.position.set(0, 0, BOOM_CAMERA_Z);
    this.camera.lookAt(0, 0, 0);
    this._enforceMinVerticalFov();

    this.boomAudio = new BoomAudio(this.audio);

    this.bombIntro = new BombIntro({ scene: this.scene, audio: this.audio });
    this.heartBurst = new HeartBurst({ scene: this.scene, camera: this.camera, audio: this.audio });
    this.reveal = new Reveal(this.camera);
    this.giftBox = new GiftBox({
      scene: this.scene,
      camera: this.camera,
      canvas: this.experience.canvas,
      heartField: this.heartBurst.heartField,
    });
  }

  // engine/camera/Camera.js's own resize() runs on every window resize
  // and can drop the vertical fov it computes below this floor on a
  // wide/short viewport (see Constants.js's own BOOM_MIN_VERTICAL_FOV
  // comment) — there's no per-template resize hook to catch that
  // exactly when it happens (Experience.js's own resize() only calls
  // camera.resize()/renderer.resize()), so this re-checks every frame
  // instead. The comparison is trivial and updateProjectionMatrix() only
  // runs on the rare frame right after a resize actually pushed fov
  // below the floor, not continuously.
  _enforceMinVerticalFov() {
    if (this.camera.fov >= BOOM_MIN_VERTICAL_FOV) return;

    this.camera.fov = BOOM_MIN_VERTICAL_FOV;
    this.camera.updateProjectionMatrix();
  }

  // A very subtle radial vignette (lighter center, a touch deeper pink
  // at the edges) — the same "cache a canvas drawing, use it as a
  // texture" technique standard/cake/AtmosphereTextures.js already
  // establishes, just for the whole-scene backdrop instead of a small
  // sprite. Generated once; scene.background accepts a Texture directly,
  // so no extra plane/geometry is needed for it. HeartBurst takes over
  // regenerating this same scene.background once it ignites (see its
  // own _applyBackground()) — this is only Part 1's resting state.
  _createBackgroundTexture() {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, BOOM_BACKGROUND_CENTER_COLOR);
    gradient.addColorStop(1, BOOM_BACKGROUND_EDGE_COLOR);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    return new THREE.CanvasTexture(canvas);
  }

  update(delta) {
    this._enforceMinVerticalFov();

    // BombIntro needs its own per-frame tick now too — the fuse-tip
    // flame's continuous flicker is procedural (see bomb/FuseFlame.js),
    // not GSAP-tween-driven, so it has to be pumped every frame the
    // same way HeartBurst already is below. Skipped entirely once
    // BombIntro marks itself finished (bomb/fuse hidden, nothing left
    // to animate) rather than ticking dead work forever.
    if (!this.bombIntro.finished) this.bombIntro.update(delta);

    // The one and only coupling point: once BombIntro's own timeline
    // reaches its final pre-explosion hold, hand off to HeartBurst and
    // Reveal exactly once, side by side.
    if (!this._explosionTriggered && this.bombIntro.readyForExplosion) {
      this._explosionTriggered = true;
      this.heartBurst.ignite(this.bombIntro.bomb);
      this.reveal.show();
    }

    this.heartBurst.update(delta);
    this.giftBox.update(delta);

    // The gift box fades in a fixed offset after that same moment (see
    // GiftBoxConstants.js's own GIFTBOX_START_AT comment) — tracked
    // here rather than inside HeartBurst/Reveal themselves, so neither
    // of those locked/untouched systems needs to know GiftBox exists.
    if (this._explosionTriggered && !this._giftBoxShown) {
      this._explosionElapsed += delta;
      if (this._explosionElapsed >= GIFTBOX_START_AT) {
        this._giftBoxShown = true;
        this.giftBox.show();
      }
    }
  }

  destroy() {
    this.bombIntro.destroy();
    this.heartBurst.destroy();
    this.reveal.destroy();
    this.giftBox.destroy();
    this.boomAudio.destroy();

    if (this.scene.background) {
      this.scene.background.dispose();
      this.scene.background = null;
    }
  }
}
