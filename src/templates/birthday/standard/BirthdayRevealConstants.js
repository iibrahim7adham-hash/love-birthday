// ===========================
// Standard — the "Birthday Reveal" moment: "Happy Birthday" / "to You"
// forming above the cake once it has fully formed and the camera has
// settled into its final pulled-back position. Its own file, the same
// way BirthdayMessageConstants.js splits out from the flat Constants.js
// once a subsystem gets substantial enough — this stage has real
// timing/color/particle data of its own.
//
// Not to be confused with BirthdayMessage.js/BirthdayMessageConstants.js
// — that's the EARLIER, separate "Happy Birthday" beat shown right after
// the countdown, before the cake even exists, and it fully disperses
// itself afterward. This stage is a distinct, later moment: it holds
// permanently once revealed, the same way CakeAtmosphere/StandardFireworks
// never tear themselves down once the celebration stage begins.
// ===========================

// The one and only two lines this stage ever shows. Kept as two separate
// strings (not one) so BirthdayReveal.js can reveal them as two
// independently-timed beats, "to You" starting only once "Happy
// Birthday" has fully settled.
export const REVEAL_MAIN_TEXT = "Happy Birthday";
export const REVEAL_SUB_TEXT = "to You";

// ---- Particles — a very small cluster gathering above the cake right
// before the lettering begins, mirroring BirthdayMessage.js's own
// _buildParticles() idea (small glow dots converging on a point) at a
// much smaller scale, since this is a short accent beat rather than the
// whole stage's own visual content. Count halved below
// REVEAL_MOBILE_BREAKPOINT, the same pattern BirthdayMessage.js already
// establishes.
export const REVEAL_PARTICLE_COUNT = 10;
export const REVEAL_MOBILE_BREAKPOINT = 560; // px
export const REVEAL_PARTICLE_MIN_RADIUS_VW = 3;
export const REVEAL_PARTICLE_MAX_RADIUS_VW = 11;
export const REVEAL_PARTICLE_MIN_SIZE = 2; // px
export const REVEAL_PARTICLE_MAX_SIZE = 4; // px
// Pale pink / warm ivory only — this stage is the Baby Pink payoff
// moment, not the warm-gold bridge BirthdayMessage's own particles are.
export const REVEAL_PARTICLE_COLORS = ["#ffe4ec", "#fff8f5", "#f6b6cc"];

// ---- Sequence timing — see BirthdayReveal.js's own playSequence().
export const REVEAL_ENTER_DELAY = 0.53; // the brief's own "pause very briefly" once the camera has fully settled
export const REVEAL_PARTICLE_GATHER_DURATION = 0.68;
export const REVEAL_PARTICLE_GATHER_STAGGER = 0.23;
export const REVEAL_TEXT_START_OFFSET = 0.41; // "Happy Birthday" starts condensing partway through the particle gather, not after it finishes

// Letters reveal via a single GSAP `stagger` tween across each line's
// own array of per-letter spans — the closest practical approximation
// of true stroke-by-stroke reveal with a system-font DOM text node (see
// this file's own top comment on why 3D/canvas text isn't used). A
// small glowing tracer sweeps across each line in sync (see
// BirthdayReveal.js's own _sweepTracer()) so the letters read as being
// magically written rather than just fading in.
export const REVEAL_LETTER_DURATION = 0.3; // each letter's own fade/rise-in
export const REVEAL_LETTER_STAGGER_MAIN = 0.04; // gap between one letter starting and the next, "Happy Birthday"
export const REVEAL_LETTER_RISE_PX = 10;

export const REVEAL_SUB_DELAY_AFTER_MAIN = 0.3; // short pause between the two lines
export const REVEAL_LETTER_DURATION_SUB = 0.21; // faster than the main line, per the brief
export const REVEAL_LETTER_STAGGER_SUB = 0.024; // faster than the main line, per the brief

// The tracer itself, plus one dimmer/delayed echo trailing just behind
// it — two small reusable dots (repositioned per line via gsap.set, not
// recreated), never a spawned particle stream, for "a very short fading
// trail" rather than a permanent line.
export const REVEAL_TRACER_SIZE = 5; // px
export const REVEAL_TRACER_ECHO_SIZE = 3; // px
export const REVEAL_TRACER_ECHO_DELAY_FRACTION = 0.1; // fraction of the sweep's own duration the echo trails behind by
export const REVEAL_TRACER_PEAK_OPACITY = 0.85;
export const REVEAL_TRACER_ECHO_PEAK_OPACITY = 0.45;

// A single, extremely subtle glow pulse once both lines have settled —
// restrained, one cycle only, never a repeating idle loop (this mirrors
// BirthdayMessage.js's own single "breathe" but noticeably softer, per
// the brief's own "the final pulse should be extremely subtle").
export const REVEAL_PULSE_DELAY = 0.34;
export const REVEAL_PULSE_SCALE = 1.014;
export const REVEAL_PULSE_DURATION = 0.98;

// The gather particles quietly fade away once the greeting has fully
// formed — they were only ever meant to accompany the writing moment,
// not linger as permanent decoration alongside the finished text.
export const REVEAL_PARTICLE_FADE_DURATION = 0.83;
