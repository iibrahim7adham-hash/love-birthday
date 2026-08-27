import "./Hero.css";
import {
  HERO_MONOGRAM_TEXT,
  HERO_SUBTITLE_TEXT,
  HERO_GROOM_NAME,
  HERO_BRIDE_NAME,
  HERO_BODY_TEXT,
  HERO_DATE_TEXT,
} from "../Constants";

// Scene 3 — the main HTML UI overlay that takes over once the 3D
// envelope (Scene 2, see envelope/Envelope.js) has fully finished its
// "move away and fade out" dismiss transition. AliMuneerScene only
// constructs this class from the envelope's own onDismissed callback
// (see _beginHero() there), so by construction this never renders
// before that transition is completely done — no visibility gating
// needed here.
//
// A plain DOM+CSS overlay, the same technique Opening/Envelope already
// use, built in parts. This file now covers PART 1 (monogram, subtitle,
// crest ornament), PART 2 (the groom/bride names, stacked with a small
// "&" between them, plus a small star divider below them), PART 3
// (body text and date), and PART 4 (the staggered fade-up entrance for
// all of the above — see the `.ali-muneer-hero-anim`/
// `.ali-muneer-hero-anim-N` rules in Hero.css; each element below just
// carries the step number it belongs to, the keyframe/timing itself
// lives entirely in CSS).
export default class Hero {
  constructor() {
    this.element = document.createElement("div");
    this.element.id = "ali-muneer-hero";
    this.element.innerHTML = `
      <div class="ali-muneer-hero-content">
        <div class="ali-muneer-hero-monogram ali-muneer-hero-anim ali-muneer-hero-anim-1">
          <svg class="ali-muneer-hero-monogram-svg" viewBox="0 0 220 220" aria-hidden="true">
            <defs>
              <linearGradient id="am-hero-monogram-gradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#d8bd88" />
                <stop offset="45%" stop-color="#c8a96b" />
                <stop offset="100%" stop-color="#a9854f" />
              </linearGradient>
            </defs>

            <circle cx="110" cy="110" r="92" fill="none" stroke="url(#am-hero-monogram-gradient)" stroke-width="1.4" opacity="0.75" />
            <circle cx="110" cy="110" r="82" fill="none" stroke="url(#am-hero-monogram-gradient)" stroke-width="0.6" opacity="0.4" />

            <g transform="translate(110,20) scale(0.55)">
              <path d="M0,0 C-1.8,-4.4 -1.6,-8.8 0,-13 C1.6,-8.8 1.8,-4.4 0,0 Z" transform="rotate(0)" fill="url(#am-hero-monogram-gradient)" />
              <path d="M0,0 C-1.8,-4.4 -1.6,-8.8 0,-13 C1.6,-8.8 1.8,-4.4 0,0 Z" transform="rotate(45)" fill="url(#am-hero-monogram-gradient)" opacity="0.85" />
              <path d="M0,0 C-1.8,-4.4 -1.6,-8.8 0,-13 C1.6,-8.8 1.8,-4.4 0,0 Z" transform="rotate(90)" fill="url(#am-hero-monogram-gradient)" />
              <path d="M0,0 C-1.8,-4.4 -1.6,-8.8 0,-13 C1.6,-8.8 1.8,-4.4 0,0 Z" transform="rotate(135)" fill="url(#am-hero-monogram-gradient)" opacity="0.85" />
              <path d="M0,0 C-1.8,-4.4 -1.6,-8.8 0,-13 C1.6,-8.8 1.8,-4.4 0,0 Z" transform="rotate(180)" fill="url(#am-hero-monogram-gradient)" />
              <path d="M0,0 C-1.8,-4.4 -1.6,-8.8 0,-13 C1.6,-8.8 1.8,-4.4 0,0 Z" transform="rotate(225)" fill="url(#am-hero-monogram-gradient)" opacity="0.85" />
              <path d="M0,0 C-1.8,-4.4 -1.6,-8.8 0,-13 C1.6,-8.8 1.8,-4.4 0,0 Z" transform="rotate(270)" fill="url(#am-hero-monogram-gradient)" />
              <path d="M0,0 C-1.8,-4.4 -1.6,-8.8 0,-13 C1.6,-8.8 1.8,-4.4 0,0 Z" transform="rotate(315)" fill="url(#am-hero-monogram-gradient)" opacity="0.85" />
              <circle r="2.4" fill="url(#am-hero-monogram-gradient)" stroke="#8a6d3b" stroke-width="0.4" />
              <circle r="1" fill="#fff5c0" opacity="0.85" />
            </g>

            <text x="110" y="128" text-anchor="middle" font-family="'Playfair Display', Georgia, serif" font-style="italic" font-weight="600" font-size="70" letter-spacing="-4" fill="url(#am-hero-monogram-gradient)">${HERO_MONOGRAM_TEXT}</text>

            <path d="M70,152 Q86,158 100,148" fill="none" stroke="url(#am-hero-monogram-gradient)" stroke-width="1" stroke-linecap="round" opacity="0.85" />
            <ellipse cx="76" cy="151.5" rx="4.4" ry="1.8" transform="rotate(-16 76 151.5)" fill="url(#am-hero-monogram-gradient)" opacity="0.85" />
            <ellipse cx="86" cy="153.5" rx="4.4" ry="1.8" transform="rotate(-4 86 153.5)" fill="url(#am-hero-monogram-gradient)" opacity="0.85" />
            <ellipse cx="95" cy="150.5" rx="4" ry="1.7" transform="rotate(18 95 150.5)" fill="url(#am-hero-monogram-gradient)" opacity="0.85" />

            <path d="M150,152 Q134,158 120,148" fill="none" stroke="url(#am-hero-monogram-gradient)" stroke-width="1" stroke-linecap="round" opacity="0.85" />
            <ellipse cx="144" cy="151.5" rx="4.4" ry="1.8" transform="rotate(16 144 151.5)" fill="url(#am-hero-monogram-gradient)" opacity="0.85" />
            <ellipse cx="134" cy="153.5" rx="4.4" ry="1.8" transform="rotate(4 134 153.5)" fill="url(#am-hero-monogram-gradient)" opacity="0.85" />
            <ellipse cx="125" cy="150.5" rx="4" ry="1.7" transform="rotate(-18 125 150.5)" fill="url(#am-hero-monogram-gradient)" opacity="0.85" />

            <path d="M110,160 L110,172" stroke="url(#am-hero-monogram-gradient)" stroke-width="1" stroke-linecap="round" opacity="0.85" />
            <rect x="106" y="173" width="8" height="8" transform="rotate(45 110 177)" fill="url(#am-hero-monogram-gradient)" opacity="0.85" />
          </svg>
        </div>
        <p class="ali-muneer-hero-subtitle ali-muneer-hero-anim ali-muneer-hero-anim-2" dir="rtl" lang="ar">${HERO_SUBTITLE_TEXT}</p>
        <svg class="ali-muneer-hero-crest ali-muneer-hero-anim ali-muneer-hero-anim-2" viewBox="0 0 220 60" aria-hidden="true">
          <defs>
            <path id="am-hero-crest-petal-outer" d="M0,0 C-3.4,-8.2 -3,-16.4 0,-24 C3,-16.4 3.4,-8.2 0,0 Z" />
            <path id="am-hero-crest-petal-inner" d="M0,-3.5 C-1.5,-8 -1.2,-13 0,-17.5 C1.2,-13 1.5,-8 0,-3.5 Z" />
          </defs>
          <g transform="translate(110,30)">
            <use href="#am-hero-crest-petal-outer" transform="rotate(0)" fill="#C19F62" />
            <use href="#am-hero-crest-petal-outer" transform="rotate(45)" fill="#C19F62" opacity="0.85" />
            <use href="#am-hero-crest-petal-outer" transform="rotate(90)" fill="#C19F62" />
            <use href="#am-hero-crest-petal-outer" transform="rotate(135)" fill="#C19F62" opacity="0.85" />
            <use href="#am-hero-crest-petal-outer" transform="rotate(180)" fill="#C19F62" />
            <use href="#am-hero-crest-petal-outer" transform="rotate(225)" fill="#C19F62" opacity="0.85" />
            <use href="#am-hero-crest-petal-outer" transform="rotate(270)" fill="#C19F62" />
            <use href="#am-hero-crest-petal-outer" transform="rotate(315)" fill="#C19F62" opacity="0.85" />

            <use href="#am-hero-crest-petal-inner" transform="rotate(0)" fill="none" stroke="#FFF5C0" stroke-width="0.4" opacity="0.8" />
            <use href="#am-hero-crest-petal-inner" transform="rotate(45)" fill="none" stroke="#FFF5C0" stroke-width="0.4" opacity="0.8" />
            <use href="#am-hero-crest-petal-inner" transform="rotate(90)" fill="none" stroke="#FFF5C0" stroke-width="0.4" opacity="0.8" />
            <use href="#am-hero-crest-petal-inner" transform="rotate(135)" fill="none" stroke="#FFF5C0" stroke-width="0.4" opacity="0.8" />
            <use href="#am-hero-crest-petal-inner" transform="rotate(180)" fill="none" stroke="#FFF5C0" stroke-width="0.4" opacity="0.8" />
            <use href="#am-hero-crest-petal-inner" transform="rotate(225)" fill="none" stroke="#FFF5C0" stroke-width="0.4" opacity="0.8" />
            <use href="#am-hero-crest-petal-inner" transform="rotate(270)" fill="none" stroke="#FFF5C0" stroke-width="0.4" opacity="0.8" />
            <use href="#am-hero-crest-petal-inner" transform="rotate(315)" fill="none" stroke="#FFF5C0" stroke-width="0.4" opacity="0.8" />

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
        <p class="ali-muneer-hero-name ali-muneer-hero-anim ali-muneer-hero-anim-3" dir="rtl" lang="ar">${HERO_GROOM_NAME}</p>
        <div class="ali-muneer-hero-amp-row ali-muneer-hero-anim ali-muneer-hero-anim-3">
          <span class="ali-muneer-hero-amp-arrow">›</span>
          <span class="ali-muneer-hero-amp">&amp;</span>
          <span class="ali-muneer-hero-amp-arrow">‹</span>
        </div>
        <p class="ali-muneer-hero-name ali-muneer-hero-anim ali-muneer-hero-anim-3" dir="rtl" lang="ar">${HERO_BRIDE_NAME}</p>
        <div class="ali-muneer-hero-names-divider ali-muneer-hero-anim ali-muneer-hero-anim-3">
          <span class="ali-muneer-hero-names-divider-line"></span>
          <svg class="ali-muneer-hero-names-divider-star" viewBox="0 0 40 40" aria-hidden="true">
            <defs>
              <path id="am-hero-star-spike" d="M0,0 C-1.8,-4.4 -1.6,-8.8 0,-13 C1.6,-8.8 1.8,-4.4 0,0 Z" />
            </defs>
            <g transform="translate(20,20)">
              <use href="#am-hero-star-spike" transform="rotate(0)" fill="#C19F62" />
              <use href="#am-hero-star-spike" transform="rotate(45)" fill="#C19F62" opacity="0.85" />
              <use href="#am-hero-star-spike" transform="rotate(90)" fill="#C19F62" />
              <use href="#am-hero-star-spike" transform="rotate(135)" fill="#C19F62" opacity="0.85" />
              <use href="#am-hero-star-spike" transform="rotate(180)" fill="#C19F62" />
              <use href="#am-hero-star-spike" transform="rotate(225)" fill="#C19F62" opacity="0.85" />
              <use href="#am-hero-star-spike" transform="rotate(270)" fill="#C19F62" />
              <use href="#am-hero-star-spike" transform="rotate(315)" fill="#C19F62" opacity="0.85" />
              <circle r="2.4" fill="#C19F62" stroke="#8A6D3B" stroke-width="0.4" />
              <circle r="1" fill="#FFF5C0" opacity="0.85" />
            </g>
          </svg>
          <span class="ali-muneer-hero-names-divider-line"></span>
        </div>
        <p class="ali-muneer-hero-body ali-muneer-hero-anim ali-muneer-hero-anim-4" dir="rtl" lang="ar">${HERO_BODY_TEXT}</p>
        <p class="ali-muneer-hero-date ali-muneer-hero-anim ali-muneer-hero-anim-4" dir="rtl" lang="ar">${HERO_DATE_TEXT}</p>
        <p class="ali-muneer-hero-scroll-hint ali-muneer-hero-anim ali-muneer-hero-anim-5" aria-hidden="true">
          اسحب للاسفل
          <span class="ali-muneer-hero-scroll-hint-arrow">⌄</span>
        </p>
      </div>
    `;
    document.body.appendChild(this.element);
  }

  update(delta) {}

  destroy() {
    this.element.remove();
  }
}
