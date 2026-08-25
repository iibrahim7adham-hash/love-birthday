// ===========================
// Boom — Part 3 (the final romantic reveal: title + subtitle fading in
// over the settled heart field, the background gently dimming behind
// them). Timing here is expressed RELATIVE to HeartBurst's own ignite
// moment (see BoomScene.js), the same anchoring convention Part 2's own
// heartburst/HeartBurstConstants.js already established — read off a
// reference whose own "hearts start bursting" frame (~5.0s) already
// lines up with this project's own ignite moment, so those offsets
// carry over directly (reference 5.4s -> +0.4s here, 5.8s-6.0s ->
// +0.8s-1.0s, 6.0s-8.0s -> +1.0s-3.0s).
// ===========================

// The main Arabic line + the English line kept underneath it. The
// heart is its own token (REVEAL_TITLE_HEART) rather than baked into
// the sentence string, so Reveal.js can wrap it in its own span and
// render it smaller/inline instead of as a full-size emoji glyph.
export const REVEAL_TITLE = "🤍حبيت أراضيج بشي مميز مثلج🤍";
export const REVEAL_SUBTITLE = "I love you";

export const REVEAL_TEXT_COLOR = "#fff6ef";
export const REVEAL_HEART_COLOR = "#ffb3c6";
export const REVEAL_GLOW_COLOR = "rgba(255, 214, 230, 0.55)";

// ---- Timing (seconds, relative to HeartBurst.ignite()).
export const REVEAL_FADE_START_AT = 0.4; // "5.4s" in the reference
export const REVEAL_FADE_IN_DURATION = 0.6; // fully visible by ~"6.0s"
export const REVEAL_SUBTITLE_STAGGER = 0.1; // subtitle trails the title in slightly, not simultaneous

// The background dims gradually behind the text as the hearts read as
// "less prominent" (reference ~6.0s-8.0s) — a scrim Part 3 owns and
// fades in on its own, rather than anything touching HeartBurst's own
// particles/colors/motion.
export const REVEAL_SCRIM_START_AT = 1.0;
export const REVEAL_SCRIM_DURATION = 2.0;
export const REVEAL_SCRIM_PEAK_OPACITY = 0.4;
