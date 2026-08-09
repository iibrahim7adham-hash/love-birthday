import * as THREE from "three";

import { StandardConfig } from "../content";
import { SceneFlowManager } from "../managers";
import { applyTheme } from "../ui";
import StandardAudio from "../audio/StandardAudio";
import {
  IntroScene,
  CountdownScene,
  CakeBuildScene,
  CelebrationScene,
  BlowCandlesScene,
  CakeTransitionScene,
  MemoriesScene,
} from "../scenes";

// Entry point for the "standard" birthday template. Implements the same
// contract the luxury template's LuxuryScene does — constructor(experience),
// update(delta), destroy() — so Experience/World can drive either template
// identically (see src/engine/core/Experience.js). Everything else about
// how this template is organized internally is its own architecture: a
// SceneFlowManager state machine driving act-scenes in the order
// content/config/flow.js defines, all sharing one `context` object
// instead of one monolithic scene class.
//
// This is also the one place StandardConfig gets assembled into runtime
// behavior — applying the theme, wiring this template's audio cue map,
// seeding the flow order — so every customization in content/ actually
// reaches the scenes without any of them importing config files
// directly.
export default class StandardScene {
  constructor(experience) {
    this.experience = experience;

    this.scene = experience.scene.instance;
    this.camera = experience.camera.instance;

    this.flow = new SceneFlowManager(StandardConfig.flow.order);

    // The shared engine-level AudioManager (see src/engine/audio/ and
    // src/engine/core/Experience.js) — Standard uses the same instance
    // Love/Luxury do, not a bespoke one of its own. StandardAudio is
    // just this template's event->sound map wired into it (see
    // audio/StandardAudioCues.js); scenes below only ever call
    // `context.audio.trigger(event)`, never play a file directly.
    this.standardAudio = new StandardAudio(experience.audio);

    this.context = {
      experience,
      scene: this.scene,
      camera: this.camera,
      config: StandardConfig,
      audio: experience.audio,
      goTo: (name) => this.flow.goTo(name),
      goToNext: () => this.flow.goToNext(),

      // Persistent cross-scene state. Populated and cleared by whichever
      // scene owns that part of the story — see CakeBuildScene,
      // CelebrationScene and CakeTransitionScene.
      cake: null,
      atmosphere: null,
    };

    applyTheme(StandardConfig.theme);

    this.setBackdrop();
    this.registerScenes();

    this.flow.goTo("intro");
  }

  setBackdrop() {
    const { background } = StandardConfig.theme;

    this.scene.background = new THREE.Color(background);
    this.scene.fog = new THREE.Fog(background, 15, 40);

    this.camera.position.set(0, 2.5, 7);
    this.camera.lookAt(0, 1.5, 0);
  }

  registerScenes() {
    this.flow.register("intro", new IntroScene(this.context));
    this.flow.register("countdown", new CountdownScene(this.context));
    this.flow.register("cakeBuild", new CakeBuildScene(this.context));
    this.flow.register("celebration", new CelebrationScene(this.context));
    this.flow.register("blowCandles", new BlowCandlesScene(this.context));
    this.flow.register("transition", new CakeTransitionScene(this.context));
    this.flow.register("memories", new MemoriesScene(this.context));
  }

  update(delta) {
    this.flow.update(delta);
  }

  destroy() {
    this.flow.destroy();
    this.standardAudio.destroy();
  }
}
