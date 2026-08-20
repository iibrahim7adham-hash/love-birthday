// ===========================
// Boom — Part 2 (heart burst: the instant bomb -> heart-cluster swap,
// the rapid expansion, and the settle into a dense heart-filled scene
// with a deepening background). Reproduces a specific reference (a
// 22-frame extraction, ~4.70s-6.00s) as closely as possible, the exact
// same "read values off the reference, don't invent them" approach
// bomb/BombConstants.js already used for Part 1.
//
// All timings here are RELATIVE to HeartBurst's own ignite() call (the
// instant BombIntro.readyForExplosion is read as true) rather than
// absolute reference seconds — Part 1 is locked and its own pacing was
// separately verified, so Part 2 anchors itself to the reference's own
// swap moment (between the reference's 4.84s and 4.88s frames) as t=0
// and re-expresses every later reference timestamp as an offset from
// that, e.g. reference 5.08s -> +0.22s here.
// ===========================

// ---- Palette. Same family as the reference: white, pale pink, medium
// pink, deep pink/red hearts, plus a small gold/yellow minority and a
// few soft round "bokeh" dots mixed in — never a single flat heart
// color.
export const HEART_COLORS = [
  { color: "#ffffff", weight: 2 },
  { color: "#fbd0e0", weight: 3 },
  { color: "#f27fa8", weight: 4 },
  { color: "#e2487e", weight: 3 },
  { color: "#c2185b", weight: 2 },
  { color: "#ffd54a", weight: 1 },
];

export const DOT_COLORS = ["#ffffff", "#fbd0e0", "#f6b6cc"];
export const YELLOW_ACCENT_COLOR = "#ffce54";

// ---- Background color stops the scene lerps through, pale pink (the
// same tones Part 1's own BoomScene background already uses) all the
// way to a deep dusty wine with darker corners — matching the
// reference's own continuous darkening, never an instant cut.
export const BACKGROUND_STOPS = [
  { t: 0, center: "#fde7ef", edge: "#f4c3d7" }, // Part 1's own resting tones
  { t: 0.12, center: "#fff3f6", edge: "#fbd6e3" }, // brief brightening as the flash peaks
  { t: 0.3, center: "#f0aec8", edge: "#c25f88" },
  { t: 0.55, center: "#8a3f5c", edge: "#451c2c" },
  { t: 1, center: "#5c2338", edge: "#200a12" },
];
export const BACKGROUND_TRANSITION_DURATION = 0.56;

// ---- Counts. Dense and overlapping at the center, never a sparse or
// perfectly-even field. HEART_COUNT raised from the original 84 —
// Gather.js's own later gathering animation (see boom/gather/) needs
// enough genuinely SMALL hearts to trace its outer silhouette cleanly
// without ever putting a large heart on that edge; the extra count
// (combined with HEART_SIZE_BIAS below skewing most of it small) is
// what supplies that, while still leaving the previous population of
// larger hearts intact for the interior.
export const HEART_COUNT = 120;
export const DOT_COUNT = 16;
export const YELLOW_ACCENT_COUNT = 5;

// Heart size range (world units) — a real spread, so scale itself
// reads as depth (some hearts noticeably bigger/closer than others),
// not a uniform stamp.
export const HEART_SIZE_MIN = 0.22;
export const HEART_SIZE_MAX = 0.75;
export const DOT_SIZE_MIN = 0.08;
export const DOT_SIZE_MAX = 0.18;
export const YELLOW_ACCENT_SIZE_MIN = 0.06;
export const YELLOW_ACCENT_SIZE_MAX = 0.12;

// Exponent biasing heart sizes toward HEART_SIZE_MIN (applied as
// Math.random() ** HEART_SIZE_BIAS before lerping into the size range
// — see HeartField.js's own buildInstances()). >1 skews the
// distribution toward small without ever excluding the top of the
// range, so most hearts land small (material for Gather.js's outer
// boundary trace) while a shrinking-but-present minority still reach
// up near HEART_SIZE_MAX (material for its interior fill) — dots/
// yellow accents are unaffected, still uniform (bias 1).
export const HEART_SIZE_BIAS = 2.2;

// ---- Cluster + spread geometry. Every heart starts jittered around
// the bomb's own final position (a tight overlapping cluster, matching
// the reference's own compact first-burst frame), then travels out to
// a target sampled from a disk sized off the CURRENT camera's actual
// visible bounds (read live in HeartField.js, not hardcoded — the
// shared Camera holds horizontal FOV constant across devices but
// vertical FOV genuinely changes with aspect, so only a live read gives
// a correct "fills the visible frame" result on every device). The
// margin pushes some targets past the visible edge on purpose — the
// reference clearly shows hearts partially clipped at the frame
// boundary, not everything neatly contained inside it.
export const CLUSTER_START_RADIUS = 0.35;
export const SPREAD_MARGIN = 1.22;
// Bias to sqrt(random) for a uniform-disk sample would spread hearts
// evenly; this exponent instead keeps more of them weighted toward the
// center (denser core, thinning toward the edge) — the reference's own
// composition, not an even fill.
export const SPREAD_RADIUS_BIAS = 0.72;

// ---- Motion timing. The fast part: a compact cluster expanding out to
// near-full coverage in well under half a second (reference ~4.88s ->
// ~5.08s). Individually staggered/varied per heart so the burst reads
// organic, never a single synchronized snap.
export const SPREAD_DURATION_MIN = 0.22;
export const SPREAD_DURATION_MAX = 0.34;
export const SPREAD_STAGGER_MAX = 0.06;

// ---- Continuous gentle drift once spread — the reference keeps
// showing small independent motion/rotation through its later frames
// (5.08s-5.42s), not a hard freeze the moment the burst finishes.
export const DRIFT_AMPLITUDE_MIN = 0.05;
export const DRIFT_AMPLITUDE_MAX = 0.14;
export const DRIFT_SPEED_MIN = 0.3;
export const DRIFT_SPEED_MAX = 0.7;
export const ROTATION_SPEED_MIN = -0.6;
export const ROTATION_SPEED_MAX = 0.6;

// ---- The bright flash at the very instant of the swap — the
// reference's own frames right after the cluster appears (4.92s-5.00s)
// read distinctly brighter/whiter before settling into the deeper rose
// tones, which this reproduces as a soft glow sprite that blooms then
// fades, not a separate lighting system.
export const FLASH_PEAK_SIZE = 7.5;
export const FLASH_START_SIZE = 0.6;
export const FLASH_GROW_DURATION = 0.22;
export const FLASH_FADE_DURATION = 0.4;
export const FLASH_PEAK_OPACITY = 0.85;

// ---- Part 4 (giftbox) — how long an individual heart/dot/yellow
// particle takes to fade out once it's found drifting inside the open
// gift box's own interior region (see HeartField.js's own
// hideInteriorRegion()/_maybeFadeInteriorParticles()). Shorter than the
// giftbox camera move itself so a particle caught right as the camera
// starts rising has still fully vanished well before the camera settles.
export const HEART_INTERIOR_FADE_DURATION = 0.7;
