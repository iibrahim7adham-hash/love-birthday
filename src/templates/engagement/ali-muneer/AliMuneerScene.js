import * as THREE from "three";

import Background from "./Background";
import PageFrame from "./PageFrame";
import SparkleField from "./SparkleField";
import Opening from "./Opening";
import Envelope from "./envelope/Envelope";
import Hero from "./hero/Hero";
import EventDetails from "./eventdetails/EventDetails";
import Countdown from "./countdown/Countdown";
import VenueMap from "./venuemap/VenueMap";
import RSVP from "./rsvp/RSVP";
import AliMuneerAudio from "./audio/AliMuneerAudio";
import { ALI_MUNEER_BACKGROUND_COLOR, ALI_MUNEER_CAMERA_Z } from "./Constants";

// Scene composition only — the same role every other template's own
// top-level scene class plays (see boom/BoomScene.js, love/LoveScene.js,
// standard/StandardScene.js). Registered in engine/core/Experience.js's
// own TEMPLATES map as "ali-muneer". Background (leaves/marble corners/
// sparkles) is constructed once and lives for the whole scene, so it
// stays visible and unchanged across the Scene 1 -> Scene 2 handoff;
// Opening (the Bismillah) plays on top of it and fades itself out, then
// Scene 2 (Envelope, a DOM+CSS overlay — see envelope/Envelope.js)
// fades in, still over the same Background.
export default class AliMuneerScene {
  constructor(experience) {
    this.experience = experience;

    this.scene = experience.scene.instance;
    this.camera = experience.camera.instance;
    this.audio = experience.audio;

    this.pageFrame = null;
    this.sparkleField = null;
    this.opening = null;
    this.envelope = null;
    this.hero = null;
    this.eventDetails = null;
    this.countdown = null;
    this.venueMap = null;
    this.rsvp = null;
    this.audioCues = null;

    this.create();
  }

  create() {
    // The template's entire audio surface — currently just the
    // envelope's own "card:open" cue (see envelope/Envelope.js's
    // _handleOpen and audio/AliMuneerAudioCues.js). Constructed once,
    // up front, alongside every other template's own <Name>Audio (see
    // love/LoveScene.js) so it's already subscribed before the
    // envelope can fire that event.
    this.audioCues = new AliMuneerAudio(this.audio);

    this.scene.background = new THREE.Color(ALI_MUNEER_BACKGROUND_COLOR);

    this.camera.position.set(0, 0, ALI_MUNEER_CAMERA_Z);
    this.camera.lookAt(0, 0, 0);

    this._enableScroll();

    this.background = new Background();
    // Same fixed -> absolute scroll fix as the canvas above (see
    // _enableScroll), applied to the decorative Background layer too —
    // it's only meant to frame the Hero screen, not persist, pinned,
    // behind every section for the whole scroll.
    // Background.css sets `inset: 0` (top/right/bottom/left all 0) for
    // its `fixed` default — leaving `bottom: 0` in place after this
    // switch to `absolute` would stretch the element from the very top
    // of the document all the way to the very bottom of the whole
    // scrollable page (its containing block once no longer fixed to
    // the viewport), instead of just Hero's own one-screen height. So
    // `bottom` is explicitly cleared and an explicit `100dvh` height
    // takes over sizing it, same "one viewport tall" footprint it had
    // as a fixed element.
    this.background.element.style.position = "absolute";
    this.background.element.style.top = "0";
    this.background.element.style.bottom = "auto";
    this.background.element.style.height = "100vh";
    this.background.element.style.height = "100dvh";
    this.opening = new Opening(() => this._beginEnvelope());

    // Fixed to the viewport (not the Background layer above, which
    // switches to `absolute` and scrolls away with Hero) so the frame
    // stays flush with the screen edges through the whole scene,
    // Opening/Envelope included.
    this.pageFrame = new PageFrame();

    // Same fixed-to-viewport treatment as the frame above — a
    // continuous, purely-CSS-animated ambience that persists
    // regardless of scroll or which scene (Opening/Envelope/Hero/...)
    // is currently showing.
    this.sparkleField = new SparkleField();
  }

  // The rest of the app (src/style.css) locks html/body to
  // `overflow: hidden` since every other template's own scenes are
  // fixed, full-viewport overlays with nothing to scroll to. This
  // template now has a real second section (Event Details, below
  // Hero), so scrolling needs to be turned on — scoped to this scene's
  // own lifetime via inline styles (reverted in destroy()) rather than
  // editing that shared global stylesheet, so no other template is
  // affected. The WebGL canvas/renderer size off window.innerWidth/
  // innerHeight (see engine/core/Sizes.js), not document scroll height,
  // so it stays completely unaffected by this.
  //
  // `canvas.webgl` (src/style.css) and #ali-muneer-background
  // (Background.css) are both `position: fixed` by default, which is
  // fine for every other template (nothing ever scrolls there) but
  // caused a real bug here: a `position: fixed` WebGL canvas sitting
  // behind *scrollable* content gets its own compositor layer that
  // mobile/headless browsers frequently fail to repaint in sync with a
  // fast or programmatic scroll, flashing the canvas's raw (black)
  // clear color through for a frame right where the Hero copy sits —
  // the "dark block" seen at the Hero/Event-Details seam. Switching
  // both to `position: absolute` (still `top: 0`, still sized to one
  // viewport, see Background.css/style.css) removes them from that
  // fixed-layer scroll path entirely: they scroll away with the page
  // exactly like Hero itself does, and every section below (Event
  // Details, Venue & Map, ...) already paints its own opaque ivory
  // background anyway, so nothing relies on the canvas showing through
  // once scrolled past Hero. Reverted in destroy() along with the
  // overflow toggles above.
  _enableScroll() {
    document.documentElement.style.height = "auto";
    document.documentElement.style.overflowY = "auto";
    document.documentElement.style.background = ALI_MUNEER_BACKGROUND_COLOR;
    document.body.style.height = "auto";
    document.body.style.overflowY = "auto";
    // src/style.css's shared html/body background is #000 (the other,
    // dark-themed templates rely on it as their canvas backdrop) — this
    // template's own sections all paint an opaque cream background, but
    // that black would otherwise flash through any gap or overscroll
    // edge — including before Hero mounts (Opening/Envelope stage),
    // when body has no in-flow content yet and its own background box
    // is effectively zero-height, leaving `html`'s background as what
    // actually shows. Both are set here so neither can leak black.
    // Scoped to this scene's lifetime, reverted in _disableScroll, so no
    // other template is affected.
    document.body.style.background = ALI_MUNEER_BACKGROUND_COLOR;

    const canvas = document.querySelector("canvas.webgl");
    if (canvas) {
      canvas.style.position = "absolute";
      canvas.style.top = "0";
    }
  }

  _disableScroll() {
    document.documentElement.style.height = "";
    document.documentElement.style.overflowY = "";
    document.documentElement.style.background = "";
    document.body.style.height = "";
    document.body.style.overflowY = "";
    document.body.style.background = "";

    const canvas = document.querySelector("canvas.webgl");
    if (canvas) {
      canvas.style.position = "";
      canvas.style.top = "";
    }
  }

  _beginEnvelope() {
    this.opening = null;
    this.envelope = new Envelope(() => this._beginHero(), this.audio);
  }

  // Scene 3 — only constructed once the envelope's own dismiss
  // transition (move away + fade out) has fully finished, per its
  // onDismissed contract (see envelope/Envelope.js). Background stays
  // alive and unchanged underneath, same as every prior handoff.
  // Scene 4 (Event Details), Scene 5 (Countdown), Scene 6 (Venue & Map)
  // and Scene 7 (RSVP) are constructed right alongside it — all plain
  // document-flow sections beneath Hero, not gated on their own
  // separate triggers, so they're always present and reachable by
  // scrolling as soon as Hero is.
  _beginHero() {
    this.hero = new Hero();
    this.eventDetails = new EventDetails();
    this.countdown = new Countdown();
    this.venueMap = new VenueMap();
    this.rsvp = new RSVP();
  }

  update(delta) {
    if (this.background) this.background.update(delta);
    if (this.opening) this.opening.update(delta);
    if (this.envelope) this.envelope.update(delta);
    if (this.hero) this.hero.update(delta);
    if (this.eventDetails) this.eventDetails.update(delta);
    if (this.countdown) this.countdown.update(delta);
    if (this.venueMap) this.venueMap.update(delta);
    if (this.rsvp) this.rsvp.update(delta);
  }

  destroy() {
    if (this.background) this.background.destroy();
    if (this.pageFrame) this.pageFrame.destroy();
    if (this.sparkleField) this.sparkleField.destroy();
    if (this.opening) this.opening.destroy();
    if (this.envelope) this.envelope.destroy();
    if (this.hero) this.hero.destroy();
    if (this.eventDetails) this.eventDetails.destroy();
    if (this.countdown) this.countdown.destroy();
    if (this.venueMap) this.venueMap.destroy();
    if (this.rsvp) this.rsvp.destroy();
    if (this.audioCues) this.audioCues.destroy();

    this._disableScroll();
  }
}
