// ===========================
// Standard — Step 1 (START screen) tuning + content. Kept flat, the
// same convention love/Constants.js uses, rather than the heavier
// content/config/ directory tree the old Standard template had — this
// stage's actual content is small enough that a nested config tree
// would just be indirection with nothing behind it. A future stage
// that genuinely needs per-field customer config (person name, message
// text, photos...) is a good reason to introduce that structure later;
// Step 1 alone isn't.
// ===========================

// A placeholder message, same spirit as love/Constants.js's own
// INTRO_TITLE/INTRO_SUBTITLE — meant to be swapped for real
// per-customer content later; nothing in StartScreen.js depends on
// these exact words. Short on purpose: this screen's job is to create
// curiosity, not explain itself.
export const START_MARK = "✦"; // a small four-point sparkle — a distant light, not a heart
export const START_HEADING = "A Little Surprise For You";
export const START_SUBTITLE = "Something made just for this moment.";
export const START_LABEL = "Start";

// Deep navy/near-black — the dark cinematic base every stage sits on.
// The accent identity layered on top (see StartScreen.css/Countdown.css)
// is soft Baby Pink + warm gold/ivory — see StandardPalette.js for the
// actual accent values. Named here (not just inline hex in the CSS) so
// StandardScene's own THREE.Color background and every DOM overlay
// agree on the same base color from one source.
export const STANDARD_BACKGROUND_COLOR = "#05070d";

// ---- Entrance — one cascading composition arriving as a whole rather
// than independent per-element animations: atmosphere, then the small
// mark, then the heading, then the subtitle, then the button, each
// starting a beat before the last finishes. All rise distances are
// vh-based so they stay proportional on any viewport, mobile included,
// with no separate responsive handling needed (the same technique
// love/LoveIntro.js's own entrance already uses).
export const START_ATMOSPHERE_FADE_DURATION = 1.6;

export const START_MARK_DELAY = 0.25;
export const START_MARK_DURATION = 0.8;

export const START_HEADING_DELAY = 0.45;
export const START_HEADING_DURATION = 1.0;
export const START_HEADING_RISE_VH = 3;

export const START_SUBTITLE_DELAY = 0.8;
export const START_SUBTITLE_DURATION = 0.9;
export const START_SUBTITLE_RISE_VH = 2;

export const START_BUTTON_DELAY = 1.15;
export const START_BUTTON_DURATION = 0.9;
export const START_BUTTON_RISE_VH = 3;

// ---- Idle breathing — a hair of continuous life once settled,
// matching the same "nothing here is ever perfectly frozen" quality
// other templates' own idle animations already have (see e.g.
// love/envelope/Envelope.js's seal breathing). Deliberately gentle —
// the brief is explicit that this should breathe, not pulse/flash.
export const START_BREATH_SCALE = 1.03;
export const START_BREATH_DURATION = 3.2;

// ---- Hover / press feedback.
export const START_HOVER_SCALE = 1.05;
export const START_PRESS_SCALE = 0.94;
export const START_PRESS_DURATION = 0.12;

// The atmosphere's own brief bloom right at press — a one-shot beat,
// not a new continuous animation, so it stays cheap (transform-only,
// no repeat).
export const START_PRESS_GLOW_SCALE = 1.18;
export const START_PRESS_GLOW_DURATION = 0.45;

// ---- Exit — the whole composition dissolves once pressed, handing
// off to whatever comes next.
export const START_EXIT_DURATION = 0.7;

// ===========================
// Standard — Step 2 (Countdown). Same visual language as the START
// screen deliberately: same background/glow color family, same
// restrained "breathing" quality rather than a flashy timer — see
// Countdown.js/.css.
// ===========================

export const COUNTDOWN_DIGITS = [3, 2, 1];

// A short breath of near-empty darkness between the START screen fully
// leaving and the countdown's own atmosphere beginning to appear — the
// brief's own "very short breathing moment" between the two beats.
export const COUNTDOWN_ENTER_DELAY = 0.3;
export const COUNTDOWN_ATMOSPHERE_FADE_DURATION = 0.6;

// ---- Per-digit beat: entrance, hold, exit, then a short gap before
// the next digit. Kept snappy enough to feel deliberate without ever
// dragging — roughly ~1.3s of visual presence per number plus a 0.15s
// gap, in the middle of the brief's own suggested 0.7-1.0s range once
// the entrance/exit motion itself is counted.
export const COUNTDOWN_NUMBER_ENTRANCE_DURATION = 0.45;
export const COUNTDOWN_NUMBER_ENTRANCE_START_SCALE = 0.72; // begins smaller, as if arriving from the atmosphere
export const COUNTDOWN_NUMBER_HOLD_DURATION = 0.5;
export const COUNTDOWN_NUMBER_EXIT_DURATION = 0.35;
export const COUNTDOWN_NUMBER_EXIT_SCALE = 0.85; // contracts away rather than growing/flying off
export const COUNTDOWN_NUMBER_GAP = 0.15;

// The atmosphere's own brief pulse alongside each number's entrance —
// restrained, and slightly stronger on the last digit per the brief's
// own example ("1 -> slightly stronger anticipation").
export const COUNTDOWN_ATMOSPHERE_PULSE_SCALE = 1.06;
export const COUNTDOWN_ATMOSPHERE_FINAL_PULSE_SCALE = 1.12;
export const COUNTDOWN_ATMOSPHERE_PULSE_DURATION = 0.4;

// ---- Exit — the whole composition dissolves once "1" finishes,
// handing off to the future Birthday Reveal (see StandardScene.js's
// own _enterReadyState placeholder seam).
export const COUNTDOWN_EXIT_DELAY = 0.25;
export const COUNTDOWN_EXIT_DURATION = 0.6;
