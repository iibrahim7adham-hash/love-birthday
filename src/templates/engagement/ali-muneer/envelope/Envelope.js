import gsap from "gsap";

import "./Envelope.css";
import {
  ENVELOPE_DISMISS_DELAY,
  ENVELOPE_DISMISS_DURATION,
  ENVELOPE_DISMISS_SCALE,
  ENVELOPE_DISMISS_Z,
  ENVELOPE_ENTRANCE_DURATION,
  ENVELOPE_ENTRANCE_START_SCALE,
  ENVELOPE_SEAL_PULSE_DURATION,
  ENVELOPE_SEAL_PULSE_SCALE,
} from "./EnvelopeConstants";

// The lifecycle this file drives, in order — mirrors the same plain-
// string-constants pattern love/envelope/Envelope.js already
// establishes for this exact kind of DOM+CSS 3D envelope (this project
// doesn't need a state-machine library): every handler below guards on
// `state` so a stray double-click, or a click while a transition is
// still playing, can never re-enter a stage out of order.
const STATE = {
  INACTIVE: "inactive", // constructed, entrance not played yet
  APPEARING: "appearing",
  CLOSED: "closed", // idle, floating — accepts a seal click
  OPENING: "opening",
  OPEN: "open", // flap open
  CLOSING: "closing",
};

// A DOM+CSS 3D interactive envelope overlay — no Three.js mesh. Ivory/
// gold, luxury formal-invitation styling (see EnvelopeConstants.js).
// Idles with a gentle float + seal pulse; clicking the seal releases it
// and unfolds the flap on its own top hinge. Clicking outside the
// envelope closes it back up, the exact reverse sequence. There is no
// letter/card inside the pocket — it's an empty envelope.
export default class Envelope {
  // onDismissed — optional callback fired once the post-lock "move away
  // and fade out" transition (_dismiss()) has fully finished, so the
  // parent scene knows this envelope is done and gone. Not called for
  // any other state change.
  // audio — the shared AudioManager (see AliMuneerScene's own
  // this.audio). Optional so this class still works standalone/in
  // tests without one; when present, _handleOpen() calls its resume()
  // synchronously as the very first thing it does (see there) so the
  // background music unlocks reliably on iOS Safari.
  constructor(onDismissed, audio) {
    this.state = STATE.INACTIVE;
    this.audio = audio || null;
    // Set true once the Step 4 closing animation (_becomeClosed) has
    // completed a full open→close cycle — after that the envelope
    // becomes a locked, static display piece: no further opens, and
    // the "اضغط هنا" hint never returns. See _becomeClosed().
    this.isLocked = false;
    // Set true once the dismissal transition (_dismiss()) has fully
    // played out — the envelope is now invisible/inert and the
    // onDismissed callback (if any) has already fired.
    this.isDismissed = false;
    this._onDismissed = typeof onDismissed === "function" ? onDismissed : null;

    this.element = document.createElement("div");
    this.element.id = "am-envelope";
    this.element.innerHTML = `
      <div class="am-envelope-3d">
        <div class="am-envelope-back"></div>
        <div class="am-envelope-card">
          <svg class="am-invite-star-corner am-invite-star-corner--tl" viewBox="0 0 60 60" aria-hidden="true">
            <path class="am-invite-star-corner-mark" d="M9,1.5 C10.2,7.4 11.4,8.6 17.5,9.8 C11.4,11 10.2,12.2 9,18.1 C7.8,12.2 6.6,11 0.5,9.8 C6.6,8.6 7.8,7.4 9,1.5 Z" />
            <line class="am-invite-star-corner-line" x1="17" y1="9.1" x2="46" y2="9.1" />
            <line class="am-invite-star-corner-line" x1="8.3" y1="17.8" x2="8.3" y2="46" />
            <line class="am-invite-star-corner-line am-invite-star-corner-line--secondary" x1="18" y1="12.4" x2="43" y2="12.4" />
            <line class="am-invite-star-corner-line am-invite-star-corner-line--secondary" x1="11.6" y1="18.5" x2="11.6" y2="43" />
            <circle class="am-invite-star-corner-dot" cx="49" cy="9.1" r="1.15" />
            <circle class="am-invite-star-corner-dot" cx="8.3" cy="49" r="1.15" />
          </svg>
          <svg class="am-invite-star-corner am-invite-star-corner--tr" viewBox="0 0 60 60" aria-hidden="true">
            <path class="am-invite-star-corner-mark" d="M9,1.5 C10.2,7.4 11.4,8.6 17.5,9.8 C11.4,11 10.2,12.2 9,18.1 C7.8,12.2 6.6,11 0.5,9.8 C6.6,8.6 7.8,7.4 9,1.5 Z" />
            <line class="am-invite-star-corner-line" x1="17" y1="9.1" x2="46" y2="9.1" />
            <line class="am-invite-star-corner-line" x1="8.3" y1="17.8" x2="8.3" y2="46" />
            <line class="am-invite-star-corner-line am-invite-star-corner-line--secondary" x1="18" y1="12.4" x2="43" y2="12.4" />
            <line class="am-invite-star-corner-line am-invite-star-corner-line--secondary" x1="11.6" y1="18.5" x2="11.6" y2="43" />
            <circle class="am-invite-star-corner-dot" cx="49" cy="9.1" r="1.15" />
            <circle class="am-invite-star-corner-dot" cx="8.3" cy="49" r="1.15" />
          </svg>
          <svg class="am-invite-star-corner am-invite-star-corner--bl" viewBox="0 0 60 60" aria-hidden="true">
            <path class="am-invite-star-corner-mark" d="M9,1.5 C10.2,7.4 11.4,8.6 17.5,9.8 C11.4,11 10.2,12.2 9,18.1 C7.8,12.2 6.6,11 0.5,9.8 C6.6,8.6 7.8,7.4 9,1.5 Z" />
            <line class="am-invite-star-corner-line" x1="17" y1="9.1" x2="46" y2="9.1" />
            <line class="am-invite-star-corner-line" x1="8.3" y1="17.8" x2="8.3" y2="46" />
            <line class="am-invite-star-corner-line am-invite-star-corner-line--secondary" x1="18" y1="12.4" x2="43" y2="12.4" />
            <line class="am-invite-star-corner-line am-invite-star-corner-line--secondary" x1="11.6" y1="18.5" x2="11.6" y2="43" />
            <circle class="am-invite-star-corner-dot" cx="49" cy="9.1" r="1.15" />
            <circle class="am-invite-star-corner-dot" cx="8.3" cy="49" r="1.15" />
          </svg>
          <svg class="am-invite-star-corner am-invite-star-corner--br" viewBox="0 0 60 60" aria-hidden="true">
            <path class="am-invite-star-corner-mark" d="M9,1.5 C10.2,7.4 11.4,8.6 17.5,9.8 C11.4,11 10.2,12.2 9,18.1 C7.8,12.2 6.6,11 0.5,9.8 C6.6,8.6 7.8,7.4 9,1.5 Z" />
            <line class="am-invite-star-corner-line" x1="17" y1="9.1" x2="46" y2="9.1" />
            <line class="am-invite-star-corner-line" x1="8.3" y1="17.8" x2="8.3" y2="46" />
            <line class="am-invite-star-corner-line am-invite-star-corner-line--secondary" x1="18" y1="12.4" x2="43" y2="12.4" />
            <line class="am-invite-star-corner-line am-invite-star-corner-line--secondary" x1="11.6" y1="18.5" x2="11.6" y2="43" />
            <circle class="am-invite-star-corner-dot" cx="49" cy="9.1" r="1.15" />
            <circle class="am-invite-star-corner-dot" cx="8.3" cy="49" r="1.15" />
          </svg>
          <svg class="am-invite-crest" viewBox="0 0 220 60" aria-hidden="true">
            <defs>
              <path id="am-crest-petal-outer" d="M0,0 C-3.4,-8.2 -3,-16.4 0,-24 C3,-16.4 3.4,-8.2 0,0 Z" />
              <path id="am-crest-petal-inner" d="M0,-3.5 C-1.5,-8 -1.2,-13 0,-17.5 C1.2,-13 1.5,-8 0,-3.5 Z" />
            </defs>
            <g transform="translate(110,30)">
              <use href="#am-crest-petal-outer" transform="rotate(0)" fill="#C19F62" />
              <use href="#am-crest-petal-outer" transform="rotate(45)" fill="#C19F62" opacity="0.85" />
              <use href="#am-crest-petal-outer" transform="rotate(90)" fill="#C19F62" />
              <use href="#am-crest-petal-outer" transform="rotate(135)" fill="#C19F62" opacity="0.85" />
              <use href="#am-crest-petal-outer" transform="rotate(180)" fill="#C19F62" />
              <use href="#am-crest-petal-outer" transform="rotate(225)" fill="#C19F62" opacity="0.85" />
              <use href="#am-crest-petal-outer" transform="rotate(270)" fill="#C19F62" />
              <use href="#am-crest-petal-outer" transform="rotate(315)" fill="#C19F62" opacity="0.85" />

              <use href="#am-crest-petal-inner" transform="rotate(0)" fill="none" stroke="#FFF5C0" stroke-width="0.4" opacity="0.8" />
              <use href="#am-crest-petal-inner" transform="rotate(45)" fill="none" stroke="#FFF5C0" stroke-width="0.4" opacity="0.8" />
              <use href="#am-crest-petal-inner" transform="rotate(90)" fill="none" stroke="#FFF5C0" stroke-width="0.4" opacity="0.8" />
              <use href="#am-crest-petal-inner" transform="rotate(135)" fill="none" stroke="#FFF5C0" stroke-width="0.4" opacity="0.8" />
              <use href="#am-crest-petal-inner" transform="rotate(180)" fill="none" stroke="#FFF5C0" stroke-width="0.4" opacity="0.8" />
              <use href="#am-crest-petal-inner" transform="rotate(225)" fill="none" stroke="#FFF5C0" stroke-width="0.4" opacity="0.8" />
              <use href="#am-crest-petal-inner" transform="rotate(270)" fill="none" stroke="#FFF5C0" stroke-width="0.4" opacity="0.8" />
              <use href="#am-crest-petal-inner" transform="rotate(315)" fill="none" stroke="#FFF5C0" stroke-width="0.4" opacity="0.8" />

              <circle cx="0" cy="-24" r="0.9" fill="#C19F62" transform="rotate(0)" />
              <circle cx="0" cy="-24" r="0.9" fill="#C19F62" transform="rotate(45)" />
              <circle cx="0" cy="-24" r="0.9" fill="#C19F62" transform="rotate(90)" />
              <circle cx="0" cy="-24" r="0.9" fill="#C19F62" transform="rotate(135)" />
              <circle cx="0" cy="-24" r="0.9" fill="#C19F62" transform="rotate(180)" />
              <circle cx="0" cy="-24" r="0.9" fill="#C19F62" transform="rotate(225)" />
              <circle cx="0" cy="-24" r="0.9" fill="#C19F62" transform="rotate(270)" />
              <circle cx="0" cy="-24" r="0.9" fill="#C19F62" transform="rotate(315)" />

              <circle r="4" fill="#C19F62" stroke="#8A6D3B" stroke-width="0.4" />
              <circle r="1.6" fill="#FFF5C0" opacity="0.85" />
            </g>

            <path d="M84,30 C64,29 54,20 40,23 C28,25.5 22,21 16,24" fill="none" stroke="#C19F62" stroke-width="1" stroke-linecap="round" />
            <path d="M60,34 C48,36 40,33 32,36" fill="none" stroke="#C19F62" stroke-width="0.7" stroke-linecap="round" opacity="0.7" />
            <circle cx="16" cy="24" r="1.3" fill="#C19F62" />

            <path d="M136,30 C156,29 166,20 180,23 C192,25.5 198,21 204,24" fill="none" stroke="#C19F62" stroke-width="1" stroke-linecap="round" />
            <path d="M160,34 C172,36 180,33 188,36" fill="none" stroke="#C19F62" stroke-width="0.7" stroke-linecap="round" opacity="0.7" />
            <circle cx="204" cy="24" r="1.3" fill="#C19F62" />
          </svg>
          <svg class="am-invite-floral am-invite-floral--left" viewBox="0 0 60 100" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
            <defs>
              <g id="am-leaf-cream-l">
                <path
                  class="am-invite-floral-blade-cream"
                  d="M0,0 C1.5,-2.6 5,-4.6 11,-5.3 C18,-6.1 24,-4.6 29,-1.2 C30.2,-0.5 30.2,0.5 29,1.2 C24,4.6 18,6.1 11,5.3 C5,4.6 1.5,2.6 0,0 Z"
                />
              </g>
              <g id="am-leaf-sage-l">
                <path
                  class="am-invite-floral-blade-sage"
                  d="M0,0 C1.5,-2.6 5,-4.6 11,-5.3 C18,-6.1 24,-4.6 29,-1.2 C30.2,-0.5 30.2,0.5 29,1.2 C24,4.6 18,6.1 11,5.3 C5,4.6 1.5,2.6 0,0 Z"
                />
              </g>
            </defs>
            <path class="am-invite-floral-stem" d="M 50,98 C 38,82 46,62 30,48 C 16,36 24,18 10,6" fill="none" />
            <path class="am-invite-floral-stem am-invite-floral-stem--offshoot" d="M 30,48 C 24,41 15,37 7,41" fill="none" />
            <use href="#am-leaf-sage-l" transform="translate(46,90) rotate(-135) scale(1.2)" />
            <use href="#am-leaf-cream-l" transform="translate(42,78) rotate(55) scale(1.05)" />
            <use href="#am-leaf-sage-l" transform="translate(35,64) rotate(-120) scale(0.95)" />
            <use href="#am-leaf-cream-l" transform="translate(27,52) rotate(65) scale(0.85)" />
            <use href="#am-leaf-sage-l" transform="translate(21,38) rotate(-105) scale(0.7)" />
            <use href="#am-leaf-cream-l" transform="translate(15,24) rotate(75) scale(0.58)" />
            <use href="#am-leaf-sage-l" transform="translate(10,12) rotate(-100) scale(0.42)" />
            <use href="#am-leaf-cream-l" transform="translate(20,43) rotate(160) scale(0.5)" />
            <use href="#am-leaf-sage-l" transform="translate(10,39) rotate(-55) scale(0.4)" />
            <g class="am-invite-floral-berry-cluster">
              <circle class="am-invite-floral-berry" cx="32" cy="49" r="1.2" />
              <circle class="am-invite-floral-berry" cx="35.5" cy="46.5" r="0.9" />
              <circle class="am-invite-floral-berry" cx="34" cy="52.5" r="0.8" />
            </g>
            <g class="am-invite-floral-berry-cluster">
              <circle class="am-invite-floral-berry" cx="8" cy="9" r="0.9" />
              <circle class="am-invite-floral-berry" cx="11" cy="6.5" r="0.7" />
            </g>
          </svg>
          <svg class="am-invite-floral am-invite-floral--right" viewBox="0 0 60 100" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
            <defs>
              <g id="am-leaf-cream-r">
                <path
                  class="am-invite-floral-blade-cream"
                  d="M0,0 C1.5,-2.6 5,-4.6 11,-5.3 C18,-6.1 24,-4.6 29,-1.2 C30.2,-0.5 30.2,0.5 29,1.2 C24,4.6 18,6.1 11,5.3 C5,4.6 1.5,2.6 0,0 Z"
                />
              </g>
              <g id="am-leaf-sage-r">
                <path
                  class="am-invite-floral-blade-sage"
                  d="M0,0 C1.5,-2.6 5,-4.6 11,-5.3 C18,-6.1 24,-4.6 29,-1.2 C30.2,-0.5 30.2,0.5 29,1.2 C24,4.6 18,6.1 11,5.3 C5,4.6 1.5,2.6 0,0 Z"
                />
              </g>
            </defs>
            <path class="am-invite-floral-stem" d="M 50,98 C 38,82 46,62 30,48 C 16,36 24,18 10,6" fill="none" />
            <path class="am-invite-floral-stem am-invite-floral-stem--offshoot" d="M 30,48 C 24,41 15,37 7,41" fill="none" />
            <use href="#am-leaf-sage-r" transform="translate(46,90) rotate(-135) scale(1.2)" />
            <use href="#am-leaf-cream-r" transform="translate(42,78) rotate(55) scale(1.05)" />
            <use href="#am-leaf-sage-r" transform="translate(35,64) rotate(-120) scale(0.95)" />
            <use href="#am-leaf-cream-r" transform="translate(27,52) rotate(65) scale(0.85)" />
            <use href="#am-leaf-sage-r" transform="translate(21,38) rotate(-105) scale(0.7)" />
            <use href="#am-leaf-cream-r" transform="translate(15,24) rotate(75) scale(0.58)" />
            <use href="#am-leaf-sage-r" transform="translate(10,12) rotate(-100) scale(0.42)" />
            <use href="#am-leaf-cream-r" transform="translate(20,43) rotate(160) scale(0.5)" />
            <use href="#am-leaf-sage-r" transform="translate(10,39) rotate(-55) scale(0.4)" />
            <g class="am-invite-floral-berry-cluster">
              <circle class="am-invite-floral-berry" cx="32" cy="49" r="1.2" />
              <circle class="am-invite-floral-berry" cx="35.5" cy="46.5" r="0.9" />
              <circle class="am-invite-floral-berry" cx="34" cy="52.5" r="0.8" />
            </g>
            <g class="am-invite-floral-berry-cluster">
              <circle class="am-invite-floral-berry" cx="8" cy="9" r="0.9" />
              <circle class="am-invite-floral-berry" cx="11" cy="6.5" r="0.7" />
            </g>
          </svg>
          <div class="am-invite-text" dir="rtl" lang="ar">
            <p class="am-invite-line">يتشرف السيد <span class="am-invite-host-name">منير رمزي يونس</span></p>
            <p class="am-invite-line">بدعوتكم لحفل عقد قران ولده</p>
            <p class="am-invite-divider" aria-hidden="true">─── ❖ ───</p>
            <div class="am-invite-names-row">
              <p class="am-invite-name">علي منير رمزي</p>
              <span class="am-invite-name-divider" aria-hidden="true"></span>
              <p class="am-invite-line am-invite-line--small">على الآنسة</p>
              <span class="am-invite-name-divider" aria-hidden="true"></span>
              <p class="am-invite-name">سمية غانم احمد</p>
            </div>
            <p class="am-invite-divider" aria-hidden="true">─── ❖ ───</p>
            <div class="am-invite-date-row">
              <svg class="am-invite-ring-icon" viewBox="4 4 28 20" aria-hidden="true">
                <defs>
                  <linearGradient id="am-ring-gold-1" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#FFF5C0" />
                    <stop offset="40%" stop-color="#D8AB3A" />
                    <stop offset="75%" stop-color="#946914" />
                    <stop offset="100%" stop-color="#F5E085" />
                  </linearGradient>
                  <filter id="am-ring-shadow-1" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0.3" dy="0.6" stdDeviation="0.5" flood-color="#2a1c08" flood-opacity="0.45" />
                  </filter>
                </defs>
                <g filter="url(#am-ring-shadow-1)">
                  <circle cx="14" cy="14" r="8" fill="none" stroke="url(#am-ring-gold-1)" stroke-width="3.2" />
                  <circle cx="22" cy="14" r="8" fill="none" stroke="url(#am-ring-gold-1)" stroke-width="3.2" />
                  <path class="am-invite-ring-shine" d="M9,10 A8,8 0 0,1 13,6.3" />
                  <path class="am-invite-ring-shine" d="M17,10 A8,8 0 0,1 21,6.3" />
                  <circle class="am-invite-ring-pave" cx="7.07" cy="10" r="0.4" />
                  <circle class="am-invite-ring-pave" cx="10" cy="7.07" r="0.4" />
                  <circle class="am-invite-ring-pave" cx="14" cy="6" r="0.4" />
                  <circle class="am-invite-ring-pave" cx="18" cy="7.07" r="0.4" />
                  <circle class="am-invite-ring-pave" cx="20.93" cy="10" r="0.4" />
                  <circle class="am-invite-ring-pave" cx="15.07" cy="10" r="0.4" />
                  <circle class="am-invite-ring-pave" cx="22" cy="6" r="0.4" />
                  <circle class="am-invite-ring-pave" cx="26" cy="7.07" r="0.4" />
                  <circle class="am-invite-ring-pave" cx="28.93" cy="10" r="0.4" />
                  <path d="M20.13,19.14 A8,8 0 0,1 15.39,21.88" fill="none" stroke="url(#am-ring-gold-1)" stroke-width="3.2" stroke-linecap="round" />
                </g>
              </svg>
              <div class="am-invite-date-group">
                <svg class="am-invite-calendar-icon" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="3.5" y="5" width="17" height="15" rx="1.6" fill="none" />
                  <line x1="3.5" y1="9" x2="20.5" y2="9" />
                  <line x1="7.5" y1="3" x2="7.5" y2="6.5" />
                  <line x1="16.5" y1="3" x2="16.5" y2="6.5" />
                  <circle cx="8.2" cy="13" r="0.9" fill="currentColor" stroke="none" />
                  <circle cx="12" cy="13" r="0.9" fill="currentColor" stroke="none" />
                  <circle cx="15.8" cy="13" r="0.9" fill="currentColor" stroke="none" />
                  <circle cx="8.2" cy="16.6" r="0.9" fill="currentColor" stroke="none" />
                  <circle cx="12" cy="16.6" r="0.9" fill="currentColor" stroke="none" />
                </svg>
                <p class="am-invite-line">بتاريخ: 2026/08/31</p>
              </div>
              <svg class="am-invite-ring-icon" viewBox="4 4 28 20" aria-hidden="true">
                <defs>
                  <linearGradient id="am-ring-gold-2" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#FFF5C0" />
                    <stop offset="40%" stop-color="#D8AB3A" />
                    <stop offset="75%" stop-color="#946914" />
                    <stop offset="100%" stop-color="#F5E085" />
                  </linearGradient>
                  <filter id="am-ring-shadow-2" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0.3" dy="0.6" stdDeviation="0.5" flood-color="#2a1c08" flood-opacity="0.45" />
                  </filter>
                </defs>
                <g filter="url(#am-ring-shadow-2)">
                  <circle cx="14" cy="14" r="8" fill="none" stroke="url(#am-ring-gold-2)" stroke-width="3.2" />
                  <circle cx="22" cy="14" r="8" fill="none" stroke="url(#am-ring-gold-2)" stroke-width="3.2" />
                  <path class="am-invite-ring-shine" d="M9,10 A8,8 0 0,1 13,6.3" />
                  <path class="am-invite-ring-shine" d="M17,10 A8,8 0 0,1 21,6.3" />
                  <circle class="am-invite-ring-pave" cx="7.07" cy="10" r="0.4" />
                  <circle class="am-invite-ring-pave" cx="10" cy="7.07" r="0.4" />
                  <circle class="am-invite-ring-pave" cx="14" cy="6" r="0.4" />
                  <circle class="am-invite-ring-pave" cx="18" cy="7.07" r="0.4" />
                  <circle class="am-invite-ring-pave" cx="20.93" cy="10" r="0.4" />
                  <circle class="am-invite-ring-pave" cx="15.07" cy="10" r="0.4" />
                  <circle class="am-invite-ring-pave" cx="22" cy="6" r="0.4" />
                  <circle class="am-invite-ring-pave" cx="26" cy="7.07" r="0.4" />
                  <circle class="am-invite-ring-pave" cx="28.93" cy="10" r="0.4" />
                  <path d="M20.13,19.14 A8,8 0 0,1 15.39,21.88" fill="none" stroke="url(#am-ring-gold-2)" stroke-width="3.2" stroke-linecap="round" />
                </g>
              </svg>
            </div>
            <p class="am-invite-line am-invite-line--small">ونتشرف بحضوركم</p>
          </div>
        </div>
        <svg class="am-envelope-corner am-envelope-corner--bl" viewBox="0 0 24 24" aria-hidden="true">
          <defs>
            <linearGradient id="am-corner-gradient-bl" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#FFF5C0" />
              <stop offset="40%" stop-color="#D8AB3A" />
              <stop offset="75%" stop-color="#946914" />
              <stop offset="100%" stop-color="#F5E085" />
            </linearGradient>
          </defs>
          <path d="M2,15 Q2,2 15,2" fill="none" stroke="url(#am-corner-gradient-bl)" stroke-width="1.4" stroke-linecap="round" vector-effect="non-scaling-stroke" />
          <path d="M4,12.5 Q4,4 12.5,4" fill="none" stroke="url(#am-corner-gradient-bl)" stroke-width="0.8" stroke-linecap="round" opacity="0.6" vector-effect="non-scaling-stroke" />
          <path d="M7,2.5 Q9,0.6 11,2.2" fill="none" stroke="url(#am-corner-gradient-bl)" stroke-width="0.6" stroke-linecap="round" opacity="0.5" vector-effect="non-scaling-stroke" />
          <circle cx="3.17" cy="8.37" r="0.5" fill="url(#am-corner-gradient-bl)" opacity="0.85" />
          <circle cx="5.25" cy="5.25" r="0.55" fill="url(#am-corner-gradient-bl)" opacity="0.9" />
          <circle cx="8.37" cy="3.17" r="0.5" fill="url(#am-corner-gradient-bl)" opacity="0.85" />
          <path d="M2,15 C0.3,17.8 2.6,20 4.8,18.2 C6,17.2 5.2,15 2,15 Z" fill="url(#am-corner-gradient-bl)" opacity="0.9" />
          <path d="M2.3,15.3 Q3.6,17.5 4.9,18.3" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="0.35" stroke-linecap="round" vector-effect="non-scaling-stroke" />
          <path d="M4.8,18.2 C6.2,19.4 6,21 4.5,21.2 C3.3,21.3 3,20.2 4,19.8" fill="none" stroke="url(#am-corner-gradient-bl)" stroke-width="0.7" stroke-linecap="round" vector-effect="non-scaling-stroke" />
          <path d="M15,2 C17.8,0.3 20,2.6 18.2,4.8 C17.2,6 15,5.2 15,2 Z" fill="url(#am-corner-gradient-bl)" opacity="0.9" />
          <path d="M15.3,2.3 Q17.5,3.6 18.3,4.9" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="0.35" stroke-linecap="round" vector-effect="non-scaling-stroke" />
          <path d="M18.2,4.8 C19.4,6.2 21,6 21.2,4.5 C21.3,3.3 20.2,3 19.8,4" fill="none" stroke="url(#am-corner-gradient-bl)" stroke-width="0.7" stroke-linecap="round" vector-effect="non-scaling-stroke" />
          <ellipse cx="2" cy="2" rx="1.5" ry="1.1" transform="rotate(45 2 2)" fill="url(#am-corner-gradient-bl)" />
          <ellipse cx="2" cy="2" rx="0.85" ry="0.55" transform="rotate(45 2 2)" fill="none" stroke="rgba(255,255,255,0.65)" stroke-width="0.3" />
        </svg>
        <svg class="am-envelope-corner am-envelope-corner--br" viewBox="0 0 24 24" aria-hidden="true">
          <defs>
            <linearGradient id="am-corner-gradient-br" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#FFF5C0" />
              <stop offset="40%" stop-color="#D8AB3A" />
              <stop offset="75%" stop-color="#946914" />
              <stop offset="100%" stop-color="#F5E085" />
            </linearGradient>
          </defs>
          <path d="M2,15 Q2,2 15,2" fill="none" stroke="url(#am-corner-gradient-br)" stroke-width="1.4" stroke-linecap="round" vector-effect="non-scaling-stroke" />
          <path d="M4,12.5 Q4,4 12.5,4" fill="none" stroke="url(#am-corner-gradient-br)" stroke-width="0.8" stroke-linecap="round" opacity="0.6" vector-effect="non-scaling-stroke" />
          <path d="M7,2.5 Q9,0.6 11,2.2" fill="none" stroke="url(#am-corner-gradient-br)" stroke-width="0.6" stroke-linecap="round" opacity="0.5" vector-effect="non-scaling-stroke" />
          <circle cx="3.17" cy="8.37" r="0.5" fill="url(#am-corner-gradient-br)" opacity="0.85" />
          <circle cx="5.25" cy="5.25" r="0.55" fill="url(#am-corner-gradient-br)" opacity="0.9" />
          <circle cx="8.37" cy="3.17" r="0.5" fill="url(#am-corner-gradient-br)" opacity="0.85" />
          <path d="M2,15 C0.3,17.8 2.6,20 4.8,18.2 C6,17.2 5.2,15 2,15 Z" fill="url(#am-corner-gradient-br)" opacity="0.9" />
          <path d="M2.3,15.3 Q3.6,17.5 4.9,18.3" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="0.35" stroke-linecap="round" vector-effect="non-scaling-stroke" />
          <path d="M4.8,18.2 C6.2,19.4 6,21 4.5,21.2 C3.3,21.3 3,20.2 4,19.8" fill="none" stroke="url(#am-corner-gradient-br)" stroke-width="0.7" stroke-linecap="round" vector-effect="non-scaling-stroke" />
          <path d="M15,2 C17.8,0.3 20,2.6 18.2,4.8 C17.2,6 15,5.2 15,2 Z" fill="url(#am-corner-gradient-br)" opacity="0.9" />
          <path d="M15.3,2.3 Q17.5,3.6 18.3,4.9" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="0.35" stroke-linecap="round" vector-effect="non-scaling-stroke" />
          <path d="M18.2,4.8 C19.4,6.2 21,6 21.2,4.5 C21.3,3.3 20.2,3 19.8,4" fill="none" stroke="url(#am-corner-gradient-br)" stroke-width="0.7" stroke-linecap="round" vector-effect="non-scaling-stroke" />
          <ellipse cx="2" cy="2" rx="1.5" ry="1.1" transform="rotate(45 2 2)" fill="url(#am-corner-gradient-br)" />
          <ellipse cx="2" cy="2" rx="0.85" ry="0.55" transform="rotate(45 2 2)" fill="none" stroke="rgba(255,255,255,0.65)" stroke-width="0.3" />
        </svg>
        <div class="am-envelope-pocket"></div>
        <div class="am-envelope-flap">
          <svg class="am-envelope-flap-trim" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="am-flap-trim-gradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#FFF8DC" />
                <stop offset="40%" stop-color="#D4AF37" />
                <stop offset="75%" stop-color="#AA771C" />
                <stop offset="100%" stop-color="#F7DA85" />
                <!-- A slow, gentle drift of the gradient's own angle —
                     the foil trim's highlight quietly shifts along the
                     curve rather than staying fixed, reading as gold
                     leaf catching ambient light rather than a static
                     printed line. Small amplitude and a long duration
                     so it stays a "sophisticated" background shimmer,
                     not an attention-grabbing sweep. -->
                <animate attributeName="x1" values="0;0.18;0" dur="6.5s" repeatCount="indefinite" />
                <animate attributeName="x2" values="1;0.82;1" dur="6.5s" repeatCount="indefinite" />
              </linearGradient>
            </defs>
            <path class="am-flap-trim-primary" d="M 0,0 C 15,40 35,65 50,65 C 65,65 85,40 100,0" fill="none" stroke="url(#am-flap-trim-gradient)" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linecap="butt" />
            <!-- Sharp secondary hairline, inset 8px inward from the main sweep's apex (65 -> 57), sharing the exact same corner-to-corner start/end points (0,0) and (100,0) as the primary curve — every control point is the primary curve's own control point scaled by 57/65, so the two lines are a true parallel pair, not just a similarly-shaped second path. Same Imperial Dune gradient as the primary stroke, not a flat color. -->
            <path class="am-flap-trim-secondary" d="M 0,0 C 15,35.1 35,57 50,57 C 65,57 85,35.1 100,0" fill="none" stroke="url(#am-flap-trim-gradient)" stroke-width="0.75" vector-effect="non-scaling-stroke" stroke-linecap="butt" />
          </svg>
          <svg class="am-envelope-flap-monogram" viewBox="0 0 80 66" aria-hidden="true">
            <defs>
              <linearGradient id="am-monogram-gradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#FFE89E" />
                <stop offset="30%" stop-color="#DDB35A" />
                <stop offset="65%" stop-color="#B88728" />
                <stop offset="100%" stop-color="#F7DA85" />
              </linearGradient>

              <!-- A bright, narrow band sweeping slowly across the
                   monogram's own shapes (clipped to exactly them via
                   am-flap-monogram-clip below) — the "catches the light"
                   half of the foil-stamp look, on top of the static
                   bevel the CSS filter provides (see
                   .am-envelope-flap-monogram in Envelope.css). -->
              <linearGradient id="am-flap-monogram-shimmer" x1="-40%" y1="0%" x2="-15%" y2="100%">
                <stop offset="0%" stop-color="#fff8d8" stop-opacity="0" />
                <stop offset="50%" stop-color="#fffaea" stop-opacity="0.9" />
                <stop offset="100%" stop-color="#fff8d8" stop-opacity="0" />
                <animate attributeName="x1" values="-40%;140%;-40%" dur="5.5s" repeatCount="indefinite" />
                <animate attributeName="x2" values="-15%;165%;-15%" dur="5.5s" repeatCount="indefinite" />
              </linearGradient>

              <clipPath id="am-flap-monogram-clip">
                <use href="#am-flap-monogram-shapes" />
              </clipPath>
            </defs>

            <g id="am-flap-monogram-shapes">
              <text x="40" y="34" text-anchor="middle" font-family="'Playfair Display', 'Times New Roman', serif" font-style="italic" font-weight="600" font-size="27" letter-spacing="-1.5" fill="url(#am-monogram-gradient)">AS</text>
              <path d="M12,44 Q19,45 24,40" fill="none" stroke="url(#am-monogram-gradient)" stroke-width="1" stroke-linecap="round" />
              <ellipse cx="15.5" cy="43.5" rx="2.6" ry="1.1" transform="rotate(-18 15.5 43.5)" fill="url(#am-monogram-gradient)" />
              <ellipse cx="19.5" cy="44.3" rx="2.6" ry="1.1" transform="rotate(-6 19.5 44.3)" fill="url(#am-monogram-gradient)" />
              <ellipse cx="23.2" cy="42.5" rx="2.4" ry="1" transform="rotate(20 23.2 42.5)" fill="url(#am-monogram-gradient)" />
              <path d="M68,44 Q61,45 56,40" fill="none" stroke="url(#am-monogram-gradient)" stroke-width="1" stroke-linecap="round" />
              <ellipse cx="64.5" cy="43.5" rx="2.6" ry="1.1" transform="rotate(18 64.5 43.5)" fill="url(#am-monogram-gradient)" />
              <ellipse cx="60.5" cy="44.3" rx="2.6" ry="1.1" transform="rotate(6 60.5 44.3)" fill="url(#am-monogram-gradient)" />
              <ellipse cx="56.8" cy="42.5" rx="2.4" ry="1" transform="rotate(-20 56.8 42.5)" fill="url(#am-monogram-gradient)" />
              <path d="M40,45 L40,54" stroke="url(#am-monogram-gradient)" stroke-width="1" stroke-linecap="round" />
              <rect x="37" y="55" width="6" height="6" transform="rotate(45 40 58)" fill="url(#am-monogram-gradient)" />
            </g>

            <rect
              x="0"
              y="0"
              width="80"
              height="66"
              fill="url(#am-flap-monogram-shimmer)"
              clip-path="url(#am-flap-monogram-clip)"
              style="mix-blend-mode: overlay"
            />
          </svg>
        </div>
        <button class="am-envelope-seal" type="button" aria-label="فتح الدعوة">
          <span class="am-envelope-seal-mark">AS</span>
        </button>
        <p class="am-envelope-hint" dir="rtl" lang="ar" role="button" tabindex="-1" aria-label="فتح الدعوة">اضغط هنا</p>
      </div>
      <button class="am-envelope-close-btn" type="button" aria-label="غلق الصفحة">غلق الصفحة</button>
    `;
    document.body.appendChild(this.element);

    this.box = this.element.querySelector(".am-envelope-3d");
    this.flap = this.element.querySelector(".am-envelope-flap");
    this.seal = this.element.querySelector(".am-envelope-seal");
    this.card = this.element.querySelector(".am-envelope-card");
    this.pocket = this.element.querySelector(".am-envelope-pocket");
    this.hint = this.element.querySelector(".am-envelope-hint");
    this.closeButton = this.element.querySelector(".am-envelope-close-btn");

    this.seal.disabled = true;

    this._bindEvents();
    this._playEntrance();
  }

  _bindEvents() {
    this._onSealClick = () => this._handleOpen();
    this._onHintClick = () => this._handleOpen();
    this._onHintKeydown = (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      this._handleOpen();
    };
    this._onOutsideClick = (event) => {
      if (this.state === STATE.OPEN && !this.box.contains(event.target))
        this._handleClose();
    };
    this._onCloseButtonClick = () => this._handleClose();

    this.seal.addEventListener("click", this._onSealClick);
    this.hint.addEventListener("click", this._onHintClick);
    this.hint.addEventListener("keydown", this._onHintKeydown);
    document.addEventListener("click", this._onOutsideClick);
    this.closeButton.addEventListener("click", this._onCloseButtonClick);
  }

  _playEntrance() {
    this.state = STATE.APPEARING;

    gsap.set(this.box, { scale: ENVELOPE_ENTRANCE_START_SCALE });

    gsap.to(this.box, {
      opacity: 1,
      scale: 1,
      duration: ENVELOPE_ENTRANCE_DURATION,
      ease: "power2.out",
      onComplete: () => this._settle(),
    });
  }

  _settle() {
    this.state = STATE.CLOSED;
    this.seal.disabled = false;

    this.box.classList.add("is-floating");
    this.hint.classList.add("is-visible");
    this.hint.tabIndex = 0;

    this._pulseTween = gsap.to(this.seal, {
      scale: ENVELOPE_SEAL_PULSE_SCALE,
      duration: ENVELOPE_SEAL_PULSE_DURATION,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
    });
  }

  // A single `.is-open` class toggle drives the reveal via CSS
  // transitions (see Envelope.css): the seal breaks/fades (Part 1),
  // then the flap rotates open on its top hinge (Part 2), then — only
  // once that rotation is fully done — the card rises out of the
  // pocket (Part 3, layering not handled yet). The card's own
  // transform transition is the longest-running/last-finishing one in
  // the sequence, so its transitionend marks the whole thing complete.
  _handleOpen() {
    if (this.isLocked || this.state !== STATE.CLOSED) return;

    // Music starts here, as the very first thing this handler does —
    // this call is itself inside the trusted seal-tap/click gesture,
    // which is what iOS Safari actually requires for resume() to
    // reliably unlock (a generic window-level listener a few ticks
    // later isn't good enough there). AudioManager.resume() is
    // idempotent/safe to call even if already unlocked. "card:open"
    // then fires the bgm PLAY cue (see AliMuneerAudioCues.js) so
    // playback starts synchronously alongside the card's own opening
    // animation below rather than waiting on it.
    if (this.audio) {
      this.audio.resume();
      this.audio.trigger("card:open");
    }

    this.state = STATE.OPENING;

    this.seal.disabled = true;
    this.box.classList.remove("is-floating");
    this.hint.classList.remove("is-visible");
    this.hint.tabIndex = -1;
    if (this._pulseTween) this._pulseTween.kill();
    // The idle pulse leaves its last GSAP-written inline transform on
    // the seal — clear it (and force a reflow) so the CSS `.is-open`
    // transform below actually transitions from the seal's resting
    // state instead of being silently overridden by that leftover
    // inline style.
    gsap.set(this.seal, { clearProps: "transform" });
    void this.seal.offsetWidth;
    gsap.killTweensOf(this.box);

    this.box.classList.add("is-open");
    this._waitForCardTransition(() => this._becomeOpen());
  }

  // Once the rise is fully done, bring the card the rest of the way
  // toward the viewer (see the `.is-card-near` rule in Envelope.css) —
  // a separate, independently-timed step layered on top of the rise,
  // not a change to it.
  _becomeOpen() {
    this.state = STATE.OPEN;
    this.box.classList.add("is-card-near");
    // The button must only start counting down once the card's forward
    // approach (its own separately-timed transform transition, see
    // .is-card-near in Envelope.css) has actually finished — reuse the
    // same transitionend gate the rise itself just used above, rather
    // than guessing at a matching setTimeout duration for that part.
    this._waitForCardTransition(() => this._scheduleCloseButton());
  }

  // The card has now fully settled in front of the viewer — hold here
  // for a deliberate 3s pause before offering the close button, so it
  // doesn't compete with the reader's first moment with the card.
  _scheduleCloseButton() {
    this._closeButtonTimeout = setTimeout(() => this._showCloseButton(), 3000);
  }

  _showCloseButton() {
    this._closeButtonTimeout = null;
    this.closeButton.classList.add("is-visible");
  }

  // Kicks off the full 3-step reverse sequence: Step 2 reverses only the
  // card's forward approach (the near-zoom added in _becomeOpen()),
  // bringing it back to the exact position it held right after rising
  // out of the pocket; Step 3 (_slideCardIntoPocket) then slides it back
  // down and swaps it behind the pocket; Step 4 (_closeFlap) folds the
  // flap down, restores the seal, and resets state to CLOSED.
  _handleClose() {
    if (this.state !== STATE.OPEN) return;
    this.state = STATE.CLOSING;

    // Closing can happen before the 3s reveal delay has even elapsed
    // (e.g. an outside click) — cancel the pending timer so the button
    // can never pop in after the close sequence has already started.
    if (this._closeButtonTimeout) {
      clearTimeout(this._closeButtonTimeout);
      this._closeButtonTimeout = null;
    }
    // Fades out via the existing opacity/transform transition already
    // defined on .am-envelope-close-btn (see Envelope.css) — removing
    // the class alone is enough to hide it.
    this.closeButton.classList.remove("is-visible");

    // "اضغط هنا" must stay hidden for the entire reverse sequence — it
    // only belongs to the fully-idle closed state. Explicit defensive
    // clear here (it's already never re-added before this point, but
    // this makes that guarantee obvious rather than relying purely on
    // .am-envelope-3d.is-open .am-envelope-hint's own CSS specificity).
    // `.box` deliberately keeps its `is-open` class throughout Steps
    // 2-3 below — that's what keeps this CSS rule suppressing the hint
    // the whole time — and only Step 4 (_closeFlap(), further below)
    // removes it, which is also where the hint is finally allowed to
    // fade back in (see _becomeClosed()).
    this.hint.classList.remove("is-visible");

    this._reverseCardApproach();
  }

  // Hands transform control on the card over to GSAP for a slow,
  // elegant scale-down + pull-back, instead of the instant CSS
  // transition class-toggling everything else in this file relies on
  // — that stylesheet transition (0.7s) reads too quick and mechanical
  // for the "premium" motion this specific step calls for. Pins the
  // card's current transform explicitly first (mirroring the exact
  // `.is-open.is-card-near` values in Envelope.css) and kills the CSS
  // transition on it, so GSAP's own per-frame writes to `transform`
  // never fight the stylesheet for the same property mid-tween.
  _reverseCardApproach() {
    this.box.classList.remove("is-card-near");

    this.card.style.transition = "none";
    gsap.set(this.card, { y: "4%", z: 480, scale: 1.14 });
    void this.card.offsetWidth;

    if (this._cardReverseTween) this._cardReverseTween.kill();
    this._cardReverseTween = gsap.to(this.card, {
      y: "-46%",
      z: 0,
      scale: 1.06,
      duration: 1.35,
      ease: "power3.inOut",
      onComplete: () => {
        this._cardReverseTween = null;
        // Card is now hovering exactly where it sat right after
        // sliding out of the envelope — hand off to Step 3.
        this._slideCardIntoPocket();
      },
    });
  }

  // Step 3 — the exact reverse of the original rise: the card descends
  // from its risen resting spot (translateY(-46%) scale(1.06), the same
  // values .am-envelope-3d.is-open .am-envelope-card itself defines)
  // back down to translateY(0) scale(1), the card's own plain resting
  // transform inside the pocket.
  //
  // Layering: during the original rise the card starts BEHIND the
  // pocket (z-index 2 < pocket's 3) and only flips in front (z-index 6)
  // once it has risen far enough to clear the pocket's own triangular
  // silhouette — timed via the 1.68s delay on both
  // .am-envelope-card's z-index transition and .am-envelope-pocket's
  // opacity transition in Envelope.css, landing 0.63s into the rise's
  // own 1.4s transform transition (which itself starts 1.05s after
  // `.is-open` is toggled) — i.e. 0.63 / 1.4 ≈ 45% of the way through
  // the rise. Descending covers the exact same physical y-range the
  // other way, so that same crossing point falls at the mirrored
  // fraction of *this* tween: 1 - 0.45 = 0.55. At that instant the card
  // must drop back behind the pocket (z-index 2) and the pocket must
  // reappear (opacity 1) in the same single instant — an instant swap,
  // not a fade, exactly mirroring the original's own 0s-duration swap —
  // so the card visibly disappears behind the pocket as it finishes
  // sliding in, rather than sliding in front of it.
  _slideCardIntoPocket() {
    gsap.set(this.card, { y: "-46%", z: 0, scale: 1.06, zIndex: 6 });
    void this.card.offsetWidth;

    const DURATION = 1.4;
    const SWAP_FRACTION = 0.55;

    if (this._cardDescendTimeline) this._cardDescendTimeline.kill();
    this._cardDescendTimeline = gsap.timeline({
      onComplete: () => {
        this._cardDescendTimeline = null;
        // Card is now fully seated back in the pocket, hidden behind
        // it, exactly as in the original closed state — hand off to
        // Step 4.
        this._closeFlap();
      },
    });
    this._cardDescendTimeline.to(
      this.card,
      { y: "0%", scale: 1, duration: DURATION, ease: "power3.inOut" },
      0,
    );
    this._cardDescendTimeline.call(
      () => {
        this.card.style.zIndex = "2";
        this.pocket.style.opacity = "1";
      },
      null,
      DURATION * SWAP_FRACTION,
    );
  }

  // Step 4 — folds the flap back down over the (now hidden) card, then
  // restores the wax seal, then does a full state reset so the whole
  // sequence can be replayed identically from a click.
  //
  // The wax seal's own CSS transition has no delay (see
  // .am-envelope-seal in Envelope.css — it's the very first thing to
  // move on open, phase 1), so simply removing `.is-open` here would
  // let it fade back in immediately, in parallel with the flap's own
  // 0.2s-delay + 0.85s rotation — i.e. the seal would reappear while
  // the flap is still visibly mid-swing, floating in front of an open
  // flap instead of sealing a closed one. Force-holding it in its
  // broken-open look via inline style (highest specificity, beats any
  // class rule) until the flap's own transitionend actually fires is
  // what enforces "flap closed, then seal restored" as a real sequence
  // rather than two CSS transitions racing each other.
  _closeFlap() {
    this.seal.style.opacity = "0";
    this.seal.style.transform = "translate(-50%, -50%) scale(1.15)";

    // Removing `.is-open` here hands the flap back to its own base
    // transition (same 0.2s delay + 0.85s duration either direction,
    // since that transition lives on .am-envelope-flap itself, not a
    // `.is-open`-only rule) — and, just as importantly, hands the card
    // and pocket back to their own base CSS rules (z-index 2 / opacity
    // 1), which already numerically match the inline overrides Step 3
    // left behind. That's why those inline overrides are only cleared
    // *after* this line, not before — clearing them earlier, while
    // `.is-open` was still applied, would have snapped the card back up
    // to the `.is-open .am-envelope-card` position for an instant.
    this.box.classList.remove("is-open");

    // Hand transform control on the card back to plain CSS (undoing the
    // `transition: none` + inline transform Step 2 set) and drop the
    // pocket's inline opacity override — both are now redundant with
    // the base rules that just took over above, but leaving them in
    // place would silently break the *next* open cycle: an inline style
    // always wins over `.is-open .am-envelope-card`/`.am-envelope-pocket`
    // regardless of specificity, so the rise/pocket-fade would never
    // fire again.
    this.card.style.transition = "";
    gsap.set(this.card, { clearProps: "transform,zIndex" });
    this.pocket.style.opacity = "";

    this._waitForFlapTransition(() => this._restoreSeal());
  }

  _restoreSeal() {
    // Release the forced-hidden overrides above so the seal's own base
    // CSS (opacity 1, resting translate(-50%,-50%), 0.3s transition)
    // takes back over and plays its own fade/settle back into place —
    // now that the flap has actually finished folding down over it.
    this.seal.style.opacity = "";
    this.seal.style.transform = "";

    this._becomeClosed();
  }

  _waitForFlapTransition(onDone) {
    if (this._onFlapTransitionEnd)
      this.flap.removeEventListener("transitionend", this._onFlapTransitionEnd);

    this._onFlapTransitionEnd = (event) => {
      if (event.target !== this.flap || event.propertyName !== "transform")
        return;
      this.flap.removeEventListener("transitionend", this._onFlapTransitionEnd);
      this._onFlapTransitionEnd = null;
      onDone();
    };
    this.flap.addEventListener("transitionend", this._onFlapTransitionEnd);
  }

  _waitForCardTransition(onDone) {
    if (this._onCardTransitionEnd)
      this.card.removeEventListener("transitionend", this._onCardTransitionEnd);

    this._onCardTransitionEnd = (event) => {
      if (event.target !== this.card || event.propertyName !== "transform")
        return;
      this.card.removeEventListener("transitionend", this._onCardTransitionEnd);
      this._onCardTransitionEnd = null;
      onDone();
    };
    this.card.addEventListener("transitionend", this._onCardTransitionEnd);
  }

  // Step 4 has now fully finished (flap down, seal restored) — this is
  // the one and only close cycle this envelope allows, so lock it here
  // instead of re-arming the seal/hint for another open. The envelope
  // stays on screen as a static display piece from this point on.
  _becomeClosed() {
    this.state = STATE.CLOSED;
    this.isLocked = true;
    this.box.classList.add("is-floating");

    this._scheduleDismiss();
  }

  // A short pause after the lock so the closed envelope actually
  // registers with the viewer before it starts receding — then the
  // whole envelope (this.box, its one root wrapper — see the
  // perspective comment on #am-envelope in Envelope.css) moves back in
  // depth, scales down and fades out together as a single cinematic
  // exit. Nothing else in the scene (background, ornaments, layout) is
  // touched. Purely additive to the already-finished open/close cycle —
  // none of that animation is altered here.
  _scheduleDismiss() {
    this._dismissTimeout = setTimeout(
      () => this._dismiss(),
      ENVELOPE_DISMISS_DELAY * 1000,
    );
  }

  _dismiss() {
    this._dismissTimeout = null;
    this.box.classList.remove("is-floating");

    if (this._dismissTween) this._dismissTween.kill();
    this._dismissTween = gsap.to(this.box, {
      z: ENVELOPE_DISMISS_Z,
      scale: ENVELOPE_DISMISS_SCALE,
      opacity: 0,
      duration: ENVELOPE_DISMISS_DURATION,
      ease: "power2.inOut",
      onComplete: () => {
        this._dismissTween = null;
        this.isDismissed = true;
        if (this._onDismissed) this._onDismissed();
      },
    });
  }

  update(delta) {}

  destroy() {
    if (this._pulseTween) this._pulseTween.kill();
    if (this._cardReverseTween) this._cardReverseTween.kill();
    if (this._cardDescendTimeline) this._cardDescendTimeline.kill();
    if (this._closeButtonTimeout) clearTimeout(this._closeButtonTimeout);
    if (this._dismissTimeout) clearTimeout(this._dismissTimeout);
    if (this._dismissTween) this._dismissTween.kill();
    gsap.killTweensOf(this.box);
    gsap.killTweensOf(this.seal);

    if (this._onCardTransitionEnd)
      this.card.removeEventListener("transitionend", this._onCardTransitionEnd);
    if (this._onFlapTransitionEnd)
      this.flap.removeEventListener("transitionend", this._onFlapTransitionEnd);
    this.seal.removeEventListener("click", this._onSealClick);
    this.hint.removeEventListener("click", this._onHintClick);
    this.hint.removeEventListener("keydown", this._onHintKeydown);
    document.removeEventListener("click", this._onOutsideClick);
    this.closeButton.removeEventListener("click", this._onCloseButtonClick);

    this.element.remove();
  }
}
