import "./EventDetails.css";
import { sectionSeamHTML } from "../SectionSeam";
import {
  EVENT_DETAILS_TITLE,
  EVENT_DETAILS_DATE_LABEL,
  EVENT_DETAILS_DATE_VALUE,
  EVENT_DETAILS_CEREMONY_LABEL,
  EVENT_DETAILS_CEREMONY_VALUE,
  EVENT_DETAILS_TIME_LABEL,
  EVENT_DETAILS_TIME_VALUE,
  EVENT_DETAILS_LOCATION_LABEL,
  EVENT_DETAILS_LOCATION_VALUE,
  EVENT_DETAILS_LOCATION_LINK_TEXT,
  EVENT_DETAILS_LOCATION_MAP_URL,
} from "../Constants";

// Small champagne-gold line-art icons, all on the same 24x24 viewBox/
// stroke convention already established by the invitation card's own
// calendar icon (.am-invite-calendar-icon in ../envelope/Envelope.js) —
// outline shapes only, colored/stroked entirely via the shared
// .am-event-card-icon class in EventDetails.css, never a hardcoded fill
// here.
const CALENDAR_ICON = `
  <svg class="am-event-card-icon" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3.5" y="5" width="17" height="15" rx="1.6" />
    <line x1="3.5" y1="9" x2="20.5" y2="9" />
    <line x1="7.5" y1="3" x2="7.5" y2="6.5" />
    <line x1="16.5" y1="3" x2="16.5" y2="6.5" />
  </svg>
`;

const RING_ICON = `
  <svg class="am-event-card-icon" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="9" cy="14.5" r="5.2" />
    <circle cx="15" cy="14.5" r="5.2" />
    <path d="M9 9.3 L7.6 5.5 L10.4 5.5 Z" stroke-linejoin="round" />
    <path d="M15 9.3 L13.6 5.5 L16.4 5.5 Z" stroke-linejoin="round" />
  </svg>
`;

const CLOCK_ICON = `
  <svg class="am-event-card-icon" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" />
    <line x1="12" y1="12" x2="12" y2="7.2" />
    <line x1="12" y1="12" x2="15.6" y2="14.2" />
  </svg>
`;

const LOCATION_ICON = `
  <svg class="am-event-card-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 21C12 21 5.5 14.7 5.5 9.6C5.5 5.99 8.41 3 12 3C15.59 3 18.5 5.99 18.5 9.6C18.5 14.7 12 21 12 21Z" stroke-linejoin="round" />
    <circle cx="12" cy="9.5" r="2.3" />
  </svg>
`;

// Compact 8-spike gold star, the exact same petal-radial construction
// as .ali-muneer-hero-names-divider-star (see ../hero/Hero.js) reused
// here at a smaller scale as the section's own top ornament — a fresh
// <defs> id is used (`am-event-ornament-spike`) since both elements
// live in the DOM at the same time and SVG <use> ids must stay unique
// per document.
const ORNAMENT_SVG = `
  <svg class="am-event-ornament" viewBox="0 0 40 40" aria-hidden="true">
    <defs>
      <path id="am-event-ornament-spike" d="M0,0 C-1.8,-4.4 -1.6,-8.8 0,-13 C1.6,-8.8 1.8,-4.4 0,0 Z" />
    </defs>
    <g transform="translate(20,20)">
      <use href="#am-event-ornament-spike" transform="rotate(0)" fill="#C19F62" />
      <use href="#am-event-ornament-spike" transform="rotate(45)" fill="#C19F62" opacity="0.85" />
      <use href="#am-event-ornament-spike" transform="rotate(90)" fill="#C19F62" />
      <use href="#am-event-ornament-spike" transform="rotate(135)" fill="#C19F62" opacity="0.85" />
      <use href="#am-event-ornament-spike" transform="rotate(180)" fill="#C19F62" />
      <use href="#am-event-ornament-spike" transform="rotate(225)" fill="#C19F62" opacity="0.85" />
      <use href="#am-event-ornament-spike" transform="rotate(270)" fill="#C19F62" />
      <use href="#am-event-ornament-spike" transform="rotate(315)" fill="#C19F62" opacity="0.85" />
      <circle r="2.4" fill="#C19F62" stroke="#8A6D3B" stroke-width="0.4" />
      <circle r="1" fill="#FFF5C0" opacity="0.85" />
    </g>
  </svg>
`;

// A tiny quarter-arc flourish (a thin curl trailing to a small petal
// tip, plus one accent dot) — the same visual language as the frame's
// own corner filigree (see cornerMotifSvg in ../PageFrame.js) and the
// section-seam medallion's flanking petals (../SectionSeam.js), just
// scaled right down to suit a small card corner rather than the whole
// viewport. One motif, mirrored via CSS transforms for the other three
// corners of each card (see .am-event-card-corner--tr/--bl/--br in
// EventDetails.css) — the same technique used throughout this
// template. Plain shapes, no ids, so it's safe to stamp verbatim at
// every one of the 4 corners x 4 cards without any collision
// bookkeeping.
const CARD_CORNER_SVG = `
  <svg class="am-event-card-corner-svg" viewBox="0 0 30 30" aria-hidden="true">
    <path d="M2,15 C2,8 8,2 15,2" fill="none" stroke="#c19f62" stroke-width="1" opacity="0.55" />
    <path d="M15,2 C19,1.3 22,3.2 22,6.2 C22,8.6 19.5,9.3 18.2,7.4" fill="none" stroke="#c19f62" stroke-width="0.8" stroke-linecap="round" opacity="0.5" />
    <circle cx="2" cy="15" r="1" fill="#c19f62" opacity="0.6" />
  </svg>
`;

const CARD_CORNERS_HTML = `
  <span class="am-event-card-corner am-event-card-corner--tl">${CARD_CORNER_SVG}</span>
  <span class="am-event-card-corner am-event-card-corner--tr">${CARD_CORNER_SVG}</span>
  <span class="am-event-card-corner am-event-card-corner--bl">${CARD_CORNER_SVG}</span>
  <span class="am-event-card-corner am-event-card-corner--br">${CARD_CORNER_SVG}</span>
`;

// One "premium stationery" card — parchment-textured panel (see
// .am-event-card in EventDetails.css), the four corner flourishes
// above, and the icon lifted off the panel into its own small circular
// gold badge sitting directly above the title, rather than a bare
// line-art glyph floating in the card's own padding.
function cardHTML({ animClass, icon, label, value, valueClass = "", extra = "" }) {
  return `
    <div class="am-event-card ${animClass}">
      ${CARD_CORNERS_HTML}
      <span class="am-event-card-badge">${icon}</span>
      <p class="am-event-card-label" dir="rtl" lang="ar">${label}</p>
      <p class="am-event-card-value ${valueClass}" dir="rtl" lang="ar">${value}</p>
      ${extra}
    </div>
  `;
}

// Scene 4 — the "Event Details" section, a plain document-flow sibling
// right after Hero (see hero/Hero.js) rather than another fixed
// full-viewport overlay, so the two form one continuous scrollable
// page. Date/ceremony/time/venue are all finished copy now — no card
// in this grid is placeholder-ready anymore (see ../Constants.js). The
// location card's "عرض الموقع" button opens the couple's actual
// Google Maps link (EVENT_DETAILS_LOCATION_MAP_URL) directly, same URL
// the Venue & Map section's own button uses (see ../venuemap/VenueMap.js).
export default class EventDetails {
  constructor() {
    this.element = document.createElement("section");
    this.element.id = "ali-muneer-event-details";
    this.element.innerHTML = `
      ${sectionSeamHTML()}
      <div class="am-event-inner">
        <div class="am-event-header">
          ${ORNAMENT_SVG.replace('class="am-event-ornament"', 'class="am-event-ornament am-event-anim am-event-anim-1"')}
          <h2 class="am-event-title am-event-anim am-event-anim-2" dir="rtl" lang="ar">${EVENT_DETAILS_TITLE}</h2>
          <div class="am-event-divider am-event-anim am-event-anim-2">
            <span class="am-event-divider-line"></span>
            <span class="am-event-divider-dot" aria-hidden="true">◆</span>
            <span class="am-event-divider-line"></span>
          </div>
        </div>

        <div class="am-event-grid">
          ${cardHTML({
            animClass: "am-event-anim am-event-anim-3",
            icon: CALENDAR_ICON,
            label: EVENT_DETAILS_DATE_LABEL,
            value: EVENT_DETAILS_DATE_VALUE,
          })}

          ${cardHTML({
            animClass: "am-event-anim am-event-anim-4",
            icon: RING_ICON,
            label: EVENT_DETAILS_CEREMONY_LABEL,
            value: EVENT_DETAILS_CEREMONY_VALUE,
          })}

          ${cardHTML({
            animClass: "am-event-anim am-event-anim-5",
            icon: CLOCK_ICON,
            label: EVENT_DETAILS_TIME_LABEL,
            value: EVENT_DETAILS_TIME_VALUE,
            valueClass: "am-event-card-value--time",
          })}

          ${cardHTML({
            animClass: "am-event-anim am-event-anim-6",
            icon: LOCATION_ICON,
            label: EVENT_DETAILS_LOCATION_LABEL,
            value: EVENT_DETAILS_LOCATION_VALUE,
            valueClass: "am-event-card-value--venue",
            extra: `
              <a
                class="am-event-location-link am-event-anim am-event-anim-7"
                href="${EVENT_DETAILS_LOCATION_MAP_URL}"
                target="_blank"
                rel="noopener noreferrer"
                dir="rtl"
                lang="ar"
              >${EVENT_DETAILS_LOCATION_LINK_TEXT}</a>
            `,
          })}
        </div>
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
