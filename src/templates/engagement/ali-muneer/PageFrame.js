import "./PageFrame.css";

// A single corner filigree — three nested curling vines tracing the
// frame's own corner (echoing the double-line border in
// PageFrame.css), each terminating in a spiral scroll, with branching
// tendrils, a scatter of small petals along the vine, and a larger
// 8-spike rosette with its own outer ring nested in the corner — the
// same petal-radial/rosette construction used throughout this template
// (see ORNAMENT_SVG in eventdetails/EventDetails.js), just built out
// into a fuller, denser ornament. Plain inline shapes, no <defs>/<use>
// ids, so the exact same markup can be stamped once per corner without
// any id-collision bookkeeping — CSS mirrors it for the other three
// corners (see .ali-muneer-page-frame-corner--tr/--bl/--br), the same
// technique Background.js already uses for its own four marble
// corners.
const CORNER_MOTIF_SVG = `
  <svg class="ali-muneer-page-frame-corner-svg" viewBox="0 0 80 80" aria-hidden="true">
    <path d="M6,66 C6,32 32,6 66,6" fill="none" stroke="#c8a96b" stroke-width="1.6" opacity="0.7" />
    <path d="M14,58 C14,34 34,14 58,14" fill="none" stroke="#c19f62" stroke-width="1.1" opacity="0.55" />
    <path d="M20,50 C20,36 36,20 50,20" fill="none" stroke="#c19f62" stroke-width="0.7" opacity="0.4" />

    <path d="M66,6 C74,4 80,8 79,14 C78,19 72,20 70,16 C68.5,13 71,10.5 73.5,11.5" fill="none" stroke="#c19f62" stroke-width="1.1" stroke-linecap="round" opacity="0.7" />
    <path d="M6,66 C4,74 8,80 14,79 C19,78 20,72 16,70 C13,68.5 10.5,71 11.5,73.5" fill="none" stroke="#c19f62" stroke-width="1.1" stroke-linecap="round" opacity="0.7" />

    <path d="M34,14 C38,9 45,8 48,12 C50,15 47,18 44,16 C42,14.5 44,12 46,13" fill="none" stroke="#c19f62" stroke-width="0.8" stroke-linecap="round" opacity="0.55" />
    <path d="M14,34 C9,38 8,45 12,48 C15,50 18,47 16,44 C14.5,42 12,44 13,46" fill="none" stroke="#c19f62" stroke-width="0.8" stroke-linecap="round" opacity="0.55" />

    <path d="M22,41 C22,38.4 23.4,36.6 26,36.2" fill="none" stroke="#c19f62" stroke-width="0.6" opacity="0.5" />
    <path d="M0,0 C-3.6,-3.6 -4.2,-8 -2.4,-11.6 C-0.6,-8.6 0.6,-8.6 2.4,-11.6 C4.2,-8 3.6,-3.6 0,0 Z" transform="translate(26,36) rotate(50) scale(0.8)" fill="#c19f62" opacity="0.65" />

    <path d="M41,22 C38.4,22 36.6,23.4 36.2,26" fill="none" stroke="#c19f62" stroke-width="0.6" opacity="0.5" />
    <path d="M0,0 C-3.6,-3.6 -4.2,-8 -2.4,-11.6 C-0.6,-8.6 0.6,-8.6 2.4,-11.6 C4.2,-8 3.6,-3.6 0,0 Z" transform="translate(36,26) rotate(-40) scale(0.8)" fill="#c19f62" opacity="0.65" />

    <path d="M16,52 C14,50 13.4,47.6 14.6,45.4" fill="none" stroke="#c19f62" stroke-width="0.55" opacity="0.4" />
    <path d="M0,0 C-3.2,-3.2 -3.7,-7 -2.1,-10.2 C-0.5,-7.6 0.5,-7.6 2.1,-10.2 C3.7,-7 3.2,-3.2 0,0 Z" transform="translate(15,46) rotate(70) scale(0.6)" fill="#c19f62" opacity="0.5" />

    <path d="M52,16 C50,14 47.6,13.4 45.4,14.6" fill="none" stroke="#c19f62" stroke-width="0.55" opacity="0.4" />
    <path d="M0,0 C-3.2,-3.2 -3.7,-7 -2.1,-10.2 C-0.5,-7.6 0.5,-7.6 2.1,-10.2 C3.7,-7 3.2,-3.2 0,0 Z" transform="translate(46,15) rotate(-20) scale(0.6)" fill="#c19f62" opacity="0.5" />

    <g transform="translate(24,24) scale(0.72)">
      <circle r="11" fill="none" stroke="#c19f62" stroke-width="0.6" opacity="0.4" />
      <circle r="8" fill="none" stroke="#c19f62" stroke-width="0.45" opacity="0.3" />
      <path d="M0,0 C-3.4,-3.2 -3.8,-7.4 0,-11.5 C3.8,-7.4 3.4,-3.2 0,0 Z" transform="rotate(0)" fill="#c19f62" />
      <path d="M0,0 C-3.4,-3.2 -3.8,-7.4 0,-11.5 C3.8,-7.4 3.4,-3.2 0,0 Z" transform="rotate(45)" fill="#c19f62" opacity="0.85" />
      <path d="M0,0 C-3.4,-3.2 -3.8,-7.4 0,-11.5 C3.8,-7.4 3.4,-3.2 0,0 Z" transform="rotate(90)" fill="#c19f62" />
      <path d="M0,0 C-3.4,-3.2 -3.8,-7.4 0,-11.5 C3.8,-7.4 3.4,-3.2 0,0 Z" transform="rotate(135)" fill="#c19f62" opacity="0.85" />
      <path d="M0,0 C-3.4,-3.2 -3.8,-7.4 0,-11.5 C3.8,-7.4 3.4,-3.2 0,0 Z" transform="rotate(180)" fill="#c19f62" />
      <path d="M0,0 C-3.4,-3.2 -3.8,-7.4 0,-11.5 C3.8,-7.4 3.4,-3.2 0,0 Z" transform="rotate(225)" fill="#c19f62" opacity="0.85" />
      <path d="M0,0 C-3.4,-3.2 -3.8,-7.4 0,-11.5 C3.8,-7.4 3.4,-3.2 0,0 Z" transform="rotate(270)" fill="#c19f62" />
      <path d="M0,0 C-3.4,-3.2 -3.8,-7.4 0,-11.5 C3.8,-7.4 3.4,-3.2 0,0 Z" transform="rotate(315)" fill="#c19f62" opacity="0.85" />
      <circle r="3" fill="#c19f62" stroke="#8a6d3b" stroke-width="0.4" />
      <circle r="1.2" fill="#fff5c0" opacity="0.85" />
    </g>
  </svg>
`;

// The frame's own top/bottom centerpiece — an ornate medallion (the
// same rub-el-hizb "two overlapping squares" construction as the
// seams between content sections, see SectionSeam.js, but larger and
// with a pair of small flanking petals so it reads as the frame's own
// signature ornament rather than a repeat of that in-page motif) with
// two hairlines trailing outward toward the corners. Anchored on the
// frame's own edge, nowhere near the vertically-centered
// Opening/Envelope content, so Scene 1/2 stay completely untouched.
const CENTER_MEDALLION_SVG = `
  <svg class="ali-muneer-page-frame-medallion-svg" viewBox="0 0 70 70" aria-hidden="true">
    <circle cx="35" cy="35" r="23" fill="#fff9e7" stroke="#c8a96b" stroke-width="1" opacity="0.9" />
    <rect x="19" y="19" width="32" height="32" fill="none" stroke="#c19f62" stroke-width="1.1" opacity="0.85" />
    <rect x="19" y="19" width="32" height="32" fill="none" stroke="#c19f62" stroke-width="1.1" opacity="0.85" transform="rotate(45 35 35)" />
    <circle cx="35" cy="35" r="3.6" fill="#c19f62" stroke="#8a6d3b" stroke-width="0.4" />
    <circle cx="35" cy="35" r="1.4" fill="#fff5c0" opacity="0.9" />

    <path d="M9,35 C9,29 11,25 9,21" fill="none" stroke="#c19f62" stroke-width="0.8" stroke-linecap="round" opacity="0.55" />
    <path d="M61,35 C61,29 59,25 61,21" fill="none" stroke="#c19f62" stroke-width="0.8" stroke-linecap="round" opacity="0.55" />
    <path d="M9,21 C9,17 12,15 12,12" fill="none" stroke="#c19f62" stroke-width="0.7" stroke-linecap="round" opacity="0.45" />
    <path d="M61,21 C61,17 58,15 58,12" fill="none" stroke="#c19f62" stroke-width="0.7" stroke-linecap="round" opacity="0.45" />
  </svg>
`;

function frameCenterOrnamentHTML(modifier) {
  return `
    <div class="ali-muneer-page-frame-ornament ali-muneer-page-frame-ornament--${modifier}">
      <span class="ali-muneer-page-frame-ornament-line"></span>
      ${CENTER_MEDALLION_SVG}
      <span class="ali-muneer-page-frame-ornament-line"></span>
    </div>
  `;
}

// A thin gold frame fixed to the viewport edges for the whole scene's
// lifetime, independent of scroll (see AliMuneerScene._enableScroll) —
// the border stays flush with the screen at all times rather than
// scrolling away with Hero/Background. Constructed once alongside
// Background and torn down in AliMuneerScene.destroy().
export default class PageFrame {
  constructor() {
    this.element = document.createElement("div");
    this.element.className = "ali-muneer-page-frame";
    this.element.innerHTML = `
      <div class="ali-muneer-page-frame-corner ali-muneer-page-frame-corner--tl">${CORNER_MOTIF_SVG}</div>
      <div class="ali-muneer-page-frame-corner ali-muneer-page-frame-corner--tr">${CORNER_MOTIF_SVG}</div>
      <div class="ali-muneer-page-frame-corner ali-muneer-page-frame-corner--bl">${CORNER_MOTIF_SVG}</div>
      <div class="ali-muneer-page-frame-corner ali-muneer-page-frame-corner--br">${CORNER_MOTIF_SVG}</div>
      ${frameCenterOrnamentHTML("top")}
      ${frameCenterOrnamentHTML("bottom")}
    `;
    document.body.appendChild(this.element);
  }

  destroy() {
    this.element.remove();
  }
}
