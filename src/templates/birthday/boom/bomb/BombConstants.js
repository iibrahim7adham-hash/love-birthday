// ===========================
// Boom — Part 1 (bomb intro: entry -> roll -> settle -> cap -> fuse ->
// ignite -> anticipation -> pre-explosion hold). Reproduces a specific
// reference (a 16-frame extraction from the source video, ~1.4s-4.9s)
// as closely as possible — every value below is either read directly
// off that reference or derived from it, not an original design pass.
// Mirrors standard/cake/CakeConstants.js's own role for this cluster.
// ===========================

// ---- Character palette — a cute cartoon bomb, not a realistic one.
// Dark charcoal/navy body (never pure black), white eyes/mouth, warm
// pink cheeks, light-gray cap/fuse, a small warm spark at the tip.
export const BOMB_BODY_COLOR = "#2a2d3d";
export const BOMB_EYE_COLOR = "#ffffff";
export const BOMB_MOUTH_COLOR = "#ffffff";
export const BOMB_CHEEK_COLOR = "#f2a0bd";
export const BOMB_CAP_COLOR = "#c7cad2";
export const BOMB_FUSE_COLOR = "#9a9fae";
export const BOMB_SPARK_CORE_COLOR = "#fff1b8";
export const BOMB_SPARK_OUTER_COLOR = "#ffab3d";
export const BOMB_SHADOW_COLOR = "#8a5468";

// ---- Body proportions. Small and centered with a lot of negative
// space around it, per the reference — never a hero-sized object.
export const BOMB_RADIUS = 0.7;

export const BOMB_EYE_RADIUS = BOMB_RADIUS * 0.11;
export const BOMB_EYE_OFFSET_X = BOMB_RADIUS * 0.28;
export const BOMB_EYE_OFFSET_Y = BOMB_RADIUS * 0.14;

export const BOMB_CHEEK_RADIUS = BOMB_RADIUS * 0.17;
export const BOMB_CHEEK_SQUASH = 0.55; // ellipse: scale.y relative to scale.x
export const BOMB_CHEEK_OFFSET_X = BOMB_RADIUS * 0.62;
export const BOMB_CHEEK_OFFSET_Y = BOMB_RADIUS * -0.02;
export const BOMB_CHEEK_TILT = 0.35; // radians, leaning outward

export const BOMB_MOUTH_RADIUS = BOMB_RADIUS * 0.34; // the smile arc's own radius
export const BOMB_MOUTH_THICKNESS = BOMB_RADIUS * 0.08;
export const BOMB_MOUTH_OFFSET_Y = BOMB_RADIUS * -0.16;
// The smile spans the bottom arc of a circle — centered on "straight
// down" (270°) so it reads as a simple curved grin, not a full ring.
export const BOMB_MOUTH_ARC_START = Math.PI * (200 / 180);
export const BOMB_MOUTH_ARC_LENGTH = Math.PI * (140 / 180);

export const BOMB_MOUTH_SURPRISED_RADIUS = BOMB_RADIUS * 0.11;

// ---- Cap + fuse — only revealed once the bomb has fully settled (see
// BombIntro.js). Small relative to the body, per the reference; the
// fuse leans rather than standing perfectly straight.
export const BOMB_CAP_WIDTH = BOMB_RADIUS * 0.4;
export const BOMB_CAP_HEIGHT = BOMB_RADIUS * 0.22;
export const BOMB_CAP_CORNER_RADIUS = BOMB_CAP_HEIGHT * 0.35;
export const BOMB_CAP_OFFSET_Y = BOMB_RADIUS * 0.98;

export const BOMB_FUSE_LENGTH = BOMB_RADIUS * 0.5;
export const BOMB_FUSE_RADIUS = BOMB_RADIUS * 0.045;
export const BOMB_FUSE_LEAN = Math.PI * (14 / 180); // leans slightly right
export const BOMB_FUSE_OFFSET_Y = BOMB_CAP_OFFSET_Y + BOMB_CAP_HEIGHT * 0.55;

export const BOMB_SPARK_SIZE = BOMB_RADIUS * 0.4;

// ---- Ground contact shadow — soft, low-opacity, stretched wide, never
// a hard dark circle.
export const BOMB_SHADOW_RADIUS = BOMB_RADIUS * 0.9;
export const BOMB_SHADOW_SQUASH = 0.32;
export const BOMB_SHADOW_OFFSET_Y = -BOMB_RADIUS * 0.92;
export const BOMB_SHADOW_OPACITY = 0.22;

// ---- Composition. Y = 0 keeps the bomb dead-centered on every device
// (the shared engine Camera already holds horizontal FOV constant
// across aspect ratios — see engine/camera/Camera.js — so a fixed
// world-space X/size already reads at a consistent on-screen scale and
// position on mobile/tablet/desktop with no extra per-template
// responsive math needed here, unlike e.g. standard/cake, which needed
// its own compensation for a taller subject).
export const BOMB_CENTER_X = 0;
export const BOMB_Y = 0;

// Just past the edge of what's visible at the shared engine Camera's
// held-constant horizontal FOV (see the Y comment above) — enough to
// start genuinely off-screen without a long hidden run-up before it. A
// long hidden head start (e.g. sized from an exact rotation count, as
// this used to be computed) reads wrong against the reference: with an
// eased roll, most of a long hidden distance gets covered WHILE still
// off-screen, so the bomb appears to teleport near-center the instant
// it becomes visible instead of visibly traveling the way the
// reference does across ~1.6s-2.4s.
export const BOMB_START_X = -6.2;

// Rotation is tweened on its OWN (see BombIntro.js's own roll tween) —
// not derived from position — specifically so it can land on an exact
// multiple of a full turn (perfectly upright, matching the reference's
// clean symmetric settled frame) independent of whatever start
// distance reads right visually. Both tweens share the same duration
// and ease, so they still stay visually locked together as one
// "rolling" motion.
export const BOMB_ROLL_ROTATIONS = 2;
export const BOMB_ROLL_ROTATION_START = -(BOMB_ROLL_ROTATIONS * 2 * Math.PI);

// ===========================
// Timing — originally reproduced the reference's own approximate
// timestamps (a 16-frame extraction, ~1.4s-4.9s) as closely as possible.
// Retimed (2026) to bring the whole Boom scene down from ~1:10 to
// ~45-50s total (see giftbox/GiftBoxConstants.js and
// letter/LetterConstants.js for the other retimed parts) — every stage
// below is compressed proportionally from those original
// reference-matched values (still noted in each comment) rather than
// cut or reordered, so BombIntro.js's own cursor math still reads the
// same shape, just tighter.
// ===========================
export const BOMB_ENTRY_DELAY = 1.0; // bomb begins entering (was 1.5)
export const BOMB_ROLL_DURATION = 0.75; // entering + rolling + slowing into place (was 0.9)
export const BOMB_STOP_PAUSE = 0.15; // brief stillness before anything else happens

export const BOMB_CAP_APPEAR_DURATION = 0.3;
export const BOMB_FUSE_APPEAR_DURATION = 0.2;
export const BOMB_IGNITE_DURATION = 0.2; // spark pops in

// Anticipation begins this long after the ignite pop-in finishes
// (BOMB_ENTRY_DELAY + BOMB_ROLL_DURATION + BOMB_STOP_PAUSE +
// BOMB_CAP_APPEAR_DURATION + BOMB_FUSE_APPEAR_DURATION +
// BOMB_IGNITE_DURATION = 2.6s) — kept as an absolute cursor value (not
// computed from the above) so BombIntro.js's own timeline reads the
// same shape the reference-timed original did, just re-anchored to the
// compressed stage durations above instead of the original ~4.0s mark.
export const BOMB_ANTICIPATION_AT = 2.95;
export const BOMB_FACE_TRANSITION_DURATION = 0.6; // happy -> surprised (was 0.8)

// The burning point's own travel from the tip to the base (see
// FuseBurn.js) is what actually drives the handoff to the explosion —
// sized so ignite-finish (2.6s) + this duration lands the whole Part 1
// at ~4.0s total (was ~5.0s), rather than a disconnected fixed hold
// timer. Comfortably leaves BOMB_ANTICIPATION_AT + BOMB_FACE_TRANSITION_DURATION
// (2.95 + 0.6 = 3.55s) finishing well before the 4.0s handoff.
export const BOMB_BURN_TRAVEL_DURATION = 1.4;

// ---- Fuse-tip flame — a continuous per-frame organic flicker (see
// bomb/FuseFlame.js), not a single GSAP tween. Every amplitude here is
// a small FRACTION/offset relative to wherever the flame's own ignite
// pop-in animation settles, not an absolute size — see FuseFlame.js's
// own comment on why. Each property uses its own, deliberately
// non-matching speed so scale/rotation/position/opacity never crest at
// the same instant — a real flicker, not a uniform breathing pulse.
export const FUSE_FLAME_SCALE_AMPLITUDE = 0.12; // ±12% of rest size
export const FUSE_FLAME_SCALE_SPEED = 5.5; // rad/s
export const FUSE_FLAME_ROTATION_AMPLITUDE = 0.18; // radians, ~10°
export const FUSE_FLAME_ROTATION_SPEED = 3.2;
export const FUSE_FLAME_POSITION_AMPLITUDE = BOMB_RADIUS * 0.035; // tiny — a wobble, not a drift
export const FUSE_FLAME_POSITION_SPEED = 4.6;
export const FUSE_FLAME_OPACITY_MIN = 0.78;
export const FUSE_FLAME_OPACITY_MAX = 1;
export const FUSE_FLAME_OPACITY_SPEED = 7;

// ---- Fuse burn travel (see bomb/FuseBurn.js) — the charred overlay
// that grows behind the traveling flame, and the small embers that
// spawn near it. The tip/base anchor factor (0.62, not 0.5) matches
// exactly how BombGeometry.js already placed the flame's own original
// resting position, so the burn starts from that same exact point
// rather than causing a visible jump.
export const FUSE_BURN_END_FACTOR = 0.62;
export const FUSE_CHARRED_COLOR = "#332e28";

export const EMBER_COUNT = 4;
export const EMBER_COLOR = "#ffb04d";
export const EMBER_SIZE = BOMB_RADIUS * 0.06;
export const EMBER_LIFETIME = 0.5; // seconds per spawn-drift-fade cycle
export const EMBER_PEAK_OPACITY = 0.8;
export const EMBER_DRIFT_RADIUS = BOMB_RADIUS * 0.1; // small outward scatter
export const EMBER_UPWARD_DRIFT = BOMB_RADIUS * 0.16;
