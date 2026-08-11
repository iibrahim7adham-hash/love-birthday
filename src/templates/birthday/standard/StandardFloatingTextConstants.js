// ===========================
// Standard — floating text: short romantic/birthday phrases that drift
// through the scene alongside the heart balloons, starting only once
// StandardFloatingText.js's own start() is called (fired alongside
// StandardBalloons.js's own start()/StandardFireworks.js's own
// playCinematicSequence(), from StandardCandleBlowout.js). Pure DOM+CSS+
// GSAP, the same overlay pattern every other Standard text element uses
// — never visible during the normal cake/candle state.
// ===========================

import { STANDARD_ACCENT_PINK, STANDARD_ACCENT_PINK_SOFT, STANDARD_IVORY, STANDARD_GOLD, STANDARD_LAVENDER } from "./StandardPalette";

export const FLOATING_TEXT_PHRASES = [
  "I LOVE YOU 💕",
  "You are my happiness 💗",
  "Forever yours ❤️",
  "You mean the world to me 💕",
  "My Heart ❤️",
  "Love of my life 💗",
  "Happy Birthday 🎂",
  "You are special 💕",
  "You are amazing ✨",
  "With you, everything is beautiful 💗",
  "Be happy always 💕",
  "You make everything better ❤️",
  "Forever and always 💗",
  "You are my favorite person ❤️",
  "My beautiful girl 💕",
  "بحبك ❤️",
  "أنتِ كل حياتي 💗",
  "أنتِ أجمل عطية ❤️",
  "عمري أنتِ 💕",
  "قلبي أنتِ ❤️",
  "أحبك أكثر كل يوم 💗",
  "أنتِ نور حياتي ✨",
  "وجودك أجمل شيء ❤️",
];

export const FLOATING_TEXT_COLORS = [STANDARD_ACCENT_PINK, STANDARD_ACCENT_PINK_SOFT, STANDARD_IVORY, STANDARD_GOLD, STANDARD_LAVENDER];

// Placement is now a loose, randomized RING around the cake rather than
// screen-edge zones — an angle (any direction) plus an independently
// randomized X/Y radius (in vw/vh, an ellipse rather than a circle so it
// respects the viewport's own shape) from a center point roughly where
// the cake sits. Each radius always samples at/above its own MIN, so a
// phrase can never land in the small protected area right on top of the
// cake, and never above its own MAX, so it can't drift out to the
// screen edges — see StandardFloatingText.js's own _pickPosition().
export const FLOATING_TEXT_CENTER_LEFT = 50; // vw — roughly the cake's own horizontal center
export const FLOATING_TEXT_CENTER_TOP = 54; // vh — roughly the cake's own vertical center
export const FLOATING_TEXT_RADIUS_X_MIN = 15;
export const FLOATING_TEXT_RADIUS_X_MAX = 32;
export const FLOATING_TEXT_RADIUS_Y_MIN = 9;
export const FLOATING_TEXT_RADIUS_Y_MAX = 22;
// A last-resort clamp so an extreme angle+radius combo still can't push
// a phrase off-screen on a narrow/short viewport.
export const FLOATING_TEXT_LEFT_BOUNDS = [3, 97];
export const FLOATING_TEXT_TOP_BOUNDS = [7, 95];

export const FLOATING_TEXT_BREAKPOINT_MOBILE = 560;
export const FLOATING_TEXT_BREAKPOINT_TABLET = 900;

// The max SIMULTANEOUSLY visible phrase count — this IS the pool size,
// same "pool size = max active count, recycling never grows it"
// contract StandardBalloons.js already establishes.
export const FLOATING_TEXT_POOL_SIZE_MOBILE = 2;
export const FLOATING_TEXT_POOL_SIZE_TABLET = 3;
export const FLOATING_TEXT_POOL_SIZE_DESKTOP = 4;

// Gradual introduction — each pool slot's own FIRST appearance is
// staggered, so phrases never all pop in together.
export const FLOATING_TEXT_INTRO_BASE_DELAY = 1.4;
export const FLOATING_TEXT_INTRO_STAGGER_MIN = 1.2;
export const FLOATING_TEXT_INTRO_STAGGER_MAX = 2.6;

export const FLOATING_TEXT_FADE_IN_DURATION_MIN = 0.6;
export const FLOATING_TEXT_FADE_IN_DURATION_MAX = 1.0;
export const FLOATING_TEXT_HOLD_DURATION_MIN = 2.6;
export const FLOATING_TEXT_HOLD_DURATION_MAX = 4.2;
export const FLOATING_TEXT_FADE_OUT_DURATION_MIN = 0.6;
export const FLOATING_TEXT_FADE_OUT_DURATION_MAX = 1.0;

// Gap between one lifecycle ending and the same pool slot's next one
// starting — this is what keeps appearances feeling random/spread out
// rather than an immediate back-to-back recycle.
export const FLOATING_TEXT_RECYCLE_DELAY_MIN = 1.4;
export const FLOATING_TEXT_RECYCLE_DELAY_MAX = 3.8;

export const FLOATING_TEXT_FLOAT_DISTANCE_MIN = 14; // px, gentle vertical drift over the hold
export const FLOATING_TEXT_FLOAT_DISTANCE_MAX = 26;
export const FLOATING_TEXT_ROTATION_MIN = -6; // degrees
export const FLOATING_TEXT_ROTATION_MAX = 6;
export const FLOATING_TEXT_SCALE_MIN = 0.85;
export const FLOATING_TEXT_SCALE_MAX = 1.15;
export const FLOATING_TEXT_PEAK_OPACITY_MIN = 0.75;
export const FLOATING_TEXT_PEAK_OPACITY_MAX = 0.95;
