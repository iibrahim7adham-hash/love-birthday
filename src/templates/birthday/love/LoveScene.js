import HeartAnimation from "./HeartAnimation";
import HeartFormation from "./HeartFormation";
import LoveCamera from "./LoveCamera";
import LoveEnvironment from "./LoveEnvironment";
import LoveIntro from "./LoveIntro";
import LoveMessages from "./LoveMessages";
import OrbitSystem from "./OrbitSystem";
import Petals from "./Petals";
import { getParticleScale } from "./Responsive";

// Scene composition only — each piece owns its own construction/update/
// destroy; this class just wires them to the shared scene/camera,
// starts whatever needs starting, and forwards the engine's
// update/destroy calls. The existing experience (heart, orbit, petals,
// messages, camera) doesn't exist yet when the scene is first entered
// — only LoveIntro does. beginExperience() is what LoveIntro's
// completion callback runs once, and only once, after its own UI has
// fully faded out.
export default class LoveScene {
  constructor(experience) {
    this.scene = experience.scene.instance;
    this.camera = experience.camera.instance;

    this.intro = new LoveIntro(this.scene, this.camera, () =>
      this.beginExperience(),
    );
  }

  beginExperience() {
    this.intro = null;

    this.environment = new LoveEnvironment(this.scene);
    this.orbitSystem = new OrbitSystem(this.scene);
    this.loveCamera = new LoveCamera(this.camera);

    this.heartFormation = new HeartFormation(this.scene);
    this.heartFormation.begin();

    this.heartAnimation = new HeartAnimation(
      this.heartFormation.particles,
      this.heartFormation.heartTargets,
    );
    this.heartAnimation.begin();

    // Independent of the heart system — its own scene reference, no
    // shared state with HeartFormation/HeartAnimation.
    this.petals = new Petals(this.scene);

    // A separate ambient layer on top of everything above — its own
    // scene reference, no shared state with anything else.
    this.messages = new LoveMessages(this.scene);
  }

  update(delta) {
    if (this.intro) {
      this.intro.update(delta);
      return;
    }

    this.environment.update(delta);
    this.orbitSystem.update(delta);
    this.loveCamera.update(delta);

    // HeartAnimation sets this frame's targets before HeartFormation
    // steps the particle engine's physics toward them.
    this.heartAnimation.update(delta);
    this.heartFormation.update(delta);

    // LoveParticles' own setPointScale() already existed (Stage 2) for
    // exactly this — only the value fed into it is new.
    this.heartFormation.particles.setPointScale(getParticleScale(this.camera));

    this.petals.update(delta);
    this.messages.update(delta);
  }

  destroy() {
    if (this.intro) {
      this.intro.destroy();
      return;
    }

    this.environment.destroy();
    this.orbitSystem.destroy();
    this.heartFormation.destroy();
    this.petals.destroy();
    this.messages.destroy();
  }
}
