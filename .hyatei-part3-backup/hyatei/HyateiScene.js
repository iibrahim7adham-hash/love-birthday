import { Color } from "three";

import LoveRain from "./rain/LoveRain";
import NumberParticles from "./number/NumberParticles";
import { HYATEI_BACKGROUND_COLOR, HYATEI_CAMERA_Z } from "./Constants";

// Part 3 — the LOVE-letter/heart rain (LoveRain, Group A) runs for the
// whole scene, untouched by anything else here. On top of it, a
// particle-built sequence (NumberParticles, "3" -> "2" -> "1" -> a big
// explosion -> the word "You") plays once — "You" is the sequence's
// end state and stays on screen, so unlike the rain this is never
// destroyed/removed here; only HyateiScene.destroy() (the whole scene
// tearing down) disposes it. See NumberParticles.js for the sequence.
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
    this.numberParticles.playSequence();
  }

  update(delta) {
    this.loveRain.update(delta);
    if (this.numberParticles) this.numberParticles.update(delta);
  }

  destroy() {
    this.loveRain.destroy();
    if (this.numberParticles) {
      this.scene.remove(this.numberParticles.points);
      this.numberParticles.destroy();
      this.numberParticles = null;
    }
  }
}
