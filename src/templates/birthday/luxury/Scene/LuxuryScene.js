import * as THREE from "three";

import BlackHole from "../Transition/BlackHole";
import IntroCamera from "../Animation/IntroCamera";
import Environment from "../Environment";
import LuxuryAudio from "../audio/LuxuryAudio";

export default class LuxuryScene {
  constructor(experience) {
    this.experience = experience;

    this.scene = experience.scene.instance;
    this.camera = experience.camera.instance;

    this.onIntroYes = this.onIntroYes.bind(this);

    this.create();
  }

  create() {
    this.introCamera = new IntroCamera(this.camera);

    this.scene.background = new THREE.Color(0x03030a);

    this.scene.fog = new THREE.Fog(0x03030a, 20, 70);

    this.environment = new Environment(this.scene);

    this.blackHole = new BlackHole(this.scene, this.camera);

    this.luxuryAudio = new LuxuryAudio(this.experience.audio);

    window.addEventListener("intro:yes", this.onIntroYes);
  }

  onIntroYes() {
    // Scene 2 owns the camera fully, starting from wherever it already is —
    // its own Phase 1 requires the camera to stay almost still, which the
    // old intro pan would fight with.
    this.triggerBlackHole();
  }

  triggerBlackHole() {
    this.experience.audio.trigger("transition:start");
    this.blackHole.play();
  }

  update(delta) {
    this.environment.update(delta);

    if (this.blackHole.update) {
      this.blackHole.update(delta);
    }
  }

  destroy() {
    window.removeEventListener("intro:yes", this.onIntroYes);

    this.luxuryAudio.destroy();
    this.environment.destroy();
  }
}
