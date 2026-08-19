import "./RSVP.css";
import {
  RSVP_SECTION_ID,
  RSVP_TITLE,
  RSVP_INTRO_TEXT,
  RSVP_NAME_LABEL,
  RSVP_NAME_PLACEHOLDER,
  RSVP_ATTENDEES_LABEL,
  RSVP_ATTENDEES_OPTIONS,
  RSVP_STATUS_OPTIONS,
  RSVP_SUBMIT_TEXT,
  RSVP_SUBMIT_PENDING_TEXT,
  RSVP_SUCCESS_TITLE,
  RSVP_SUCCESS_TEXT,
  RSVP_ERROR_TEXT,
} from "../Constants";

// Same-origin Vercel serverless function (see api/rsvp.js at the repo
// root) that forwards the RSVP to Telegram; the token/chat id never
// reach the browser.
const RSVP_ENDPOINT = "/api/rsvp";

// Same top ornament as Event Details/Venue & Map (see ORNAMENT_SVG in
// ../eventdetails/EventDetails.js and ../venuemap/VenueMap.js) reused
// verbatim once more for visual continuity all the way down the page
// — a fresh <defs> id (`am-rsvp-ornament-spike`) since SVG <use> ids
// must stay unique per document and every section can be mounted at
// once.
const ORNAMENT_SVG = `
  <svg class="am-rsvp-ornament" viewBox="0 0 40 40" aria-hidden="true">
    <defs>
      <path id="am-rsvp-ornament-spike" d="M0,0 C-1.8,-4.4 -1.6,-8.8 0,-13 C1.6,-8.8 1.8,-4.4 0,0 Z" />
    </defs>
    <g transform="translate(20,20)">
      <use href="#am-rsvp-ornament-spike" transform="rotate(0)" fill="#C19F62" />
      <use href="#am-rsvp-ornament-spike" transform="rotate(45)" fill="#C19F62" opacity="0.85" />
      <use href="#am-rsvp-ornament-spike" transform="rotate(90)" fill="#C19F62" />
      <use href="#am-rsvp-ornament-spike" transform="rotate(135)" fill="#C19F62" opacity="0.85" />
      <use href="#am-rsvp-ornament-spike" transform="rotate(180)" fill="#C19F62" />
      <use href="#am-rsvp-ornament-spike" transform="rotate(225)" fill="#C19F62" opacity="0.85" />
      <use href="#am-rsvp-ornament-spike" transform="rotate(270)" fill="#C19F62" />
      <use href="#am-rsvp-ornament-spike" transform="rotate(315)" fill="#C19F62" opacity="0.85" />
      <circle r="2.4" fill="#C19F62" stroke="#8A6D3B" stroke-width="0.4" />
      <circle r="1" fill="#FFF5C0" opacity="0.85" />
    </g>
  </svg>
`;

const CHECK_ICON = `
  <svg class="am-rsvp-success-icon" viewBox="0 0 40 40" aria-hidden="true">
    <circle cx="20" cy="20" r="18" fill="none" stroke="#C19F62" stroke-width="1.4" />
    <path d="M12 20.5 L17.5 26 L28.5 14" fill="none" stroke="#C19F62" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
`;

const ATTENDEES_OPTIONS_HTML = RSVP_ATTENDEES_OPTIONS.map(
  (n) => `<option value="${n}">${n}</option>`,
).join("");

// A vertical stack of three full-width cards rather than a two-way
// segmented pill — three lines of real Arabic phrasing (not one-word
// labels) need their own row each to stay legible and unhurried on a
// phone, not squeezed into equal-width columns. The first option
// (RSVP_STATUS_OPTIONS[0], "attending") is checked by default, same
// as the previous two-option toggle's own default.
const STATUS_OPTIONS_HTML = RSVP_STATUS_OPTIONS.map(
  ({ value, label }, index) => `
    <label class="am-rsvp-status-option">
      <input type="radio" name="status" value="${value}" ${index === 0 ? "checked" : ""} />
      <span dir="rtl" lang="ar">${label}</span>
    </label>
  `,
).join("");

// Scene 7 — the final "RSVP" section, a plain document-flow sibling
// right after Venue & Map (see ../venuemap/VenueMap.js), same
// header/ornament/divider/stagger-animation pattern as every section
// above it. The form validates a non-empty name, then POSTs the RSVP
// to RSVP_ENDPOINT in the background (see _handleSubmit below) — the
// guest never leaves the page. `.am-rsvp-form` swaps for
// `.am-rsvp-success` on a 2xx response; on failure the form stays put
// and `.am-rsvp-error` shows inline so the guest can retry.
export default class RSVP {
  constructor() {
    this.element = document.createElement("section");
    this.element.id = RSVP_SECTION_ID;
    this.element.innerHTML = `
      <div class="am-rsvp-inner">
        <div class="am-rsvp-header">
          ${ORNAMENT_SVG.replace('class="am-rsvp-ornament"', 'class="am-rsvp-ornament am-rsvp-anim am-rsvp-anim-1"')}
          <h2 class="am-rsvp-title am-rsvp-anim am-rsvp-anim-2" dir="rtl" lang="ar">${RSVP_TITLE}</h2>
          <div class="am-rsvp-divider am-rsvp-anim am-rsvp-anim-2">
            <span class="am-rsvp-divider-line"></span>
            <span class="am-rsvp-divider-dot" aria-hidden="true">◆</span>
            <span class="am-rsvp-divider-line"></span>
          </div>
          <p class="am-rsvp-intro am-rsvp-anim am-rsvp-anim-3" dir="rtl" lang="ar">${RSVP_INTRO_TEXT}</p>
        </div>

        <form class="am-rsvp-form am-rsvp-anim am-rsvp-anim-4" novalidate>
          <div class="am-rsvp-field">
            <label class="am-rsvp-label" for="am-rsvp-name" dir="rtl" lang="ar">${RSVP_NAME_LABEL}</label>
            <input
              class="am-rsvp-input"
              type="text"
              id="am-rsvp-name"
              name="name"
              placeholder="${RSVP_NAME_PLACEHOLDER}"
              dir="rtl"
              lang="ar"
              autocomplete="name"
              required
            />
          </div>

          <div class="am-rsvp-field">
            <label class="am-rsvp-label" for="am-rsvp-attendees" dir="rtl" lang="ar">${RSVP_ATTENDEES_LABEL}</label>
            <select class="am-rsvp-select" id="am-rsvp-attendees" name="attendees" dir="rtl" lang="ar">
              ${ATTENDEES_OPTIONS_HTML}
            </select>
          </div>

          <div class="am-rsvp-field">
            <div class="am-rsvp-status" role="radiogroup">
              ${STATUS_OPTIONS_HTML}
            </div>
          </div>

          <p class="am-rsvp-error" dir="rtl" lang="ar" role="alert" hidden>${RSVP_ERROR_TEXT}</p>

          <button class="am-rsvp-submit" type="submit" dir="rtl" lang="ar">${RSVP_SUBMIT_TEXT}</button>
        </form>

        <div class="am-rsvp-success" hidden>
          ${CHECK_ICON}
          <p class="am-rsvp-success-title" dir="rtl" lang="ar">${RSVP_SUCCESS_TITLE}</p>
          <p class="am-rsvp-success-text" dir="rtl" lang="ar">${RSVP_SUCCESS_TEXT}</p>
        </div>
      </div>
    `;
    document.body.appendChild(this.element);

    this._form = this.element.querySelector(".am-rsvp-form");
    this._success = this.element.querySelector(".am-rsvp-success");
    this._error = this.element.querySelector(".am-rsvp-error");
    this._submit = this.element.querySelector(".am-rsvp-submit");
    this._form.addEventListener("submit", this._handleSubmit);

    this._observer = new IntersectionObserver(this._handleIntersect.bind(this), {
      threshold: 0.15,
    });
    this._observer.observe(this.element);
  }

  _handleSubmit = async (event) => {
    event.preventDefault();
    if (!this._form.reportValidity()) return;

    const data = new FormData(this._form);
    const name = data.get("name").trim();
    const attendees = data.get("attendees");
    const statusValue = data.get("status");
    const statusLabel =
      RSVP_STATUS_OPTIONS.find((option) => option.value === statusValue)?.label ?? statusValue;

    this._error.hidden = true;
    this._submit.disabled = true;
    this._submit.textContent = RSVP_SUBMIT_PENDING_TEXT;

    try {
      const response = await fetch(RSVP_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, attendees, status: statusLabel }),
      });
      if (!response.ok) throw new Error(`RSVP request failed with ${response.status}`);

      this._form.hidden = true;
      this._success.hidden = false;
      this._success.classList.add("is-visible");
    } catch (err) {
      this._error.hidden = false;
      this._submit.disabled = false;
      this._submit.textContent = RSVP_SUBMIT_TEXT;
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
    if (this._observer) this._observer.disconnect();
    if (this._form) this._form.removeEventListener("submit", this._handleSubmit);
    this.element.remove();
  }
}
