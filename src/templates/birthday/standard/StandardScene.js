import * as THREE from "three";

import StartScreen from "./StartScreen";
import Countdown from "./Countdown";
import BirthdayMessage from "./BirthdayMessage";
import CakeReveal from "./cake/CakeReveal";
import BirthdayReveal from "./BirthdayReveal";
import StandardFireworks from "./StandardFireworks";
import StandardCandleBlowout from "./StandardCandleBlowout";
import StandardBalloons from "./StandardBalloons";
import StandardFloatingText from "./StandardFloatingText";
import StandardAmbientAtmosphere from "./StandardAmbientAtmosphere";
import StandardAudio from "./audio/StandardAudio";
import { STANDARD_BACKGROUND_COLOR } from "./Constants";

// Scene composition only — the same role Love/Luxury's own top-level
// scene classes play (see love/LoveScene.js, luxury/Scene/LuxuryScene.js).
// This is a brand-new template: nothing below reuses the old Standard
// implementation's cake/candles/celebration code or Love's heart visual
// language. Step 1 (StartScreen), Step 2 (Countdown), a short
// "Happy Birthday" moment (BirthdayMessage), Step 3 (CakeReveal), and the
// celebration stage (BirthdayReveal + StandardFireworks) are built.
// Unlike every earlier stage, the celebration stage has no onComplete/
// next-stage seam — once started it just keeps running for as long as
// the scene exists, the same way CakeReveal's own candle flicker keeps
// going indefinitely after its own reveal completes. Whatever comes
// after (photos, a final reveal...) doesn't exist yet — that's the next
// design pass.
export default class StandardScene {
  constructor(experience) {
    this.experience = experience;

    this.scene = experience.scene.instance;
    this.camera = experience.camera.instance;
    this.audio = experience.audio;

    this.countdown = null;
    this.birthdayMessage = null;
    this.cakeReveal = null;
    this.birthdayReveal = null;
    this.fireworks = null;
    this.candleBlowout = null;
    this.balloons = null;
    this.floatingText = null;
    this.ambientAtmosphere = null;

    this.create();
  }

  create() {
    this.scene.background = new THREE.Color(STANDARD_BACKGROUND_COLOR);

    this.standardAudio = new StandardAudio(this.audio);

    // Constructed once, here, and never destroyed until this whole
    // scene tears down — see StandardAmbientAtmosphere.js's own
    // top-of-file comment. StartScreen only drives its entrance fade-in/
    // press bloom; it doesn't own or destroy it.
    this.ambientAtmosphere = new StandardAmbientAtmosphere();

    this.startScreen = new StartScreen(this.audio, () => this._advanceToNextStage(), this.ambientAtmosphere);
  }

  // The seam Step 1's START hands off to — the real countdown.
  // Guarded so this can only ever run once even if something upstream
  // misbehaves; StartScreen's own state guard already prevents a
  // second press from firing this twice, so this is defense in depth,
  // not the primary safeguard.
  _advanceToNextStage() {
    if (this.countdown) return;

    this.countdown = new Countdown(this.audio, () => this._enterBirthdayMessage());
  }

  // The seam Countdown's own completion hands off to — the short
  // "Happy Birthday" moment. Same double-entry guard as above.
  _enterBirthdayMessage() {
    if (this.birthdayMessage) return;

    this.birthdayMessage = new BirthdayMessage(this.audio, () => this._enterCakeReveal());
  }

  // The seam BirthdayMessage's own completion hands off to — the real
  // cake reveal. Same double-entry guard as above.
  _enterCakeReveal() {
    if (this.cakeReveal) return;

    this.cakeReveal = new CakeReveal({
      scene: this.scene,
      camera: this.camera,
      audio: this.audio,
      onComplete: () => this._enterCelebrationStage(),
    });
  }

  // The seam CakeReveal's own completion hands off to — BirthdayReveal
  // (the "Happy Birthday" / "to You" typography moment), the ambient
  // StandardFireworks, and StandardCandleBlowout (the "blow out the
  // candles" button + its own cinematic hand-off into
  // StandardFireworks.js's own playCinematicSequence()). Same
  // double-entry guard as above. This only ever fires once CakeReveal's
  // own master timeline has fully finished — cake formation AND the
  // camera's own pullback both already settled — so every one of these
  // stages' own internal entrance delays genuinely start counting from a
  // stable composition, never before. The cake stays visible behind all
  // three: unlike StartScreen/Countdown/BirthdayMessage, CakeReveal never
  // removes itself, since it's meant to remain the scene's hero object
  // for every stage after it, these included. StandardCandleBlowout is
  // given direct references to the already-built `cakeReveal` and
  // `fireworks` instances rather than re-deriving/duplicating any of
  // their own machinery.
  _enterCelebrationStage() {
    if (this.fireworks) return;

    this.birthdayReveal = new BirthdayReveal(this.audio);
    this.fireworks = new StandardFireworks(this.scene, this.camera, this.audio);
    this.balloons = new StandardBalloons(this.scene, this.camera);
    this.floatingText = new StandardFloatingText();
    this.candleBlowout = new StandardCandleBlowout({
      cakeReveal: this.cakeReveal,
      fireworks: this.fireworks,
      balloons: this.balloons,
      floatingText: this.floatingText,
      audio: this.audio,
    });
  }

  update(delta) {
    // StartScreen/Countdown/StandardFireworks all animate entirely
    // through GSAP's own ticker, independent of this per-frame call.
    // CakeReveal and StandardBalloons are the Standard stages that
    // actually need one, for candle flicker/camera idle sway and the
    // balloons' own continuous rise — see each one's own update().
    if (this.cakeReveal) this.cakeReveal.update(delta);
    if (this.balloons) this.balloons.update(delta);
  }

  destroy() {
    if (this.startScreen) this.startScreen.destroy();
    if (this.countdown) this.countdown.destroy();
    if (this.birthdayMessage) this.birthdayMessage.destroy();
    if (this.cakeReveal) this.cakeReveal.destroy();
    if (this.birthdayReveal) this.birthdayReveal.destroy();
    if (this.fireworks) this.fireworks.destroy();
    if (this.candleBlowout) this.candleBlowout.destroy();
    if (this.balloons) this.balloons.destroy();
    if (this.floatingText) this.floatingText.destroy();
    if (this.ambientAtmosphere) this.ambientAtmosphere.destroy();

    this.standardAudio.destroy();
  }
}
