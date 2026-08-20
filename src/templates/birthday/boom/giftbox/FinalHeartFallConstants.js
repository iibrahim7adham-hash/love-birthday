// ===========================
// Part 17 — the DENSE, CONTINUOUS "heart rain" celebration that plays
// once "اي رضيت" is pressed and the question UI has faded away (see
// GiftBox.js's own _answerYes() and FinalHeartFall.js). Pure DOM, driven
// by a single shared requestAnimationFrame loop — no Three.js render
// loop, no per-frame allocation, no unbounded DOM growth: a FIXED POOL
// of hearts (never grown/shrunk while running) that fall, then
// accumulate into a growing pile at the bottom of the screen (Part 18).
// The heart SHAPE and COLORS are the scene's own existing background
// hearts (see heartburst/HeartTextures.js's own getHeartTexture() and
// heartburst/HeartBurstConstants.js's own HEART_COLORS).
// ===========================

// Part 19 — a FIXED pool of DOM elements, created once and never grown.
// This is now the pool of ACTIVE (falling/settling) hearts only — once a
// heart settles it is baked into the accumulation canvas (see
// FinalHeartFall.js's own _bakeSettledHeart()) and this same element is
// immediately recycled as a brand-new falling heart, so the rain runs
// forever without the DOM element count ever growing past this number,
// no matter how large the settled pile gets.
export const HEARTFALL_TARGET_CONCURRENT = 420;

export const HEARTFALL_MIN_SIZE = 12;
export const HEARTFALL_MAX_SIZE = 30;

// Per-fall duration — each heart's own top-to-(near)bottom pass, before
// it either lands on the pile or (early on, while the pile is still
// short) reaches screen bottom.
export const HEARTFALL_MIN_DURATION = 3.2;
export const HEARTFALL_MAX_DURATION = 5.6;

// Gentle side-to-side sway range (px) and small tilt range (deg) while
// falling — same weave shape the old CSS keyframes used, just replayed
// via plain per-frame math now so a heart's landing moment can be
// detected and handed off to the pile.
export const HEARTFALL_DRIFT_MAX = 60;
export const HEARTFALL_ROTATE_MAX = 35;

export const HEARTFALL_MIN_OPACITY = 0.55;
export const HEARTFALL_MAX_OPACITY = 0.95;

// --- Part 18 — pile accumulation ---

// The bottom of the screen is divided into this many horizontal slots;
// each tracks its own accumulated pile height so hearts can find "the
// current surface" cheaply (array lookup) instead of real collision.
export const HEARTFALL_COLUMN_COUNT = 26;

// How long the short falling -> resting transition takes once a heart
// reaches the pile surface. Short and subtle, no bounce.
export const HEARTFALL_SETTLE_DURATION = 0.32;

// Random horizontal nudge applied on landing, so hearts don't all settle
// exactly on their falling column line.
export const HEARTFALL_SETTLE_JITTER_X = 9;

// Final resting tilt range (deg) — wider than the falling sway so the
// pile itself reads as organically tumbled, not just "still falling".
export const HEARTFALL_SETTLE_ROTATE_MAX = 55;

// A heart's own footprint (px of pile-height it adds) is a fraction of
// its size, randomized within this range — natural overlap instead of
// hearts stacking edge-to-edge like bricks.
export const HEARTFALL_FOOTPRINT_MIN = 0.32;
export const HEARTFALL_FOOTPRINT_MAX = 0.55;

// A landing heart also nudges its immediate neighbor columns up by this
// fraction of its own footprint, so the pile's top edge stays uneven
// without any single column spiking into a tower.
export const HEARTFALL_NEIGHBOR_SPREAD = 0.4;

// A column's own accumulated height is capped at (viewport height minus
// this margin) — leaving a thin gap at the very top of the screen rather
// than letting a column grow past the viewport. Without a cap, a column
// keeps climbing forever (thousands of settle events keep adding to it
// even once its surface is already off-screen), which eventually pushes
// that column's landing surface so far above the heart's own spawn point
// that every newly-recycled heart lands on the very first frame after
// spawning — collapsing the fixed pool's steady one-settle-at-a-time
// rhythm into a same-frame bake/recycle storm across the whole pool,
// which is the actual source of the progressive stutter, not the pile
// size itself (see _beginSettling/_updateFalling in FinalHeartFall.js).
export const HEARTFALL_PILE_TOP_MARGIN = 24;

// Part 20 — once every column's own accumulated height reaches this
// fraction of _maxColumnHeight (see HEARTFALL_PILE_TOP_MARGIN), the
// screen is considered visually FULL and permanent accumulation stops
// for good (see FinalHeartFall.js's own ACCUMULATING/FULL state). Left
// a little under 1 (rather than exactly 1, which every column already
// can't exceed) so "full" triggers once the pile's shortest column has
// genuinely caught up with the rest, not only once every column has
// hit the hard cap to the last pixel.
export const HEARTFALL_FULL_MIN_COLUMN_FRACTION = 0.92;

// As a column's own accumulated height approaches its hard cap (see
// HEARTFALL_PILE_TOP_MARGIN above), its own landing surface climbs to
// meet its heart's own spawn point, collapsing that heart's fall-to-
// settle time toward zero — which means, in the run-up to FULL, a
// disproportionate share of the pool's total settle events end up
// landing on columns that are already at (or almost at) this same
// point, each one targeting virtually the same few pixels (the column's
// own near-frozen height ± only the small ~0.25*size settle offset).
// Measured directly: of ~1750 total settle events by the time FULL is
// reached, roughly 650 of them land in just the last couple of seconds,
// once most columns are already near-capped — if those all stacked on
// the same narrow band, that's several times denser than the rest of
// the pile's own texture, which is what read as an ugly, unnaturally
// solid "seam" stuck at the very top of the screen.
//
// Once a column crosses this fraction of _maxColumnHeight, its landings
// stop targeting its own (near-frozen) height and instead scatter
// uniformly across the whole remaining zone above this threshold (see
// FinalHeartFall.js's own _beginSettling) — sized proportionally to the
// pile's own height so it absorbs that same disproportionate volume of
// late landings at a density that actually matches the rest of the pile,
// instead of a fixed pixel band that reads as a seam regardless of how
// much volume ends up crammed into it.
export const HEARTFALL_CAP_ZONE_FRACTION = 0.55;

// ===========================
// Part 21 — the final "I love you" message, faded in once the pile
// itself reaches FULL (see FinalHeartFall.js's own _checkFull/onFull
// hook and FinalMessage.js). Kept in this file rather than
// GiftBoxConstants.js since its only trigger is FinalHeartFall's own
// state, not anything box-related.
// ===========================
export const FINAL_MESSAGE_TEXT = "I love you";
// Long and gentle rather than a snap-in — the pile has already stopped
// moving by the time this starts, so nothing else on screen is
// competing for attention.
export const FINAL_MESSAGE_FADE_DURATION = 2.4;
