// ===========================
// Envelope — a DOM+CSS 3D interactive envelope overlay (no Three.js
// mesh). Pure numbers/colors/strings; Envelope.js owns the actual
// construction/animation, Envelope.css owns the layout/transforms.
// ===========================

export const ENVELOPE_IVORY = "#FAF9F6";
export const ENVELOPE_IVORY_SHADOW = "#EFEAE0";
export const ENVELOPE_GOLD = "#D4AF37";
export const ENVELOPE_GOLD_LIGHT = "#F3DFA0";
export const ENVELOPE_GOLD_DARK = "#9C7A24";

// ---- Idle, closed state — a gentle float + a slow seal pulse, so the
// envelope reads as alive without ever looking busy.
export const ENVELOPE_FLOAT_AMOUNT = 10; // px
export const ENVELOPE_FLOAT_DURATION = 3.2;
export const ENVELOPE_SEAL_PULSE_SCALE = 1.06;
export const ENVELOPE_SEAL_PULSE_DURATION = 1.8;

// ---- Entrance ----
export const ENVELOPE_ENTRANCE_DURATION = 1;
export const ENVELOPE_ENTRANCE_START_SCALE = 0.85;

// ---- Open/close sequence — CSS-transition-driven (see the `.is-open`
// rules in Envelope.css: seal break, flap flip, card rise, each with
// its own transition-delay), toggled by a single `.is-open` class on
// `.am-envelope-3d`. See the lifecycle comment in Envelope.js.

// ---- Dismissal — once locked/closed for good, a brief pause then the
// whole envelope recedes into depth and fades out (see _dismiss() in
// Envelope.js).
export const ENVELOPE_DISMISS_DELAY = 0.7; // s, after the close cycle locks
export const ENVELOPE_DISMISS_DURATION = 1.1;
export const ENVELOPE_DISMISS_Z = -600; // px, recedes away from the viewer
export const ENVELOPE_DISMISS_SCALE = 0.8;
