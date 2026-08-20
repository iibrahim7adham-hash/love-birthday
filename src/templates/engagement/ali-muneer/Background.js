import gsap from "gsap";

import "./Background.css";
import {
  OPENING_ATMOSPHERE_DELAY,
  OPENING_ATMOSPHERE_DURATION,
  OPENING_MARBLE_OPACITY,
  OPENING_LEAF_OPACITY,
  OPENING_MARBLE_FILL_FROM,
  OPENING_MARBLE_FILL_TO,
  OPENING_LEAF_COLOR,
  OPENING_SPARKLE_FADE_DURATION,
  OPENING_SPARKLE_OPACITY_RANGE,
  OPENING_SPARKLE_TWINKLE_DURATION_RANGE,
} from "./Constants";

// A single elongated leaf, drawn relative to its own base point, fanned
// out at different rotations/scales/offsets below to read as one
// branch entering the frame rather than a single repeated stamp.
const LEAF_PATH = "M0,0 C-20,-24 -22,-70 0,-120 C22,-70 20,-24 0,0 Z";
const LEAVES = [
  { x: 6, y: 4, rotation: 108, scale: 1.05 },
  { x: 50, y: 14, rotation: 128, scale: 0.9 },
  { x: 92, y: 34, rotation: 150, scale: 0.8 },
  { x: 14, y: 54, rotation: 92, scale: 0.85 },
  { x: 58, y: 68, rotation: 114, scale: 0.65 },
  { x: 118, y: 58, rotation: 164, scale: 0.55 },
];

function leavesSvg() {
  const leaves = LEAVES.map(
    ({ x, y, rotation, scale }) =>
      `<path d="${LEAF_PATH}" fill="${OPENING_LEAF_COLOR}" transform="translate(${x},${y}) rotate(${rotation}) scale(${scale})" />`,
  ).join("");

  return `
    <svg viewBox="0 0 300 260" preserveAspectRatio="xMinYMin meet">
      <path d="M0,0 C40,10 90,30 140,90" fill="none" stroke="${OPENING_LEAF_COLOR}" stroke-width="1.4" opacity="0.6" />
      ${leaves}
    </svg>
  `;
}

// One larger back layer and one smaller front layer, both fading to
// fully transparent toward the center via their own gradient — that's
// what keeps the middle of the screen clean regardless of how visible
// the corner itself reads. Reused for all four corners; Background.css
// mirrors the right/top ones with plain CSS scale flips.
const FILL_PATH_BACK =
  "M35,255 C0,205 5,135 55,95 C110,50 195,45 245,90 C285,125 285,190 245,230 C195,278 90,300 35,255 Z";
const FILL_PATH_FRONT =
  "M60,225 C35,175 55,115 105,90 C155,65 215,80 240,120 C262,155 245,200 200,222 C155,246 88,262 60,225 Z";

const VEINS = [
  "M20,260 C60,200 40,140 110,110 C160,90 150,50 210,30",
  "M40,250 C90,210 80,160 150,130 C185,115 190,90 220,75",
  "M12,205 C55,190 70,155 130,150 C170,150 180,120 225,105",
];

function marbleSvg(gradientId) {
  const veins = VEINS.map(
    (d, index) =>
      `<path class="ali-muneer-bg-marble-vein" d="${d}" stroke-width="${1.6 - index * 0.3}" opacity="${0.5 - index * 0.1}" />`,
  ).join("");

  return `
    <svg viewBox="0 0 300 300" preserveAspectRatio="none">
      <defs>
        <linearGradient id="${gradientId}" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stop-color="${OPENING_MARBLE_FILL_FROM}" stop-opacity="0.85" />
          <stop offset="100%" stop-color="${OPENING_MARBLE_FILL_TO}" stop-opacity="0" />
        </linearGradient>
      </defs>
      <g class="ali-muneer-bg-marble-fill">
        <path d="${FILL_PATH_BACK}" fill="url(#${gradientId})" />
        <path d="${FILL_PATH_FRONT}" fill="url(#${gradientId})" opacity="0.7" />
      </g>
      ${veins}
    </svg>
  `;
}

// A handful of sparkles resting near the marble veins in each corner,
// plus one or two near the upper-left leaves — kept sparse.
const SPARKLE_POSITIONS = [
  { top: "8%", left: "30%" },
  { top: "70%", left: "14%" },
  { top: "82%", left: "28%" },
  { top: "76%", left: "86%" },
  { top: "88%", left: "70%" },
];

function randomBetween([min, max]) {
  return min + Math.random() * (max - min);
}

// The persistent decorative setting behind BOTH Scene 1 and Scene 2 —
// soft leaf shadows from the upper-left, flowing champagne-marble
// veining in all four corners, and a few sparse gold sparkles.
// Constructed once by AliMuneerScene and never destroyed until the
// whole scene tears down, so it stays visible, unchanged, and running
// across the Scene 1 -> Scene 2 handoff — Opening.js (the Bismillah)
// and Envelope.js (Scene 2) both render on top of this same element,
// completely independent of its own lifecycle.
export default class Background {
  constructor() {
    this.element = document.createElement("div");
    this.element.id = "ali-muneer-background";
    this.element.innerHTML = `
      <div class="ali-muneer-bg-leaves">${leavesSvg()}</div>
      <div class="ali-muneer-bg-marble ali-muneer-bg-marble--tl">${marbleSvg("am-marble-tl")}</div>
      <div class="ali-muneer-bg-marble ali-muneer-bg-marble--tr">${marbleSvg("am-marble-tr")}</div>
      <div class="ali-muneer-bg-marble ali-muneer-bg-marble--bl">${marbleSvg("am-marble-bl")}</div>
      <div class="ali-muneer-bg-marble ali-muneer-bg-marble--br">${marbleSvg("am-marble-br")}</div>
    `;
    document.body.appendChild(this.element);

    this.leaves = this.element.querySelector(".ali-muneer-bg-leaves");
    this.marbles = this.element.querySelectorAll(".ali-muneer-bg-marble");

    this.sparkles = this._createSparkles();
    this._twinkleTweens = [];

    this._playEntrance();
  }

  _createSparkles() {
    return SPARKLE_POSITIONS.map((position) => {
      const sparkle = document.createElement("span");
      sparkle.className = "ali-muneer-bg-sparkle";
      sparkle.style.top = position.top;
      sparkle.style.left = position.left;
      this.element.appendChild(sparkle);
      return sparkle;
    });
  }

  _playEntrance() {
    const tl = gsap.timeline({ onComplete: () => this._startAmbientLoop() });
    this._tween = tl;

    tl.to(
      this.leaves,
      { opacity: OPENING_LEAF_OPACITY, duration: OPENING_ATMOSPHERE_DURATION, ease: "sine.inOut" },
      OPENING_ATMOSPHERE_DELAY,
    );
    tl.to(
      this.marbles,
      { opacity: OPENING_MARBLE_OPACITY, duration: OPENING_ATMOSPHERE_DURATION, ease: "sine.inOut" },
      OPENING_ATMOSPHERE_DELAY,
    );

    this.sparkles.forEach((sparkle, index) => {
      const targetOpacity = randomBetween(OPENING_SPARKLE_OPACITY_RANGE);
      tl.to(
        sparkle,
        { opacity: targetOpacity, duration: OPENING_SPARKLE_FADE_DURATION, ease: "sine.inOut" },
        OPENING_ATMOSPHERE_DELAY + 1.2 + index * 0.35,
      );
    });
  }

  // Once everything has arrived, a barely-there ongoing life: each
  // sparkle twinkles very slowly on its own independent cycle. The
  // leaves and marble stay still. Keeps running for as long as this
  // instance exists — i.e. through Scene 2 as well.
  _startAmbientLoop() {
    this.sparkles.forEach((sparkle) => {
      const duration = randomBetween(OPENING_SPARKLE_TWINKLE_DURATION_RANGE);
      const baseOpacity = gsap.getProperty(sparkle, "opacity");
      this._twinkleTweens.push(
        gsap.to(sparkle, {
          opacity: Math.max(0.1, baseOpacity - 0.2),
          duration,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
        }),
      );
    });
  }

  update(delta) {}

  destroy() {
    if (this._tween) this._tween.kill();
    this._twinkleTweens.forEach((tween) => tween.kill());

    this.element.remove();
  }
}
