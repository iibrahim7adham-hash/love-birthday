// ===========================
// Letter — timing/tuning + content. Kept separate from
// EnvelopeConstants deliberately: the letter is its own presentation,
// not a detail of the envelope (see Letter.js).
// ===========================

// A placeholder message, same spirit as Constants.js's own
// INTRO_TITLE/INTRO_SUBTITLE/MESSAGE_TEXTS — meant to be swapped for
// real per-customer content later; nothing in Letter.js depends on
// these exact words. Kept as short lines rather than one paragraph so
// each line can reveal on its own beat.
export const LETTER_LINES = [
  "لو أگدر أختصر كل اللي بداخلي بكلمات،",
  "ما راح تكفي الكلمات حتى أوصف شكد وجودك يعني إلي.",
  "كل لحظة وياك صارت ذكرى أحتفظ بيها بقلبي،",
  "وكل سنة تمر أتمنى أشوفك أسعد وأجمل.",
  "عيد ميلاد سعيد،",
  "وأتمنى تبقى دائمًا الشخص اللي يملّي أيامي أحلى.",
];

export const LETTER_SIGNATURE = "من كل قلبي ♥";

// The message's own script direction/language — read by Letter.js to
// set dir/lang on the letter's text container so the browser shapes
// and bidi-orders Arabic correctly (connected letterforms, RTL line
// flow, punctuation on the correct side) instead of assuming LTR.
// Flipping this back to "ltr"/"en" is all a future English message
// would need; nothing else here is script-specific.
export const LETTER_TEXT_DIRECTION = "rtl";
export const LETTER_TEXT_LANGUAGE = "ar";

// ---- Emergence: rises out of the envelope's opening, a small rotation
// correcting itself as it settles, then holds as the scene's focus.
export const LETTER_EMERGE_DELAY = 1.15; // after the flap begins opening
export const LETTER_EMERGE_RISE_PX = 70; // scaled down with the letter's own smaller footprint
export const LETTER_EMERGE_START_SCALE = 0.7;
export const LETTER_EMERGE_START_ROTATION_DEG = -5;
// Retimed (was 1.3s/0.6s) — same rise+settle physical motion as the
// envelope's own entrance, just faster; this is the letter object
// arriving, not the text reveal itself (LETTER_TEXT_START_DELAY/
// LETTER_WORD_STAGGER/LETTER_READING_DELAY below are untouched).
export const LETTER_EMERGE_DURATION = 0.85;
export const LETTER_SETTLE_DURATION = 0.4;

// ---- Text reveal — words fade in one at a time, in reading order
// across the whole message (not a per-line stagger, not a
// character-by-character typewriter). Derived from the message's own
// word count rather than flat numbers, so a longer/shorter swapped-in
// message automatically gets a sensible pace instead of needing its
// timing retuned by hand.
export const LETTER_TEXT_START_DELAY = 0.5; // after the letter itself settles

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

const LETTER_WORD_COUNT = LETTER_LINES.join(" ")
  .trim()
  .split(/\s+/)
  .filter(Boolean).length;

// Longer letters use a slightly quicker per-word pace so the whole
// reveal doesn't stretch past a comfortable ceiling; shorter ones can
// afford a slower, more deliberate cadence. Stays within the ~100-180ms
// band this was briefed against.
export const LETTER_WORD_STAGGER = LETTER_WORD_COUNT <= 15 ? 0.17 : LETTER_WORD_COUNT <= 30 ? 0.13 : 0.1;
export const LETTER_WORD_FADE_DURATION = 0.4;
export const LETTER_WORD_RISE_PX = 6;

export const LETTER_LINE_DURATION = 0.9; // the signature's own fade-in duration
export const LETTER_LINE_RISE_PX = 10; // the signature's own rise distance
export const LETTER_SIGNATURE_EXTRA_DELAY = 0.4; // gap after the last word before the signature appears

// How long the viewer gets to actually read the finished letter before
// it starts returning to the envelope — deliberately NOT a full silent
// reading-speed estimate, because the viewer has already been reading
// along as each word appeared during the reveal itself (see
// LETTER_WORD_STAGGER above); this is just the extra settle-and-finish
// pause after that, so it stays short even for a message with plenty
// of words. Scales with the message's own word count (so a much longer
// swapped-in message still gets proportionally more time) but is
// floored at 5s for readability and never balloons past 10s.
export const LETTER_READING_DELAY = clamp(3 + LETTER_WORD_COUNT * 0.07, 5, 10);

// ---- Return: the reverse of emergence — a small "picking it up" lift,
// then a longer glide toward the envelope's own opening (the exact
// on-screen target is computed live from that element's own
// getBoundingClientRect() in Letter.js, never a hard-coded position, so
// this stays correct at any viewport size).
export const LETTER_RETURN_LIFT_PX = 14;
// Retimed (was 0.5s/1.2s) — same lift-then-glide-into-the-envelope
// motion, just faster, matching the envelope's own faster close/exit.
export const LETTER_RETURN_LIFT_DURATION = 0.3;
export const LETTER_RETURN_DURATION = 0.75;
export const LETTER_RETURN_END_SCALE = 0.22;
export const LETTER_RETURN_ROTATION_DEG = 6;

// Same dark burgundy/wine family as the envelope's own pocket (see
// ENVELOPE_COLOR_MID/ENVELOPE_COLOR_DARK in EnvelopeConstants.js) — the
// letter continues the envelope's interior color language rather than
// a separate white-card one.
export const LETTER_PAPER_COLOR_TOP = "#3d1622";
export const LETTER_PAPER_COLOR_BOTTOM = "#1c0910";
export const LETTER_TEXT_COLOR = "#f6dfe6";
export const LETTER_SIGNATURE_COLOR = "#e8b4c8";
export const LETTER_ACCENT_GOLD = "#e8b485";
