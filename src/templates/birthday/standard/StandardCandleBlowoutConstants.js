// ===========================
// Standard — the interactive "blow out the candles" moment: a single
// button beneath the cake that, once pressed, extinguishes the candles,
// dims the scene, and hands off into StandardFireworks.js's own
// cinematic escalating sequence. Its own file, the same convention every
// other substantial Standard subsystem's own constants file follows.
// ===========================

export const BLOWOUT_BUTTON_TEXT = "انفخي الشموع";

// The button only appears once BOTH the cake/camera sequence AND the
// "Happy Birthday / to You" reveal have fully settled — see
// BirthdayRevealConstants.js's own timing (roughly 5-6s end to end from
// the celebration stage's own start) — so it never competes with the
// title for attention. Measured from StandardScene's own
// _enterCelebrationStage(), the same hook BirthdayReveal/StandardFireworks
// are both already built from.
export const BLOWOUT_BUTTON_ENTER_DELAY = 4.65;
export const BLOWOUT_BUTTON_ENTER_DURATION = 0.68;

export const BLOWOUT_MOBILE_BREAKPOINT = 560; // px

// ---- Candle extinguish — see StandardCandleBlowout.js's own
// _extinguishCandles(). A small per-candle stagger (not all five
// snapping out in perfect unison) so it reads as five individual small
// flames going out rather than one synchronized effect. Durations follow
// the brief's own suggested 0.00-0.20 / 0.20-0.50 / 0.50-0.80s windows.
export const BLOWOUT_FLAME_REACT_DURATION = 0.15;
export const BLOWOUT_FLAME_SHRINK_DURATION = 0.23;
export const BLOWOUT_FLAME_VANISH_DURATION = 0.23;
export const BLOWOUT_FLAME_STAGGER = 0.04;
export const BLOWOUT_FLAME_REACT_SCALE = 1.18; // the brief's own "flames react slightly" — a quick small flare before shrinking

// ---- Smoke — a few small soft grey wisps per candle, NOT additive
// blended (unlike every other glow/light sprite in this template) so it
// reads as smoke rather than another light source. Reuses the exact
// world-position lookup convention CakeReveal.js's own sparkle bursts
// already establish (flameGroup.getWorldPosition()).
export const BLOWOUT_SMOKE_START_DELAY = 0.26; // relative to button press
export const BLOWOUT_SMOKE_COUNT_PER_CANDLE = 3;
export const BLOWOUT_SMOKE_STAGGER = 0.09;
export const BLOWOUT_SMOKE_RISE_MIN = 0.3; // world units
export const BLOWOUT_SMOKE_RISE_MAX = 0.55;
export const BLOWOUT_SMOKE_DRIFT_X = 0.1; // world units of sideways wander
export const BLOWOUT_SMOKE_DURATION_MIN = 0.98;
export const BLOWOUT_SMOKE_DURATION_MAX = 1.43;
export const BLOWOUT_SMOKE_MIN_SCALE = 0.1;
export const BLOWOUT_SMOKE_MAX_SCALE = 0.2;
export const BLOWOUT_SMOKE_GROWTH = 1.6; // scale multiplier reached by the end of its own life — smoke dissipates by spreading, not just fading
export const BLOWOUT_SMOKE_PEAK_OPACITY = 0.28;
export const BLOWOUT_SMOKE_COLOR = "#e7e2dc"; // warm grey-white, never pure white/pink — this is smoke, not a light accent

// ---- Lighting / atmosphere dim — see cake/CakeLighting.js's own
// dimForBlowOut() and cake/CakeAtmosphere.js's own dim(). Starts partway
// through the smoke beat, per the brief's own overlapping 0.5-1.8s
// window.
export const BLOWOUT_LIGHTING_DIM_START_DELAY = 0.38; // relative to button press
export const BLOWOUT_ATMOSPHERE_DIM_FRACTION = 0.4; // the atmosphere's own halo/ground-glow dim to this fraction of their resting opacity

// A short quiet hold once the lighting has finished dimming — the
// brief's own "anticipation" beat — before the fireworks sequence
// begins.
export const BLOWOUT_DARK_PAUSE_DURATION = 0.34;
