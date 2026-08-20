import gsap from "gsap";
import { Color } from "three";

import LoveRain from "./rain/LoveRain";
import NumberParticles from "./number/NumberParticles";
import HeartFormation from "./heart/HeartFormation";
import HeartMessage from "./heart/HeartMessage";
import Hearts3D from "./heart/Hearts3D";
import { HYATEI_BACKGROUND_COLOR, HYATEI_CAMERA_Z } from "./Constants";

// Part 3 — the LOVE-letter/heart rain (LoveRain, Group A) runs for the
// whole scene, untouched by anything else here. On top of it, a
// particle-built sequence (NumberParticles, "3" -> "2" -> "1" -> a big
// explosion -> "You" -> "Are" -> "My" -> "Love" -> disperse -> fade)
// plays once — "Love" fading to nothing is the sequence's current end
// state, so unlike the rain it's never destroyed/removed here; only
// HyateiScene.destroy() (the whole scene tearing down) disposes it. Once
// that sequence finishes, a separate cinematic particle heart
// (HeartFormation, its own ParticleEngine — never touches
// NumberParticles' or LoveRain's) gathers itself from scattered points
// in space and then stays alive on screen (gentle breathing/bobbing).
export default class HyateiScene {
  constructor(experience) {
    this.experience = experience;
    this.scene = experience.scene.instance;
    this.camera = experience.camera.instance;
    this.audio = experience.audio;

    this.create();
  }

  create() {
    this.scene.background = new Color(HYATEI_BACKGROUND_COLOR);

    // A fixed, front-on shot — same rationale as boom/BoomScene.js: the
    // reference is a flat, non-moving composition, so the camera just
    // looks straight at the scene's center.
    this.camera.position.set(0, 0, HYATEI_CAMERA_Z);
    this.camera.lookAt(0, 0, 0);

    const performanceLevel = this.experience.performance?.level ?? "medium";
    const isMobile = this.experience.device?.isMobile ?? false;

    this.loveRain = new LoveRain({ camera: this.camera, performanceLevel });

    this.scene.add(this.loveRain.points);

    this.numberParticles = new NumberParticles({ camera: this.camera, performanceLevel, isMobile });
    this.scene.add(this.numberParticles.points);

    this.heartFormation = new HeartFormation({ camera: this.camera, performanceLevel });
    this.scene.add(this.heartFormation.points);

    this.heartMessage = new HeartMessage();

    this.hearts3D = new Hearts3D({
      scene: this.scene,
      camera: this.camera,
      performanceLevel,
      heartWorldHeight: this.heartFormation.heartWorldHeight,
    });

    this.numberParticles.playSequence(() => {
      if (this.heartFormation) {
        this.heartFormation.playFormation(() => this._onHeartFormed());
      }
    });
  }

  // Once the main particle heart is fully formed: reveal the "I Love
  // You" text, dim (not remove) LoveRain so it's no longer the visual
  // focus, and — a beat later, so the rain's own fade reads first — let
  // the 3D hearts bloom in across the whole frame.
  _onHeartFormed() {
    if (this.heartMessage) this.heartMessage.show();
    if (this.loveRain) this.loveRain.fadeOut();
    gsap.delayedCall(0.6, () => {
      if (this.hearts3D) this.hearts3D.playIn();
    });
  }

  update(delta) {
    this.loveRain.update(delta);
    if (this.numberParticles) this.numberParticles.update(delta);
    if (this.heartFormation) this.heartFormation.update(delta);
    if (this.hearts3D) this.hearts3D.update(delta);
  }

  destroy() {
    this.loveRain.destroy();
    if (this.numberParticles) {
      this.scene.remove(this.numberParticles.points);
      this.numberParticles.destroy();
      this.numberParticles = null;
    }
    if (this.heartFormation) {
      this.scene.remove(this.heartFormation.points);
      this.heartFormation.destroy();
      this.heartFormation = null;
    }
    if (this.heartMessage) {
      this.heartMessage.destroy();
      this.heartMessage = null;
    }
    if (this.hearts3D) {
      this.hearts3D.destroy();
      this.hearts3D = null;
    }
  }
}
