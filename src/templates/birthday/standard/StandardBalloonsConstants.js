// ===========================
// Standard — balloons: a pooled, recycling background celebration layer
// that only becomes active once StandardCandleBlowout.js calls
// StandardBalloons.js's own start() (fired alongside
// StandardFireworks.js's own playCinematicSequence(), a beat after the
// candles are blown out) — never visible during the normal cake/candle
// state. Its own file, the same convention every other substantial
// Standard subsystem's own constants file follows.
// ===========================

import {
  STANDARD_ACCENT_PINK,
  STANDARD_ACCENT_PINK_SOFT,
  STANDARD_ACCENT_PINK_PALE,
  STANDARD_IVORY,
  STANDARD_GOLD,
  STANDARD_LAVENDER,
} from "./StandardPalette";

// Extended celebration accents — kept local to the balloon system rather
// than added to StandardPalette.js, since that file is the shared core
// brand identity (DOM overlays, fireworks, the cake's own atmosphere);
// these one-off pastel accents (rose/purple/champagne/peach/coral/
// pearl/blue) only ever apply to balloons, so folding them into the
// shared palette would dilute its purpose rather than serve it.
export const BALLOON_ROSE_PINK = "#E8A0B4";
export const BALLOON_SOFT_PURPLE = "#C9A8D8";
export const BALLOON_CHAMPAGNE_GOLD = "#E4CFA0";
export const BALLOON_PEACH = "#F5C6A0";
export const BALLOON_SOFT_CORAL = "#F2A98F";
export const BALLOON_PEARL = "#F0EAE2";
export const BALLOON_PASTEL_BLUE = "#B8D4E8";

// ---- Responsive breakpoints — four tiers (mobile/tablet/laptop/
// desktop), each with its own fixed pool size (see BALLOON_POOL_SIZE_*
// below). All width-based, the same convention
// StandardFireworksConstants.js's own FIREWORK_MOBILE_BREAKPOINT
// already uses.
export const BALLOON_BREAKPOINT_MOBILE = 560; // px
export const BALLOON_BREAKPOINT_TABLET = 900;
export const BALLOON_BREAKPOINT_LAPTOP = 1200;

// ---- Pool size — fixed at construction per breakpoint, reused for the
// entire experience (see StandardBalloons.js's own object-pooling
// comment). This IS the max active-balloon count: recycling only ever
// reinitializes an existing pooled slot, so the on-screen count can
// never grow past whichever of these applies — "a limited number of
// active balloons through recycling", never accumulating.
export const BALLOON_POOL_SIZE_MOBILE = 5;
export const BALLOON_POOL_SIZE_TABLET = 6;
export const BALLOON_POOL_SIZE_LAPTOP = 7;
export const BALLOON_POOL_SIZE_DESKTOP = 8;

// ---- Gradual introduction — balloons never all appear at once. With a
// pool this small (5-8), a couple of short waves are enough to bring
// the whole population in gradually — matching the brief's own worked
// example (first 1-2 balloons ~0.5-1.5s after fireworks begin, another
// 1-2 ~1.5-3s, a few more ~3-5s) — each with its own randomized
// per-wave stagger so no two balloons ever enter in perfect unison.
export const BALLOON_INTRO_FIRST_DELAY = 0.6;
export const BALLOON_INTRO_FIRST_WAVE_MIN = 1;
export const BALLOON_INTRO_FIRST_WAVE_MAX = 2;
export const BALLOON_INTRO_WAVE_MIN = 1;
export const BALLOON_INTRO_WAVE_MAX = 2;
export const BALLOON_INTRO_WAVE_INTERVAL_MIN = 0.7;
export const BALLOON_INTRO_WAVE_INTERVAL_MAX = 1.3;

// ---- Fade — every (re)activation fades in from 0 rather than popping
// in at full opacity; every recycle fades out over the final stretch of
// its climb rather than vanishing abruptly at the top edge, and never
// visibly "teleports" — by the time a balloon reaches the recycle
// point its opacity has already reached 0.
export const BALLOON_FADE_IN_DURATION = 0.9; // seconds
export const BALLOON_FADE_OUT_TRAVEL_FRACTION = 0.85; // fraction of total travel where fade-out begins

// ---- Placement — reuses the same camera-frustum technique
// StandardFireworks.js/cake/CakeAtmosphere.js already establish. A
// balloon's nx is fixed for its whole climb (just drifting a little via
// BALLOON_DRIFT_*), so — same reasoning as the fireworks trail fix — ANY
// nx within the cake's own horizontal footprint would pass through the
// cake/candles/title/button's protected column at some point during a
// full bottom-to-top climb, not just at one instant. So rather than a
// single "reroll if inside a central ellipse" check, nx is drawn
// directly from a set of named horizontal bands that already exclude
// that protected column entirely (see BALLOON_NX_BANDS) — every band is
// structurally safe, not just probably safe.
export const BALLOON_START_NY = -1.05; // just below the bottom edge
export const BALLOON_END_NY = 1.15; // just above the top edge — recycle once a balloon passes this

// The cake/candles/title/button's own true protected half-width, as a
// bare point-check boundary. A balloon's own on-screen radius (which
// varies with its tier's scale AND depth — a close, large balloon can
// be visually wide) is added on top of this at spawn time (see
// StandardBalloons.js's own _pickSpawnNx()) — checking the bands below
// alone is NOT enough, since a large/close balloon whose CENTER clears
// a band can still visually overlap the cake with its own edge.
export const BALLOON_PROTECTED_HALF_WIDTH = 0.26;
// The heart sprite/elongated body read visually wider near their own
// edges than the plain sphere-radius approximation used to compute a
// balloon's own half-width accounts for (a heart's two lobes reach
// close to its full sprite scale, not a tidy inscribed circle) — this
// multiplier pads that estimate so the protected boundary above has
// real slack instead of being a razor's-edge fit.
export const BALLOON_HALF_WIDTH_SAFETY_MULT = 1.3;

// Six named lanes spanning the width, all nominally clear of the
// protected center column. Weighted so far-left/far-right (the emptiest
// parts of the frame) get slightly more traffic than the lanes just
// outside the protected column, giving a genuinely full-width scatter
// rather than two dense bands hugging the cake. These are a starting
// point for VARIETY (which named region a balloon leans toward), not
// the final safety boundary — see BALLOON_PROTECTED_HALF_WIDTH above.
export const BALLOON_NX_BANDS = [
  { min: -0.95, max: -0.64, weight: 0.19 }, // far left
  { min: -0.64, max: -0.42, weight: 0.17 }, // left
  { min: -0.42, max: -0.28, weight: 0.09 }, // center-left edge
  { min: 0.28, max: 0.42, weight: 0.09 }, // center-right edge
  { min: 0.42, max: 0.64, weight: 0.17 }, // right
  { min: 0.64, max: 0.95, weight: 0.19 }, // far right
];

// ---- Anti-clustering — when a balloon (re)spawns, its candidate nx is
// checked against every OTHER active balloon that's still in the lower
// part of its own climb (see BALLOON_CLUSTER_CHECK_TRAVEL_FRACTION —
// a balloon already high up can't visually cluster with one just
// entering at the bottom). Bigger balloons need more breathing room, so
// the effective minimum separation scales with the two balloons' own
// combined scale.
export const BALLOON_MIN_NX_SEPARATION = 0.14; // normalized units, baseline for two average-scale balloons
export const BALLOON_CLUSTER_CHECK_TRAVEL_FRACTION = 0.4;
export const BALLOON_PLACEMENT_ATTEMPTS = 8;

// ---- Size tiers — the core of the "much more size variation" ask.
// Depth is deliberately a MODEST secondary cue (not the dominant size
// driver) so tiers read primarily through scale, with only a gentle
// closer/farther feel layered on top — a large tier that was both much
// bigger AND much closer would compound into an unintentionally huge
// balloon. Opacity is deliberately kept fairly high even for the
// smallest/farthest tier — alpha-blending a pale palette color down to
// a low opacity over this scene's near-black background linearly pulls
// it toward black, which reads as a muddy off-palette gray rather than
// a soft/dim pink. Scale and depth carry the "distance" read instead;
// opacity only adds a gentle assist.
export const BALLOON_TIERS = {
  veryTiny: {
    scaleMin: 0.35,
    scaleMax: 0.5,
    depthMin: 9.5,
    depthMax: 11.5,
    opacity: 0.66,
    riseSpeedMin: 0.2,
    riseSpeedMax: 0.28,
    driftAmpMin: 0.08,
    driftAmpMax: 0.26,
  },
  small: {
    scaleMin: 0.58,
    scaleMax: 0.78,
    depthMin: 8,
    depthMax: 9.5,
    opacity: 0.8,
    riseSpeedMin: 0.26,
    riseSpeedMax: 0.36,
    driftAmpMin: 0.1,
    driftAmpMax: 0.36,
  },
  medium: {
    scaleMin: 0.82,
    scaleMax: 1.05,
    depthMin: 6.8,
    depthMax: 8,
    opacity: 0.94,
    riseSpeedMin: 0.32,
    riseSpeedMax: 0.44,
    driftAmpMin: 0.12,
    driftAmpMax: 0.42,
  },
  large: {
    scaleMin: 1.2,
    scaleMax: 1.5,
    depthMin: 5.6,
    depthMax: 6.8,
    opacity: 1,
    riseSpeedMin: 0.36,
    riseSpeedMax: 0.5,
    driftAmpMin: 0.14,
    driftAmpMax: 0.48,
  },
};

// A small additional trim on top of the responsive size scale, mobile
// only.
export const BALLOON_MOBILE_SIZE_MULT = 0.83;

// Matches the brief's own 45/35/15/5 split. Mobile skews further toward
// small/veryTiny and away from large, per the brief's own "prefer
// small/medium, avoid large except very rarely" mobile rule.
export const BALLOON_TIER_WEIGHTS = { veryTiny: 0.15, small: 0.45, medium: 0.35, large: 0.05 };
export const BALLOON_TIER_WEIGHTS_MOBILE = { veryTiny: 0.22, small: 0.5, medium: 0.26, large: 0.02 };

// ---- Motion — every balloon rolls its own rise speed (from its own
// tier range above), horizontal drift amplitude/frequency/phase, and
// gentle rotational sway — deliberately never synchronized between
// balloons. The drift amplitude floor is low enough that some balloons
// read as drifting almost straight up, while the ceiling lets others
// read as gently curving/swaying — both extremes rolled independently
// per balloon, not configured globally.
export const BALLOON_DRIFT_FREQ_MIN = 0.1; // radians/sec
export const BALLOON_DRIFT_FREQ_MAX = 0.32;
export const BALLOON_ROTATION_AMPLITUDE_MIN = 0.05; // radians (~3deg)
export const BALLOON_ROTATION_AMPLITUDE_MAX = 0.14; // radians (~8deg)
export const BALLOON_ROTATION_FREQ_MIN = 0.15;
export const BALLOON_ROTATION_FREQ_MAX = 0.35;

// ---- Colors — a genuinely wider pastel celebration palette, not just
// pink+white. Pink-family shades (baby/soft/pale/rose) sum to ~44% —
// still the anchor of the palette, but no longer the dominant majority
// — spread across purple/gold/peach/coral/white/pearl and a very rare
// pastel blue. Every entry stays soft/pastel; nothing saturated or
// neon.
export const BALLOON_COLORS = [
  { color: STANDARD_ACCENT_PINK, weight: 0.14 }, // baby pink
  { color: STANDARD_ACCENT_PINK_SOFT, weight: 0.12 }, // soft pink
  { color: STANDARD_ACCENT_PINK_PALE, weight: 0.1 }, // pale pink
  { color: BALLOON_ROSE_PINK, weight: 0.08 },
  { color: STANDARD_LAVENDER, weight: 0.08 },
  { color: BALLOON_SOFT_PURPLE, weight: 0.06 },
  { color: BALLOON_CHAMPAGNE_GOLD, weight: 0.08 },
  { color: STANDARD_GOLD, weight: 0.06 }, // warm gold
  { color: BALLOON_PEACH, weight: 0.08 },
  { color: BALLOON_SOFT_CORAL, weight: 0.06 },
  { color: STANDARD_IVORY, weight: 0.08 }, // warm white
  { color: BALLOON_PEARL, weight: 0.04 },
  { color: BALLOON_PASTEL_BLUE, weight: 0.02 }, // very subtle — rarest by design
];

// ---- Shape variety — heart only, per explicit request. Kept as a
// weighted map (rather than removing the shape system) so
// StandardBalloons.js's own pickWeighted() picking logic needs no
// change — it just always resolves to "heart" now.
export const BALLOON_SHAPE_WEIGHTS = { heart: 1 };

// "Special" balloons (translucent glass or a soft metallic sheen) are
// an independent roll on top of shape — only applied to classic/
// elongated bodies, never hearts, keeping hearts a clean, simple
// accent. Uses additive blending (see StandardBalloons.js's own
// _initBalloon()) rather than plain low-alpha transparency — alpha-
// blending a pale color down over this scene's near-black background
// just pulls it toward gray, not an elegant frosted/metallic look.
export const BALLOON_SPECIAL_CHANCE = 0.08;
export const BALLOON_SPECIAL_OPACITY_MULT = 0.7;

// ---- String — a slight, animated curve (via a 3-point line whose
// midpoint trails the balloon's own current drift velocity) rather than
// a rigid straight segment.
export const BALLOON_STRING_TOP_Y = -0.5; // local to the balloon body
export const BALLOON_STRING_BOTTOM_Y = -1.15;
export const BALLOON_STRING_CURVE_MULT = 1.6; // how strongly the string's midpoint trails the drift velocity
export const BALLOON_STRING_OPACITY = 0.4;

export const BALLOON_BODY_RADIUS = 0.4; // world units, before the tier's own scale multiplier
