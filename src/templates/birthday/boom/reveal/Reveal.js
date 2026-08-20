import gsap from "gsap";

import "./Reveal.css";
import {
  REVEAL_TITLE,
  REVEAL_SUBTITLE,
  REVEAL_TEXT_COLOR,
  REVEAL_HEART_COLOR,
  REVEAL_GLOW_COLOR,
  REVEAL_FADE_START_AT,
  REVEAL_FADE_IN_DURATION,
  REVEAL_SCRIM_START_AT,
  REVEAL_SCRIM_DURATION,
  REVEAL_SCRIM_PEAK_OPACITY,
} from "./RevealConstants";
import { GATHER_HEART_WIDTH } from "../gather/GatherConstants";
import { GIFTBOX_START_AT } from "../giftbox/GiftBoxConstants";

// Part 3's entire visual surface: the title + subtitle fading in over
// the settled heart field, plus a background scrim that gradually dims
// behind them so the hearts read as "less prominent" over time —
// without this file (or anything else) ever touching HeartBurst's own
// particles/colors/motion (see RevealConstants.js's own comment). A
// DOM+CSS overlay, the same pattern every other template's own text
// (StartScreen.js, BirthdayMessage.js, BirthdayReveal.js, ...) already
// uses in this project — not Three.js text geometry.
//
// Constructed once by BoomScene.js, alongside BombIntro/HeartBurst;
// stays inert (opacity: 0, see Reveal.css) until show() is called at
// the same moment HeartBurst itself ignites, so its own internal
// delays (see RevealConstants.js) are relative to that shared moment.
// A single small outlined heart, reused above the box and inside the
// divider (just scaled differently via CSS) — kept as one inline path
// rather than an icon font/image dependency, matching the deliberately
// minimal "no complicated ornaments" brief this screen redesign asked for.
const HEART_OUTLINE_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"><path d="M12 20.5s-7-4.6-9.8-9C.6 8.2 2.2 4.6 6 4.6c2.2 0 3.9 1.3 6 3.6 2.1-2.3 3.8-3.6 6-3.6 3.8 0 5.4 3.6 3.8 6.9-2.8 4.4-9.8 9-9.8 9z"/></svg>';

export default class Reveal {
  constructor(camera) {
    this.camera = camera;

    this.element = document.createElement("div");
    this.element.id = "boom-reveal";
    this.element.innerHTML = `
      <div id="boom-reveal-scrim"></div>
      <div class="boom-reveal-card">
        <div class="boom-reveal-heart-top">${HEART_OUTLINE_SVG}</div>
        <div class="boom-reveal-box">
          <h1 class="boom-reveal-title" dir="rtl" lang="ar">${REVEAL_TITLE}</h1>
          <div class="boom-reveal-divider">
            <span class="boom-reveal-divider-line"></span>
            <span class="boom-reveal-divider-heart">${HEART_OUTLINE_SVG}</span>
            <span class="boom-reveal-divider-line"></span>
          </div>
          <p class="boom-reveal-subtitle">${REVEAL_SUBTITLE}</p>
        </div>
      </div>
    `;
    this.element.style.setProperty("--boom-reveal-glow", REVEAL_GLOW_COLOR);
    document.body.appendChild(this.element);

    this.scrim = this.element.querySelector("#boom-reveal-scrim");
    this.card = this.element.querySelector(".boom-reveal-card");
    this.title = this.element.querySelector(".boom-reveal-title");
    this.subtitle = this.element.querySelector(".boom-reveal-subtitle");
    this.hearts = this.element.querySelectorAll(".boom-reveal-heart-top, .boom-reveal-divider-heart");

    this.title.style.color = REVEAL_TEXT_COLOR;
    this.subtitle.style.color = REVEAL_TEXT_COLOR;
    this.hearts.forEach((heart) => {
      heart.style.color = REVEAL_HEART_COLOR;
    });

    this._shown = false;

    this._syncHeartScale();
    this._onResize = () => this._syncHeartScale();
    window.addEventListener("resize", this._onResize);
  }

  // Converts the SAME fixed world-space heart width Gather.js's own
  // particles target (GATHER_HEART_WIDTH) into actual on-screen CSS
  // pixels, using the shared camera's own live fov/aspect/position —
  // the identical "read the camera live, don't hardcode" technique
  // heartburst/HeartField.js's own _getVisibleBounds() already
  // established, applied here so the text (see Reveal.css) can size
  // itself directly off the heart's REAL rendered width instead of an
  // independent vw-based guess. A plain vw clamp() drifts out of
  // proportion with the heart on narrower aspect ratios — the shared
  // Camera intentionally holds HORIZONTAL fov constant (so the heart's
  // own on-screen width stays a fixed fraction of viewport width on
  // every device, see GatherConstants.js's own GATHER_HEART_WIDTH
  // comment) while vertical fov (and therefore how "zoomed out" the
  // scene reads) changes with aspect — vw alone has no way to know
  // that, only this same camera math does.
  _syncHeartScale() {
    const distance = Math.abs(this.camera.position.z);
    const verticalHalfFovRad = (this.camera.fov / 2) * (Math.PI / 180);
    const visibleHalfHeight = Math.tan(verticalHalfFovRad) * distance;
    const visibleWidth = visibleHalfHeight * this.camera.aspect * 2;
    const pxPerWorldUnit = window.innerWidth / visibleWidth;

    this.element.style.setProperty("--boom-heart-px", `${GATHER_HEART_WIDTH * pxPerWorldUnit}px`);
  }

  show() {
    if (this._shown) return;
    this._shown = true;

    const tl = gsap.timeline();
    this._timeline = tl;

    tl.to(
      this.card,
      { opacity: 1, y: 0, duration: REVEAL_FADE_IN_DURATION, ease: "power2.out" },
      REVEAL_FADE_START_AT,
    );
    tl.to(
      this.scrim,
      { opacity: REVEAL_SCRIM_PEAK_OPACITY, duration: REVEAL_SCRIM_DURATION, ease: "sine.inOut" },
      REVEAL_SCRIM_START_AT,
    );

    // Fade the whole card out as the gift box starts appearing (see
    // GiftBoxConstants.js's own GIFTBOX_START_AT) so it's gone well
    // before the box's own entrance settles.
    tl.to(
      this.card,
      { opacity: 0, duration: 0.6, ease: "power2.in" },
      GIFTBOX_START_AT,
    );
  }

  destroy() {
    window.removeEventListener("resize", this._onResize);
    if (this._timeline) this._timeline.kill();
    gsap.killTweensOf([this.card, this.scrim]);
    this.element.remove();
  }
}
