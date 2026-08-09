import gsap from "gsap";

import "./StickerFocusView.css";

import {
  STICKER_FOCUS_OPEN_DURATION,
  STICKER_FOCUS_CLOSE_DURATION,
  STICKER_FOCUS_START_SCALE,
  STICKER_FOCUS_BACKDROP_DURATION,
  STICKER_FOCUS_BACKDROP_OPACITY,
} from "./PhotoStickerConstants";

// The DOM+CSS+GSAP overlay a clicked sticker opens into — the same
// technique the envelope/letter already use for their own 2D-over-3D
// UI. This file knows NOTHING about orbits, entries, THREE.js, or which
// sticker is which — PhotoStickerOrbit.js owns all of that and only
// ever hands this a plain { src, originX, originY } to open from /
// { targetX, targetY } to close back to. That one-way boundary is the
// same shape as Envelope.js -> Letter.js: the owner decides WHEN and
// WHERE, this only knows HOW to animate.
//
// Built once and reused for every open/close cycle (a user can click
// several stickers in one visit) — never torn down and recreated, so
// there's no repeated DOM/element churn per click, only a single
// <img>'s `src` being swapped.
export default class StickerFocusView {
  constructor(audio, { onRequestClose } = {}) {
    this.audio = audio;
    this._onRequestClose = onRequestClose;

    this._isOpen = false;
    this._isTransitioning = false;

    this.element = document.createElement("div");
    this.element.className = "sticker-focus";

    this.element.innerHTML = `
      <div class="sticker-focus-backdrop"></div>
      <div class="sticker-focus-frame">
        <img class="sticker-focus-image" alt="" />
      </div>
    `;

    document.body.appendChild(this.element);

    this.backdrop = this.element.querySelector(".sticker-focus-backdrop");
    this.frame = this.element.querySelector(".sticker-focus-frame");
    this.image = this.element.querySelector(".sticker-focus-image");

    // Clicking anywhere that isn't the frame itself closes it — see
    // StickerFocusView.css for how the backdrop/frame are laid out so
    // this hit-tests correctly with no manual stopPropagation: the
    // frame is a smaller sibling box centered on top of the full-screen
    // backdrop, so a click only ever reaches one or the other depending
    // on where the pointer actually is.
    this._onBackdropClick = () => this._requestClose();
    this._onKeydown = (event) => {
      if (event.key === "Escape") this._requestClose();
    };

    this.backdrop.addEventListener("click", this._onBackdropClick);
    window.addEventListener("keydown", this._onKeydown);
  }

  _requestClose() {
    if (!this._isOpen || this._isTransitioning) return;
    if (this._onRequestClose) this._onRequestClose();
  }

  // originX/originY are viewport px — the clicked sticker's current
  // on-screen position at the moment of the click (PhotoStickerOrbit.js
  // projects its 3D position to get these; this file just animates
  // toward/from whatever point it's given).
  open({ src, originX, originY, onOpenComplete }) {
    this.image.src = src;

    this._isOpen = true;
    this._isTransitioning = true;

    this.element.classList.add("sticker-focus--interactive");

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    const tl = gsap.timeline({
      onComplete: () => {
        this._isTransitioning = false;
        if (onOpenComplete) onOpenComplete();
      },
    });
    this._timeline = tl;

    tl.fromTo(
      this.backdrop,
      { opacity: 0 },
      { opacity: STICKER_FOCUS_BACKDROP_OPACITY, duration: STICKER_FOCUS_BACKDROP_DURATION, ease: "power2.out" },
      0,
    );

    tl.fromTo(
      this.frame,
      {
        x: originX - centerX,
        y: originY - centerY,
        scale: STICKER_FOCUS_START_SCALE,
        opacity: 0,
      },
      {
        x: 0,
        y: 0,
        scale: 1,
        opacity: 1,
        duration: STICKER_FOCUS_OPEN_DURATION,
        ease: "power2.out",
      },
      0,
    );
  }

  // targetX/targetY are the same live-projected viewport px the sticker
  // is CURRENTLY at (the orbit kept moving while the photo was open —
  // this deliberately re-measures rather than reusing the open()
  // origin, so the photo glides back to where its sticker actually is).
  close({ targetX, targetY, onCloseComplete }) {
    this._isTransitioning = true;

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    const tl = gsap.timeline({
      onComplete: () => {
        this._isOpen = false;
        this._isTransitioning = false;
        this.element.classList.remove("sticker-focus--interactive");
        if (onCloseComplete) onCloseComplete();
      },
    });
    this._timeline = tl;

    tl.to(
      this.backdrop,
      { opacity: 0, duration: STICKER_FOCUS_BACKDROP_DURATION, ease: "power2.in" },
      0,
    );

    tl.to(
      this.frame,
      {
        x: targetX - centerX,
        y: targetY - centerY,
        scale: STICKER_FOCUS_START_SCALE,
        opacity: 0,
        duration: STICKER_FOCUS_CLOSE_DURATION,
        ease: "power2.inOut",
      },
      0,
    );
  }

  destroy() {
    if (this._timeline) this._timeline.kill();
    gsap.killTweensOf(this.backdrop);
    gsap.killTweensOf(this.frame);

    this.backdrop.removeEventListener("click", this._onBackdropClick);
    window.removeEventListener("keydown", this._onKeydown);

    this.element.remove();
  }
}
