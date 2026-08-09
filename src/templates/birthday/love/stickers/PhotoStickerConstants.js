import { MESSAGE_START_DELAY, PLATFORM_RADIUS, PLATFORM_RING_WIDTH, PLATFORM_Y } from "../Constants";

// ===========================
// Photo sticker orbit — tuning values only. RADIUS/Y are DERIVED from
// the existing orbit ring's own constants (see OrbitSystem.js), not
// independent numbers, so the stickers always travel the ring's actual
// path even if the ring's own size is ever retuned.
// ===========================

export const PHOTO_STICKER_MIN_COUNT = 3;
export const PHOTO_STICKER_DEFAULT_COUNT = 6;
export const PHOTO_STICKER_MAX_COUNT = 8;

// The middle of the ring's own band (between its inner and outer
// radius) — not an unrelated hand-picked distance.
export const PHOTO_STICKER_RADIUS = PLATFORM_RADIUS + PLATFORM_RING_WIDTH / 2;

// A small lift above the ring's own plane, so a sticker reads as
// floating just above it rather than sitting flush in its texture.
export const PHOTO_STICKER_VERTICAL_OFFSET = 0.55;
export const PHOTO_STICKER_Y = PLATFORM_Y + PHOTO_STICKER_VERTICAL_OFFSET;

// World-space size of one sticker (its wrapper's uniform scale once
// fully entered). The heart stands roughly 4 units tall (see
// Constants.js's HEART_SCALE comment) — this keeps a sticker clearly
// secondary next to it, never competing for attention.
export const PHOTO_STICKER_SIZE = 1.15;

// Radians/second. Deliberately independent of the ring's own
// PLATFORM_ROTATION_SPEED — that spin is a near-imperceptible texture
// detail, while the stickers need to read as continuously, visibly
// orbiting within a normal viewing window.
export const PHOTO_STICKER_ORBIT_SPEED = 0.055;

// Where the first sticker starts — purely for a pleasing default
// composition (so a sticker isn't sitting dead-center behind the heart
// from the establishing camera angle), not physically meaningful.
export const PHOTO_STICKER_START_ANGLE = Math.PI / 2;

// A small independent vertical bob layered on top of the orbit path —
// "slightly three-dimensional and floating" rather than gliding on
// rails. Each sticker gets its own fixed random phase (assigned once,
// see PhotoStickerOrbit) so they don't bob in lockstep.
export const PHOTO_STICKER_BOB_AMOUNT = 0.05;
export const PHOTO_STICKER_BOB_SPEED = 0.5;

// Individual tilt — a small, FIXED, one-time roll per sticker (radians),
// assigned once at creation and never re-randomized per frame.
export const PHOTO_STICKER_TILT_RANGE = [-0.09, 0.09]; // ~= +/-5 degrees

export const PHOTO_STICKER_GLOW_COLOR = "#ffb6c9";
export const PHOTO_STICKER_GLOW_OPACITY = 0.35;
export const PHOTO_STICKER_GLOW_SCALE = 1.55; // relative to the sticker's own size

// How long after the Love Messages sequence actually STARTS (not
// finishes) the first sticker begins its own entrance — tuned so the
// two systems visibly overlap: messages are already falling by the time
// the first photo appears, rather than one waiting for the other.
export const PHOTO_STICKER_START_DELAY = 2.5;

// Derived, not independent: anchored to LoveMessages' own start gate
// (MESSAGE_START_DELAY) rather than a flat number measured from
// beginExperience() — LoveMessages.sceneTime and PhotoStickerOrbit.time
// both start counting from that same moment, so this stays correct
// automatically if MESSAGE_START_DELAY is ever retuned.
export const PHOTO_STICKER_ENTRANCE_DELAY = MESSAGE_START_DELAY + PHOTO_STICKER_START_DELAY;

export const PHOTO_STICKER_ENTRANCE_STAGGER = 0.18;
export const PHOTO_STICKER_FADE_IN_DURATION = 1.1;

// Depth-aware fading — the heart must stay the dominant focal point, so
// a sticker passing behind it recedes rather than visually competing
// with its silhouette. 1 directly in front (same side as the camera),
// fading smoothly down to PHOTO_STICKER_BEHIND_OPACITY directly behind.
export const PHOTO_STICKER_FRONT_OPACITY = 1;
export const PHOTO_STICKER_BEHIND_OPACITY = 0.125; // middle of the requested 0.1-0.15 range

// Once the envelope's letter becomes the scene's focus (see
// envelope/Envelope.js's "letter:focus" trigger, subscribed to in
// PhotoStickerOrbit's own constructor), the stickers ease back rather
// than continuing to compete for attention — a soft dim and a gentler
// orbit, never a full stop or hide (point 9 is explicit: don't freeze
// or hide the scene).
export const PHOTO_STICKER_FOCUS_DIM_OPACITY = 0.6;
export const PHOTO_STICKER_FOCUS_ORBIT_SPEED_MULTIPLIER = 0.55;
export const PHOTO_STICKER_FOCUS_TRANSITION_DURATION = 1.6;

// Polaroid canvas layout — device-independent px, baked into the
// texture once per photo (see PhotoStickerTexture.js).
export const PHOTO_STICKER_CANVAS_WIDTH = 280;
export const PHOTO_STICKER_CANVAS_HEIGHT = 320;
export const PHOTO_STICKER_FRAME_MARGIN = 16;
export const PHOTO_STICKER_FRAME_COLOR = "#fff9fb";
export const PHOTO_STICKER_FRAME_BORDER_COLOR = "#ffd6e4";
export const PHOTO_STICKER_HEART_COLOR = "#ff6f91";
export const PHOTO_STICKER_HEART_SIZE = 22;

// ---- Click-to-focus — a DIFFERENT dim than PHOTO_STICKER_FOCUS_*
// above (that one is the one-time, permanent-for-the-rest-of-the-scene
// dim when the letter takes over; this one is the reversible dim
// applied to every OTHER sticker while a single sticker is open in
// StickerFocusView, and undone again on close).
export const PHOTO_STICKER_OTHERS_DIM_OPACITY = 0.3;
export const PHOTO_STICKER_OTHERS_DIM_DURATION = 0.4;

// ---- StickerFocusView's own DOM overlay — see StickerFocusView.js/.css.
export const STICKER_FOCUS_OPEN_DURATION = 0.6;
export const STICKER_FOCUS_CLOSE_DURATION = 0.5;
export const STICKER_FOCUS_START_SCALE = 0.22; // the "still a tiny sticker" starting size
export const STICKER_FOCUS_BACKDROP_DURATION = 0.5;
export const STICKER_FOCUS_BACKDROP_OPACITY = 0.62;
