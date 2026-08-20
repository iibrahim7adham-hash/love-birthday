// ===========================
// Hyatei — Part 3 (LOVE rain). Scene-wide constants only; per-system
// tuning that's genuinely local to one file stays inline there instead
// of being funneled through here.
// ===========================

// A near-black background — the reference is dark throughout this part,
// with the pink rain as the only light source.
export const HYATEI_BACKGROUND_COLOR = "#0a0a0f";

export const HYATEI_CAMERA_Z = 10;

// ---- LOVE rain (Group A) ----
export const RAIN_COLOR = "#ff7ea8"; // between the reference's #FF6FA1 / #FF8DB6
export const RAIN_GLYPHS = ["L", "O", "V", "E", "heart"];
// Hearts are rare relative to the LOVE letters (spec section 4).
export const RAIN_GLYPH_WEIGHTS = [1, 1, 1, 1, 0.35];

export const RAIN_COUNT_BY_PERFORMANCE = {
  low: 350,
  medium: 550,
  high: 800,
  ultra: 900,
};

export const RAIN_SIZE = 0.34;
export const RAIN_SPEED_MIN = 0.55;
export const RAIN_SPEED_MAX = 1.15;
export const RAIN_SIZE_MULT_MIN = 0.6;
export const RAIN_SIZE_MULT_MAX = 1.4;
export const RAIN_BRIGHTNESS_MIN = 0.4;
export const RAIN_BRIGHTNESS_MAX = 1.0;

// ---- Center attraction (vortex sequence, Part 1 only) ----
// Was a gentle pull that bent each particle's fall path toward x=0 —
// disabled (max 0) on request because it made the rain visibly funnel/
// converge toward the center in diagonal streaks, which read as an
// unwanted conical motion. Left in place (rather than deleted) in case a
// future part wants it back.
export const RAIN_ATTRACTION_MAX = 0;
export const RAIN_ATTRACTION_RAMP_DELAY = 2; // seconds of plain rain before it begins
export const RAIN_ATTRACTION_RAMP_DURATION = 10; // seconds to reach full (still-subtle) strength

// ---- Countdown numbers (particle-built 3 -> 2 -> 1, LED/dot-matrix grid) ----
// Runs on top of LoveRain, in its own ParticleEngine ("morph" mode) —
// never touches LoveRain's engine/uniforms/timing. Every digit is sampled
// onto the SAME cols x rows lattice (see number/GlyphSampler.js) so a
// formed digit is always an exact grid of evenly-spaced cells, never
// freely-sampled points — that's what keeps the "on" state
// mathematically precise while scatter/transform/burst stay organic.
export const COUNTDOWN_COLOR = "#ffffff";
// fillRatio: a dot's own solid footprint as a fraction of one grid
// cell's spacing — bold/LED-bright, dots from neighboring "on" cells
// touch and slightly overlap rather than leaving a gap.
// glowMargin: the rendered point sprite is this much BIGGER than the
// dot's own footprint, purely to leave room for the glow halo around
// it (see particleFragmentShader's uCoreFraction) — the glow bleeds
// outward from the dot without the dot itself growing.
// Both are scaled DOWN at coarser grid tiers on purpose: a low-res grid
// already has much bigger individual cells (fewer rows over the same
// COUNTDOWN_DIGIT_SIZE), so the same "bold" ratio/margin used at a dense
// grid would make neighboring dots swallow each other into a blurry
// blob instead of a readable dot-matrix — this bit the phone case, where
// Performance.js's post-benchmark downgrade can land on "low" even on a
// capable device (e.g. a slow first-second FPS reading from a high-DPR
// canvas). Every tier still ends up looking bold/glowing on its own grid.
export const COUNTDOWN_GRID_BY_PERFORMANCE = {
  low: { cols: 22, rows: 30, fillRatio: 0.85, glowMargin: 1.3 },
  medium: { cols: 30, rows: 40, fillRatio: 0.95, glowMargin: 1.5 },
  high: { cols: 36, rows: 48, fillRatio: 1.05, glowMargin: 1.7 },
  ultra: { cols: 42, rows: 56, fillRatio: 1.1, glowMargin: 1.9 },
};
// Extra reduction applied ON TOP of the tier's own fillRatio/glowMargin
// when `device.isMobile` (narrow viewport, regardless of GPU tier).
// A phone's much narrower CSS width means the SAME world-space grid gets
// far fewer physical pixels across the digit, so the exact-same fraction
// of "gap" between cells that reads fine on desktop can shrink to a
// sub-pixel sliver on a phone and anti-alias/glow away entirely — the
// digit reads as one solid glowing block instead of a dot-matrix, even
// on a high `performanceLevel` tier where the grid itself is fine. This
// is a screen-size problem, not a GPU-power problem, so it's a separate
// multiplier from the per-tier table above, not folded into it.
export const COUNTDOWN_MOBILE_FILL_SCALE = 0.78;
export const COUNTDOWN_MOBILE_GLOW_SCALE = 0.7;
export const COUNTDOWN_DIGIT_SIZE = 5.2; // world-space span each digit's grid occupies
export const COUNTDOWN_SCATTER_RADIUS = 4.2; // initial scatter spread around the digit's own area

// Particles are invisible (opacity 0) until this many seconds into the
// scene — nothing at all is on screen (just LOVE rain) until then. At
// that moment they pop into existence already scattered at random
// positions in space (COUNTDOWN_APPEAR_DURATION, a quick fade-in, no
// movement yet), THEN start being "pulled in" toward "3"
// (COUNTDOWN_ASSEMBLE_DURATION) — two distinct beats, not one blended
// appear-while-moving motion.
export const COUNTDOWN_ENTER_DELAY = 3;
export const COUNTDOWN_APPEAR_DURATION = 0.25;
export const COUNTDOWN_OPACITY = 0.92;
export const COUNTDOWN_ASSEMBLE_DURATION = 1.1; // scatter -> "3"
// "3"->"2" and "2"->"1" are a direct morph — every particle moves in a
// straight line from its current grid cell to its new one (see
// ParticleEngine.morphTo). A shatter-and-reform variant (particles pop
// outward briefly before reassembling) was tried and explicitly
// rejected ("ماعجبتني الانتقاله") — do not reintroduce it without a new
// request.
export const COUNTDOWN_TRANSFORM_DURATION = 0.9; // "3"->"2" and "2"->"1"
export const COUNTDOWN_HOLD_DURATION = 0.7; // stable pause after "3" and "2"
export const COUNTDOWN_FINAL_HOLD_DURATION = 0.5; // stable pause after "1", before the burst

// After "1", particles explode outward across the WHOLE visible space
// (not a small pop near the center) — distance is a fraction of the
// camera's actual visible half-diagonal at HYATEI_CAMERA_Z (computed at
// runtime in NumberParticles, since it depends on aspect/fov), so it
// genuinely reaches edge-to-edge on any screen size rather than a fixed
// world-unit distance that would look tiny on a wide screen or overflow
// a narrow one.
export const COUNTDOWN_BURST_DURATION = 1.2;
export const COUNTDOWN_BURST_REACH_MIN_FRACTION = 0.55;
export const COUNTDOWN_BURST_REACH_MAX_FRACTION = 1.05;
// A held breath at full scatter before the particles start gathering
// back in — makes "explode, then reform" read as two distinct beats
// instead of an immediate rebound.
export const COUNTDOWN_SCATTERED_HOLD_DURATION = 0.6;

// The final reveal: the same particles that were "3" -> "2" -> "1" get
// pulled back in from across the whole space into this word, sampled
// onto the same kind of grid as the digits (see GlyphSampler.js) but a
// much wider one — COUNTDOWN_TEXT_ASPECT (cols:rows) is tuned for this
// specific word's proportions, not reused generically. This is the
// sequence's true end state: it stays formed, it does not fade out or
// get destroyed afterward.
export const COUNTDOWN_TEXT = "You";
export const COUNTDOWN_TEXT_ASPECT = 2.6;
export const COUNTDOWN_GATHER_DURATION = 1.3;
