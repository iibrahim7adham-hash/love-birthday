// ===========================
// Standard — fireworks: the occasional ambient background bursts that
// accompany the celebration stage, and the on-demand cinematic
// escalating sequence StandardCandleBlowout.js triggers once the
// candles are blown out (see StandardFireworks.js's own
// playCinematicSequence()). Both share the exact same rocket-launch and
// layered-burst mechanics below — the cinematic sequence is simply
// "more of the same firework, more often, wider spread", not a second
// implementation. Its own file, the same convention every other
// substantial Standard subsystem's own constants file follows.
// ===========================

import {
  STANDARD_ACCENT_PINK,
  STANDARD_ACCENT_PINK_SOFT,
  STANDARD_ACCENT_PINK_PALE,
  STANDARD_IVORY,
  STANDARD_GOLD,
} from "./StandardPalette";

// ---- Spawning — random intervals with an occasional quick second
// burst, so the pacing "breathes" (per the brief) rather than firing on
// a metronome or flooding the scene. This governs the AMBIENT background
// fireworks only — the cinematic sequence below runs its own scripted
// escalation instead.
export const FIREWORK_ENTER_DELAY = 3; // let the message field establish itself first
export const FIREWORK_SPAWN_INTERVAL_MIN = 2.4;
export const FIREWORK_SPAWN_INTERVAL_MAX = 5.2;
export const FIREWORK_DOUBLE_BURST_CHANCE = 0.22;
export const FIREWORK_DOUBLE_BURST_DELAY_MIN = 0.35;
export const FIREWORK_DOUBLE_BURST_DELAY_MAX = 0.9;

export const FIREWORK_MOBILE_BREAKPOINT = 560; // px
export const FIREWORK_MAX_CONCURRENT = 3;
export const FIREWORK_MAX_CONCURRENT_MOBILE = 2;

// ---- Rocket — launches from the LOWER part of the viewport (not just
// a short hop below its own burst point) and rises to the burst
// position, leaving a real elongated glowing trail behind it (see
// StandardFireworks.js's own getTrailTexture()/_spawnFirework()) —
// "bottom of screen -> rises -> explodes", per the brief. The launch
// point's own horizontal offset is randomized independently of the
// burst's own nx (see FIREWORK_LAUNCH_NX_JITTER), so the rocket visibly
// angles up toward its target rather than always rising perfectly
// straight beneath it.
export const FIREWORK_ROCKET_RISE_DURATION_MIN = 1.05; // longer now — travelling screen-bottom to upper/mid frame, not a short hop
export const FIREWORK_ROCKET_RISE_DURATION_MAX = 1.7;
export const FIREWORK_LAUNCH_NY = -0.99; // bottom edge of the frustum at the rocket's own depth
export const FIREWORK_LAUNCH_NX_JITTER = 0.16; // fraction of frustum half-width, offset from the burst's own nx
export const FIREWORK_ROCKET_SCALE = 0.055;
export const FIREWORK_ROCKET_COLOR = STANDARD_ACCENT_PINK_PALE;
export const FIREWORK_PEAK_PAUSE = 0.1;

// ---- Rocket trail — a single elongated, gradient-textured sprite
// (bright at the rocket's own current position, fading toward the
// launch point) rather than a chain of dot-echoes — reads as a genuine
// continuous glowing trail instead of a beaded line. Grown via a plain
// GSAP tween using the exact same easing as the rocket's own rise (see
// _spawnFirework()), so it always tracks the rocket's true position
// without needing a per-frame onUpdate callback.
export const FIREWORK_TRAIL_THICKNESS_MULT = 0.85; // relative to the rocket's own scale
export const FIREWORK_TRAIL_PEAK_OPACITY = 0.85;
export const FIREWORK_TRAIL_FADE_IN_FRACTION = 0.18; // fraction of rise duration spent fading the trail in

// ---- Burst — layered: a bright quick central flash, fast outward main
// particles (a fraction of which read as short streaks rather than
// round dots), a slightly-delayed secondary-spark layer, and a small
// longer-lingering glitter/residual layer — see StandardFireworks.js's
// own _burst(). This is a genuinely more detailed explosion than a
// single radiate-and-fade particle ring, per the brief's own "much more
// detailed and powerful" ask.
export const FIREWORK_BURST_PARTICLE_COUNT = 20;
export const FIREWORK_BURST_RADIUS_MIN = 0.95;
export const FIREWORK_BURST_RADIUS_MAX = 1.6;
export const FIREWORK_BURST_DURATION = 1.2;
export const FIREWORK_BURST_PARTICLE_SCALE_MIN = 0.065;
export const FIREWORK_BURST_PARTICLE_SCALE_MAX = 0.12;
export const FIREWORK_BURST_PEAK_OPACITY = 0.95;

export const FIREWORK_STREAK_FRACTION = 0.35; // fraction of main particles that render as short outward streaks instead of round dots
export const FIREWORK_STREAK_LENGTH_MULT = 2.6; // relative to a normal round particle's own scale

export const FIREWORK_FLASH_SCALE_MULT = 2.6; // relative to the burst's own particle scale — the brief's own "bright central flash"
export const FIREWORK_FLASH_DURATION = 0.22;
export const FIREWORK_FLASH_PEAK_OPACITY = 0.9;

export const FIREWORK_SECONDARY_SPARK_COUNT_FRACTION = 0.4; // relative to the main particle count
export const FIREWORK_SECONDARY_SPARK_DELAY = 0.12; // starts just after the main particles depart, a small "crackle" beat
export const FIREWORK_SECONDARY_SPARK_RADIUS_MULT = 0.55;
export const FIREWORK_SECONDARY_SPARK_SCALE_MULT = 0.55;
export const FIREWORK_SECONDARY_SPARK_DURATION_MULT = 0.6;

export const FIREWORK_RESIDUAL_COUNT_FRACTION = 0.3; // relative to the main particle count — the brief's own "tiny glitter" + "fading residual" layers, combined
export const FIREWORK_RESIDUAL_SCALE_MULT = 0.3;
export const FIREWORK_RESIDUAL_RADIUS_MULT = 0.75;
export const FIREWORK_RESIDUAL_DURATION_MULT = 1.8; // lingers noticeably longer than the main burst
export const FIREWORK_RESIDUAL_PEAK_OPACITY = 0.55;

// Restrained Baby Pink + soft pink + pale pink + warm white + soft gold —
// never a saturated rainbow. Each firework picks its own random offset
// into this palette (see StandardFireworks.js's own _spawnFirework())
// rather than every firework starting from index 0, so different
// fireworks read as pink-dominant, gold-dominant, or white-dominant
// rather than all sharing the exact same first color — the brief's own
// "gold/pink mixed explosion" variety.
export const FIREWORK_COLORS = [STANDARD_ACCENT_PINK, STANDARD_ACCENT_PINK_SOFT, STANDARD_ACCENT_PINK_PALE, STANDARD_IVORY, STANDARD_GOLD];

// ---- Placement — reuses the exact camera-frustum technique
// cake/CakeAtmosphere.js's own _computeReferenceCameraBasis()/
// _randomFramePosition() already establishes for its star field, so
// fireworks reach the same full-frame coverage on any aspect ratio with
// no separate responsive logic. Biased toward the upper portion of the
// frame (a small positive ny floor) since real fireworks bloom above
// the horizon, and kept clear of dead-center so bursts don't sit
// directly behind the cake's own core silhouette.
export const FIREWORK_DEPTH_MIN = 5; // world units in front of the reference camera
export const FIREWORK_DEPTH_MAX = 11;
export const FIREWORK_SCREEN_COVERAGE = 0.85;
export const FIREWORK_NY_MIN = -0.1; // occasionally a little lower, mostly upper frame
export const FIREWORK_NY_MAX = 0.85;
export const FIREWORK_EXCLUSION_RADIUS_X = 0.22;
export const FIREWORK_EXCLUSION_RADIUS_Y = 0.16;

// ---- Occasional "mega" firework — the brief's own "occasional very
// large fireworks", rarer than the foreground tier's own already-larger
// size. Only ever rolled for a foreground-tier firework, so "very large"
// stays genuinely rare relative to "medium" (midground).
export const FIREWORK_MEGA_CHANCE = 0.16;
export const FIREWORK_MEGA_SCALE_MULT = 1.55;
export const FIREWORK_MEGA_PARTICLE_COUNT_MULT = 1.3;

// ===========================
// Cinematic sequence — triggered on demand (see StandardFireworks.js's
// own playCinematicSequence()) by StandardCandleBlowout.js once the
// candles are blown out and the lighting has dimmed. Escalates from a
// single firework into a full-viewport celebration, sustains at its
// peak, then hands back to the ambient ("occasional background bursts")
// behavior above — with its own lower maxConcurrent quietly restored —
// for a calmer continuous atmosphere. Never a hard stop.
// ===========================
export const FIREWORK_CINEMATIC_MAX_CONCURRENT_DESKTOP = 20;
export const FIREWORK_CINEMATIC_MAX_CONCURRENT_MOBILE = 11;

// Scripted escalating waves: `at` is seconds from the sequence's own
// start, `count` is how many fireworks that wave attempts to spawn
// (each with its own small random stagger — see
// FIREWORK_CINEMATIC_WAVE_SPAWN_STAGGER_MIN/MAX below) — "one strong
// rocket -> another from a different location -> 2-3 overlapping ->
// increase frequency -> strong peak" per the brief. Each individual
// firework's own visible lifetime (rise + burst + fade) is now ~2.5-3.5s
// (the rocket's own rise alone got noticeably longer for the bottom-
// launch trajectory), so waves spaced well inside that lifetime produce
// real, substantial overlap — several fireworks genuinely mid-flight/
// mid-burst/mid-fade at once by the later waves, not one-at-a-time.
export const FIREWORK_CINEMATIC_WAVES = [
  { at: 0, count: 1 },
  { at: 0.5, count: 1 },
  { at: 1.0, count: 2 },
  { at: 1.7, count: 3 },
  { at: 2.5, count: 4 },
  { at: 3.4, count: 5 },
  { at: 4.4, count: 6 },
  { at: 5.6, count: 7 },
];
export const FIREWORK_CINEMATIC_WAVE_SPAWN_STAGGER_MIN = 0.06;
export const FIREWORK_CINEMATIC_WAVE_SPAWN_STAGGER_MAX = 0.24;

// Once the scripted waves finish, a sustained peak (still at the
// cinematic tier's own higher maxConcurrent, and still spawning
// frequently enough that several fireworks overlap) before easing back
// down — the brief's own "the whole screen feels alive" hold, then
// "transition into a slightly calmer but still active" atmosphere
// rather than an abrupt stop.
export const FIREWORK_CINEMATIC_SUSTAIN_DELAY_AFTER_LAST_WAVE = 0.9;
export const FIREWORK_CINEMATIC_SUSTAIN_DURATION = 7;
export const FIREWORK_CINEMATIC_SUSTAIN_INTERVAL_MIN = 0.22;
export const FIREWORK_CINEMATIC_SUSTAIN_INTERVAL_MAX = 0.5;

// The cinematic sequence's own bursts read larger/more prominent than
// the ambient spawner's own restrained background accents — applied on
// top of each firework's own tier multiplier (see
// StandardFireworks.js's own _spawnFirework()).
export const FIREWORK_CINEMATIC_RADIUS_MULT = 1.15;
export const FIREWORK_CINEMATIC_SCALE_MULT = 1.25;

// Wider coverage and a genuinely larger cake-clear zone than the
// ambient spawner's own defaults — "almost the entire viewport" while
// keeping the brief's own "2-2.5 cake widths" of protected space around
// the cake, now that the scene is asking for full-screen coverage
// rather than an occasional background accent.
export const FIREWORK_CINEMATIC_SCREEN_COVERAGE = 0.97;
export const FIREWORK_CINEMATIC_NY_MIN = -0.4;
export const FIREWORK_CINEMATIC_NY_MAX = 0.94;
export const FIREWORK_CINEMATIC_EXCLUSION_RADIUS_X = 0.3;
export const FIREWORK_CINEMATIC_EXCLUSION_RADIUS_Y = 0.24;

// ---- Depth tiers — background/midground/foreground, each biasing an
// individual firework's own depth range/particle-count/scale/opacity/
// duration so the sequence reads as spatially layered rather than one
// flat scatter of identical bursts (see StandardFireworks.js's own
// _spawnFirework()). Weighted so midground (the "main fireworks" per
// the brief) is the most common, foreground (which can additionally
// roll "mega" — see FIREWORK_MEGA_CHANCE above) the rarest.
export const FIREWORK_TIERS = {
  background: { depthMin: 9, depthMax: 13, particleCountMult: 0.65, scaleMult: 0.7, opacityMult: 0.65, durationMult: 1.3 },
  midground: { depthMin: 6, depthMax: 9.5, particleCountMult: 1, scaleMult: 1, opacityMult: 1, durationMult: 1 },
  foreground: { depthMin: 5.4, depthMax: 7.2, particleCountMult: 1.4, scaleMult: 1.4, opacityMult: 1.2, durationMult: 0.9 },
};
export const FIREWORK_TIER_WEIGHTS = { background: 0.32, midground: 0.46, foreground: 0.22 };

// ---- Burst shape variety — each shape only changes the outward
// direction-vector distribution a burst's own main particles travel
// along (see StandardFireworks.js's own _burstDirection()); every other
// layer (flash/streaks/secondary sparks/residual) stays the same
// mechanism for every shape, so this never needs a second burst
// implementation. "round" (the ambient spawner's own original shape)
// stays the most common so the cinematic sequence still reads as the
// same firework language, just richer.
export const FIREWORK_SHAPE_WEIGHTS = {
  round: 0.36,
  dense: 0.14,
  horizontal: 0.14,
  vertical: 0.12,
  glitter: 0.16,
  heart: 0.08,
};

export const FIREWORK_GLITTER_PARTICLE_COUNT_MULT = 1.7;
export const FIREWORK_GLITTER_SCALE_MULT = 0.5;
export const FIREWORK_GLITTER_DURATION_MULT = 0.7;

// "dense" — the brief's own "dense sparkling burst": more particles, a
// touch smaller and tighter, otherwise identical to round.
export const FIREWORK_DENSE_PARTICLE_COUNT_MULT = 1.5;
export const FIREWORK_DENSE_SCALE_MULT = 0.8;
export const FIREWORK_DENSE_RADIUS_MULT = 0.85;
