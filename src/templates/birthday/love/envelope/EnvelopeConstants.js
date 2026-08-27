import {
  PHOTO_STICKER_ENTRANCE_DELAY,
  PHOTO_STICKER_ENTRANCE_STAGGER,
  PHOTO_STICKER_FADE_IN_DURATION,
  PHOTO_STICKER_DEFAULT_COUNT,
} from "../stickers/PhotoStickerConstants";

// ===========================
// Envelope — timing/tuning values only. Envelope.js owns the actual
// mechanics; this is just the numbers.
// ===========================

// The "let the scene breathe" pause once the stickers have settled into
// their orbit, before the envelope appears at all — trimmed (was 3.5s)
// as part of speeding up the envelope's own appear/disappear timing;
// still a real beat, not an instant cut.
export const ENVELOPE_PAUSE_AFTER_STICKERS = 1.4;

// Derived, not an independent number: an estimate of when the LAST
// sticker (assuming the common default count) has finished its own
// staggered entrance, using the exact math PhotoStickerOrbit's entrance
// already runs — not a live callback, the same way
// PHOTO_STICKER_ENTRANCE_DELAY itself is derived from
// MESSAGE_START_DELAY rather than an event. If the actual sticker count
// differs, this is off by at most a couple of stagger-steps — a
// cinematic "roughly settled" cue, not something that needs to be
// frame-exact.
const STICKERS_SETTLED_DELAY =
  PHOTO_STICKER_ENTRANCE_DELAY +
  (PHOTO_STICKER_DEFAULT_COUNT - 1) * PHOTO_STICKER_ENTRANCE_STAGGER +
  PHOTO_STICKER_FADE_IN_DURATION;

export const ENVELOPE_ENTRANCE_DELAY = STICKERS_SETTLED_DELAY + ENVELOPE_PAUSE_AFTER_STICKERS;

// ---- Entrance: rises from below, scales up slightly, settles with a
// touch of physical weight. vh-based rise distance for the same reason
// the intro title/subtitle's own entrance is vh-based — proportional on
// any viewport, no separate mobile handling needed.
export const ENVELOPE_ENTRANCE_RISE_VH = 16;
export const ENVELOPE_ENTRANCE_START_SCALE = 0.6;
// Retimed (was 1.5s / 0.55s) so the envelope reads as clearly quicker
// to arrive — same rise+fade+overshoot-settle motion, same ease, just
// compressed.
export const ENVELOPE_ENTRANCE_DURATION = 0.9;
export const ENVELOPE_SETTLE_DURATION = 0.35;
export const ENVELOPE_SETTLE_OVERSHOOT_PX = 6; // the tiny "has real weight" dip past rest

// ---- Idle life, once settled — a hair of continuous sway, matching
// the same "nothing here is ever perfectly frozen" quality the camera
// sway / star twinkle / heart breathing already have.
export const ENVELOPE_SWAY_AMOUNT_PX = 3;
export const ENVELOPE_SWAY_DURATION = 3.4;

// A few tiny accent sparkles around the envelope right as it settles —
// kept deliberately sparse and brief, not a particle system.
export const ENVELOPE_SPARKLE_COUNT = 4;
export const ENVELOPE_SPARKLE_DURATION = 1.3;

// ---- Seal ----
export const SEAL_BREATH_SCALE = 1.05;
export const SEAL_BREATH_DURATION = 2.4;
export const SEAL_HOVER_SCALE = 1.08;
export const SEAL_PRESS_SCALE = 0.88;
export const SEAL_PRESS_DURATION = 0.12;

// ---- Open sequence — deliberately unhurried; see Envelope.js for the
// full timeline this composes into.
export const SEAL_CRACK_DELAY = 0.16; // right after the press
export const SEAL_CRACK_DURATION = 0.55;
export const ENVELOPE_SHAKE_DELAY = 0.2;
export const ENVELOPE_SHAKE_DURATION = 0.4;
export const FLAP_OPEN_DELAY = 0.45;
export const FLAP_OPEN_DURATION = 1.1;
export const GLOW_REVEAL_DELAY = 0.6;
export const GLOW_REVEAL_DURATION = 1.0;
export const ENVELOPE_RECEDE_DELAY = 1.5;
export const ENVELOPE_RECEDE_DURATION = 1.1;
export const ENVELOPE_RECEDE_SCALE = 0.8;
export const ENVELOPE_RECEDE_OPACITY = 0.55;

// When the letter is considered "the focus" — used to fire the
// letter:focus event the sticker orbit reacts to (see
// stickers/PhotoStickerOrbit.js).
export const LETTER_FOCUS_DELAY = 1.9;

// ---- Close — the reverse of the open sequence, played once the letter
// has fully returned inside (see Envelope.js's _handleEnvelopeClose):
// the body recovers from its receded open-state size, the flap swings
// shut, the warm light fades, and the seal reforms.
// Retimed (was 0.6s/0.15s/0.9s/0.7s/0.5s) as part of speeding up the
// envelope's own disappearance — same close choreography (body
// restores, flap swings shut, warm light fades, seal reforms), just
// compressed.
export const ENVELOPE_CLOSE_RESTORE_DURATION = 0.4; // body scale/opacity back to rest
export const FLAP_CLOSE_DELAY = 0.1;
export const FLAP_CLOSE_DURATION = 0.6;
export const WARM_LIGHT_CLOSE_DURATION = 0.45;
export const SEAL_REFORM_DURATION = 0.35;

// ---- Exit — the envelope's own short cinematic goodbye once it's
// fully closed again: a brief pause, a soft glow, then a gentle
// downward drift + shrink + fade (never a snap-to-zero or a flight off
// screen — see Envelope.js's _handleEnvelopeExit).
// Retimed (was 0.45s/1.3s) — same pause -> sparkle -> drift/shrink/fade
// shape, just compressed.
export const ENVELOPE_EXIT_PAUSE = 0.25;
export const ENVELOPE_EXIT_DURATION = 0.85;
export const ENVELOPE_EXIT_END_SCALE = 0.55;

export const ENVELOPE_COLOR_DARK = "#2a0f18";
export const ENVELOPE_COLOR_MID = "#3d1622";
export const ENVELOPE_COLOR_BORDER = "rgba(255, 182, 201, 0.28)";
export const ENVELOPE_GLOW_COLOR = "rgba(255, 111, 145, 0.4)";

export const SEAL_COLOR_LIGHT = "#a8324a";
export const SEAL_COLOR_DARK = "#5c1220";
export const SEAL_HEART_COLOR = "#ffd9e4";

export const WARM_LIGHT_COLOR = "rgba(255, 214, 179, 0.85)";
