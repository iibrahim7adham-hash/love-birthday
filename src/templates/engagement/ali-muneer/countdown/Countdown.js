import "./Countdown.css";
import { sectionSeamHTML } from "../SectionSeam";
import {
  COUNTDOWN_SECTION_ID,
  COUNTDOWN_TITLE,
  COUNTDOWN_TARGET_DATE,
  COUNTDOWN_DAYS_LABEL,
  COUNTDOWN_HOURS_LABEL,
  COUNTDOWN_MINUTES_LABEL,
  COUNTDOWN_SECONDS_LABEL,
} from "../Constants";

// Same top ornament as Event Details/Venue & Map (see ORNAMENT_SVG in
// ../eventdetails/EventDetails.js) reused verbatim for visual
// continuity — a fresh <defs> id (`am-countdown-ornament-spike`) since
// SVG <use> ids must stay unique per document and all three sections
// can be mounted at once.
const ORNAMENT_SVG = `
  <svg class="am-countdown-ornament" viewBox="0 0 40 40" aria-hidden="true">
    <defs>
      <path id="am-countdown-ornament-spike" d="M0,0 C-1.8,-4.4 -1.6,-8.8 0,-13 C1.6,-8.8 1.8,-4.4 0,0 Z" />
    </defs>
    <g transform="translate(20,20)">
      <use href="#am-countdown-ornament-spike" transform="rotate(0)" fill="#C19F62" />
      <use href="#am-countdown-ornament-spike" transform="rotate(45)" fill="#C19F62" opacity="0.85" />
      <use href="#am-countdown-ornament-spike" transform="rotate(90)" fill="#C19F62" />
      <use href="#am-countdown-ornament-spike" transform="rotate(135)" fill="#C19F62" opacity="0.85" />
      <use href="#am-countdown-ornament-spike" transform="rotate(180)" fill="#C19F62" />
      <use href="#am-countdown-ornament-spike" transform="rotate(225)" fill="#C19F62" opacity="0.85" />
      <use href="#am-countdown-ornament-spike" transform="rotate(270)" fill="#C19F62" />
      <use href="#am-countdown-ornament-spike" transform="rotate(315)" fill="#C19F62" opacity="0.85" />
      <circle r="2.4" fill="#C19F62" stroke="#8A6D3B" stroke-width="0.4" />
      <circle r="1" fill="#FFF5C0" opacity="0.85" />
    </g>
  </svg>
`;

const UNITS = [
  { key: "days", label: COUNTDOWN_DAYS_LABEL },
  { key: "hours", label: COUNTDOWN_HOURS_LABEL },
  { key: "minutes", label: COUNTDOWN_MINUTES_LABEL },
  { key: "seconds", label: COUNTDOWN_SECONDS_LABEL },
];

function pad2(n) {
  return String(n).padStart(2, "0");
}

// Scene 5 — the "Countdown" section, a plain document-flow sibling
// right after Event Details (see ../eventdetails/EventDetails.js) and
// right before Venue & Map (see ../venuemap/VenueMap.js). A live
// countdown to COUNTDOWN_TARGET_DATE, re-computed once a second via
// setInterval; ticking stops itself once the target is reached (all
// four blocks pinned at 00) rather than going negative.
export default class Countdown {
  constructor() {
    this._targetMs = new Date(COUNTDOWN_TARGET_DATE).getTime();

    this.element = document.createElement("section");
    this.element.id = COUNTDOWN_SECTION_ID;
    this.element.innerHTML = `
      ${sectionSeamHTML()}
      <div class="am-countdown-inner">
        <div class="am-countdown-header">
          ${ORNAMENT_SVG.replace('class="am-countdown-ornament"', 'class="am-countdown-ornament am-countdown-anim am-countdown-anim-1"')}
          <h2 class="am-countdown-title am-countdown-anim am-countdown-anim-2" dir="rtl" lang="ar">${COUNTDOWN_TITLE}</h2>
          <div class="am-countdown-divider am-countdown-anim am-countdown-anim-2">
            <span class="am-countdown-divider-line"></span>
            <span class="am-countdown-divider-dot" aria-hidden="true">◆</span>
            <span class="am-countdown-divider-line"></span>
          </div>
        </div>

        <div class="am-countdown-grid">
          ${UNITS.map(
            (unit, i) => `
            <div class="am-countdown-block am-countdown-anim am-countdown-anim-${3 + i}">
              <span class="am-countdown-value" data-unit="${unit.key}">00</span>
              <span class="am-countdown-label" dir="rtl" lang="ar">${unit.label}</span>
            </div>
          `
          ).join("")}
        </div>
      </div>
    `;
    document.body.appendChild(this.element);

    this._valueEls = {
      days: this.element.querySelector('[data-unit="days"]'),
      hours: this.element.querySelector('[data-unit="hours"]'),
      minutes: this.element.querySelector('[data-unit="minutes"]'),
      seconds: this.element.querySelector('[data-unit="seconds"]'),
    };

    this._tick();
    this._intervalId = window.setInterval(this._tick, 1000);

    this._observer = new IntersectionObserver(this._handleIntersect.bind(this), {
      threshold: 0.15,
    });
    this._observer.observe(this.element);
  }

  _tick = () => {
    const remainingMs = Math.max(0, this._targetMs - Date.now());

    const seconds = Math.floor(remainingMs / 1000) % 60;
    const minutes = Math.floor(remainingMs / (1000 * 60)) % 60;
    const hours = Math.floor(remainingMs / (1000 * 60 * 60)) % 24;
    const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));

    this._valueEls.days.textContent = pad2(days);
    this._valueEls.hours.textContent = pad2(hours);
    this._valueEls.minutes.textContent = pad2(minutes);
    this._valueEls.seconds.textContent = pad2(seconds);

    if (remainingMs === 0 && this._intervalId) {
      window.clearInterval(this._intervalId);
      this._intervalId = null;
    }
  };

  _handleIntersect(entries) {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      this.element.classList.add("is-inview");
      this._observer.unobserve(this.element);
    });
  }

  update(delta) {}

  destroy() {
    if (this._intervalId) window.clearInterval(this._intervalId);
    if (this._observer) this._observer.disconnect();
    this.element.remove();
  }
}
