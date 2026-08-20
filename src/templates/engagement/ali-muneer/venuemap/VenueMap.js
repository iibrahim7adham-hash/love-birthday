import "./VenueMap.css";
import { sectionSeamHTML } from "../SectionSeam";
import {
  VENUE_MAP_SECTION_ID,
  VENUE_MAP_TITLE,
  VENUE_MAP_EMBED_SRC,
  VENUE_MAP_VENUE_NAME,
  VENUE_MAP_BUTTON_TEXT,
  VENUE_MAP_BUTTON_HREF,
} from "../Constants";

// Same top ornament as the Event Details section (see
// .am-event-ornament / ORNAMENT_SVG in ../eventdetails/EventDetails.js)
// reused here verbatim for visual continuity between the two sections —
// a fresh <defs> id (`am-venue-ornament-spike`) since SVG <use> ids must
// stay unique per document and both sections can be mounted at once.
const ORNAMENT_SVG = `
  <svg class="am-venue-ornament" viewBox="0 0 40 40" aria-hidden="true">
    <defs>
      <path id="am-venue-ornament-spike" d="M0,0 C-1.8,-4.4 -1.6,-8.8 0,-13 C1.6,-8.8 1.8,-4.4 0,0 Z" />
    </defs>
    <g transform="translate(20,20)">
      <use href="#am-venue-ornament-spike" transform="rotate(0)" fill="#C19F62" />
      <use href="#am-venue-ornament-spike" transform="rotate(45)" fill="#C19F62" opacity="0.85" />
      <use href="#am-venue-ornament-spike" transform="rotate(90)" fill="#C19F62" />
      <use href="#am-venue-ornament-spike" transform="rotate(135)" fill="#C19F62" opacity="0.85" />
      <use href="#am-venue-ornament-spike" transform="rotate(180)" fill="#C19F62" />
      <use href="#am-venue-ornament-spike" transform="rotate(225)" fill="#C19F62" opacity="0.85" />
      <use href="#am-venue-ornament-spike" transform="rotate(270)" fill="#C19F62" />
      <use href="#am-venue-ornament-spike" transform="rotate(315)" fill="#C19F62" opacity="0.85" />
      <circle r="2.4" fill="#C19F62" stroke="#8A6D3B" stroke-width="0.4" />
      <circle r="1" fill="#FFF5C0" opacity="0.85" />
    </g>
  </svg>
`;

// Scene 5 — the "Venue & Map" section, a plain document-flow sibling
// right after Event Details (see ../eventdetails/EventDetails.js). The
// map is a placeholder embed (no venue confirmed yet, see
// VENUE_MAP_EMBED_SRC in ../Constants.js) muted via CSS filters so it
// reads as part of the printed invitation rather than a bare Google
// widget — see .am-venue-map-frame in VenueMap.css.
export default class VenueMap {
  constructor() {
    this.element = document.createElement("section");
    this.element.id = VENUE_MAP_SECTION_ID;
    this.element.innerHTML = `
      ${sectionSeamHTML()}
      <div class="am-venue-inner">
        <div class="am-venue-header">
          ${ORNAMENT_SVG.replace('class="am-venue-ornament"', 'class="am-venue-ornament am-venue-anim am-venue-anim-1"')}
          <h2 class="am-venue-title am-venue-anim am-venue-anim-2" dir="rtl" lang="ar">${VENUE_MAP_TITLE}</h2>
          <div class="am-venue-divider am-venue-anim am-venue-anim-2">
            <span class="am-venue-divider-line"></span>
            <span class="am-venue-divider-dot" aria-hidden="true">◆</span>
            <span class="am-venue-divider-line"></span>
          </div>
        </div>

        <div class="am-venue-map-frame am-venue-anim am-venue-anim-3">
          <iframe
            class="am-venue-map-iframe"
            src="${VENUE_MAP_EMBED_SRC}"
            title="${VENUE_MAP_TITLE}"
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>

        <p class="am-venue-name am-venue-anim am-venue-anim-4" dir="rtl" lang="ar">${VENUE_MAP_VENUE_NAME}</p>

        <a
          class="am-venue-button am-venue-anim am-venue-anim-5"
          href="${VENUE_MAP_BUTTON_HREF}"
          target="_blank"
          rel="noopener noreferrer"
          dir="rtl"
          lang="ar"
        >${VENUE_MAP_BUTTON_TEXT}</a>
      </div>
    `;
    document.body.appendChild(this.element);

    this._observer = new IntersectionObserver(this._handleIntersect.bind(this), {
      threshold: 0.15,
    });
    this._observer.observe(this.element);
  }

  _handleIntersect(entries) {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      this.element.classList.add("is-inview");
      this._observer.unobserve(this.element);
    });
  }

  update(delta) {}

  destroy() {
    if (this._observer) this._observer.disconnect();
    this.element.remove();
  }
}
