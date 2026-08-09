import HeartAnimation from "./HeartAnimation";
import HeartFormation from "./HeartFormation";
import LoveCamera from "./LoveCamera";
import LoveEnvironment from "./LoveEnvironment";
import LoveIntro from "./LoveIntro";
import LoveMessages from "./LoveMessages";
import LoveTransition from "./LoveTransition";
import OrbitSystem from "./OrbitSystem";
import Petals from "./Petals";
import { getParticleScale } from "./Responsive";
import LoveAudio from "./audio/LoveAudio";
import { PhotoStickerOrbit, LOVE_STICKER_PHOTOS } from "./stickers";
import { Envelope } from "./envelope";

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
    this.audio = experience.audio;
    this.canvas = experience.canvas;

    this.loveAudio = new LoveAudio(this.audio);

    // Owned and updated here (not by LoveIntro) because it keeps
    // animating past the intro->main-experience handoff — its black
    // overlay is still fading out for a moment after `this.intro` is
    // gone. LoveIntro only ever calls play() on it.
    this.transition = new LoveTransition({
      scene: this.scene,
      camera: this.camera,
      audio: this.audio,
    });

    this.intro = new LoveIntro(
      this.scene,
      this.camera,
      () => this.beginExperience(),
      this.audio,
      this.transition,
    );
  }

  beginExperience() {
    this.intro = null;

    this.environment = new LoveEnvironment(this.scene);
    this.orbitSystem = new OrbitSystem(this.scene);
    this.loveCamera = new LoveCamera(this.camera);

    this.heartFormation = new HeartFormation(this.scene, this.audio);
    this.heartFormation.begin();

    this.heartAnimation = new HeartAnimation(
      this.heartFormation.particles,
      this.heartFormation.heartTargets,
      this.audio,
    );
    this.heartAnimation.begin();

    // Independent of the heart system — its own scene reference, no
    // shared state with HeartFormation/HeartAnimation.
    this.petals = new Petals(this.scene);

    // A separate ambient layer on top of everything above — its own
    // scene reference, no shared state with anything else.
    this.messages = new LoveMessages(this.scene, this.audio);

    // Orbits user-provided photo memories around the existing ring —
    // see stickers/PhotoStickerOrbit.js. The actual customer photos
    // live in stickers/PhotoStickerAssets.js (createPlaceholderImages,
    // from stickers/PhotoStickerPlaceholders.js, is still available
    // there for testing/fallback); swapping the photo set is just
    // changing what's passed as `images` here, nothing in the
    // subsystem itself.
    this.photoStickerOrbit = new PhotoStickerOrbit({
      scene: this.scene,
      camera: this.camera,
      audio: this.audio,
      canvas: this.canvas,
      images: LOVE_STICKER_PHOTOS,
    });

    // The final stage — rises into the foreground once the stickers
    // have settled (see envelope/EnvelopeConstants.js for the derived
    // timing), and owns its own open sequence + the letter entirely on
    // its own from there. Its only effect on anything else is the
    // "letter:focus" event PhotoStickerOrbit reacts to by itself.
    this.envelope = new Envelope(this.audio);
  }

  update(delta) {
    if (this.intro) {
      this.intro.update(delta);
    } else {
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
      this.photoStickerOrbit.update(delta);
    }

    // Unconditional, on purpose: the transition's black overlay is
    // still fading out for a moment after `this.intro` becomes null and
    // the branch above switches to the main experience — see
    // beginExperience()'s call site inside LoveTransition's own
    // timeline.
    this.transition.update(delta);
  }

  destroy() {
    this.loveAudio.destroy();
    this.transition.destroy();

    if (this.intro) {
      this.intro.destroy();
      return;
    }

    this.environment.destroy();
    this.orbitSystem.destroy();
    this.heartFormation.destroy();
    this.petals.destroy();
    this.messages.destroy();
    this.photoStickerOrbit.destroy();
    this.envelope.destroy();
  }
}
