import { PHOTO_1, PHOTO_2, PHOTO_3 } from "./PhotoSources";

// ===========================
// Boom — Part 8.1 (photo placeholders). Three small memory-card
// placeholders scattered around the envelope on the box's own interior
// floor — the SAME ground plane/coordinate space letter/LetterConstants.js's
// own LETTER_POSITION_* and LETTER_DECOR_ITEMS already use, just for a
// sibling object rather than anything parented under the envelope
// itself. Step 1 only: appearance + placement. No click interaction, no
// per-photo reveal — those are later parts (see PhotoPlaceholders.js's
// own header comment).
// ===========================

// ---- Card — warm ivory/cream base, same family as the envelope's own
// LETTER_COLOR but distinct enough to read as a separate object; a real
// (thin) extruded shell rather than a flat decal, matching the "real
// object with edge thickness" convention letter/LetterGeometry.js and
// giftbox/GiftBoxGeometry.js already establish.
export const PHOTO_CARD_COLOR = "#fbf3e4";
export const PHOTO_CARD_WIDTH = 0.42;
export const PHOTO_CARD_HEIGHT = 0.5;
export const PHOTO_CARD_CORNER_RADIUS = 0.035;
export const PHOTO_CARD_THICKNESS = 0.012;
export const PHOTO_CARD_ROUGHNESS = 0.88;
export const PHOTO_CARD_METALNESS = 0;

// ---- Inset "photo" swatch — a flat plane sitting a hair in front of
// the card, inset from its edges (wider bottom margin, the classic
// polaroid frame proportion). Plain flat color per card (no canvas
// texture) — deliberately the cheapest possible placeholder, easy to
// swap for a real photo texture later without touching the card itself.
export const PHOTO_INSET_SIDE_MARGIN = 0.055;
export const PHOTO_INSET_TOP_MARGIN = 0.055;
export const PHOTO_INSET_BOTTOM_MARGIN = 0.12;

// ---- Soft drop shadow — the same faked radial-gradient-plane technique
// letter/LetterGeometry.js's own buildShadowTexture() already uses, kept
// small (this is a placeholder shadow, not a hero asset) and shared as
// ONE texture/material across all three cards since none of them need
// independent shadow state yet.
export const PHOTO_SHADOW_COLOR = "#3a1f14";
export const PHOTO_SHADOW_OPACITY = 0.22;
export const PHOTO_SHADOW_SCALE = 1.3;

// ---- Entrance — fades/scales in alongside the envelope's own show()
// moment (see GiftBox.js's own _open() call site), a light stagger
// across the three so they don't pop in as one rigid unit.
export const PHOTO_ENTRANCE_DURATION = 0.65;
export const PHOTO_ENTRANCE_START_SCALE = 0.85;
export const PHOTO_ENTRANCE_EASE = "back.out(1.4)";
export const PHOTO_ENTRANCE_STAGGER = 0.12;

// ---- Placement — box-local coordinates, the same ground the envelope
// itself rests on (compare LETTER_POSITION_Y = 0.5). Kept clear of the
// envelope's own footprint (roughly x:[-0.6, 0.5], z:[-0.35, 0.45] once
// its own small extra tilts are accounted for) and inside the box's own
// interior (GIFTBOX_WIDTH/DEPTH = 2.2, so ±1.1 before hitting a wall).
// Left/right sit beside the envelope; the third sits further back
// (larger z) and a touch lower so it reads as tucked partly behind it,
// per the brief's own "slightly lower/behind" ask. Rotations are small
// and deliberately uneven so the three never read as a grid.
// ===========================
// Part 8.2 — clicking a card. Distance/scale/ease picked the same way
// letter/LetterConstants.js's own PHOTO_FOCUS_* already does for its
// polaroid decor item: a fixed pose in front of the live camera reads as
// centered and correctly sized on any aspect ratio.
// ===========================
export const PHOTO_FOCUS_DISTANCE = 1.3;
export const PHOTO_FOCUS_SCALE = 2.4;
// The one wait the user actually feels after tapping to open a photo —
// cut hard (was 0.6s) so the card reads as near-instant, while still
// keeping a real (if very brief) fly-to-camera motion rather than a
// jump-cut. power3.out's own steep early acceleration means almost all
// of the visible travel/scale-up still happens in the first ~2/3 of
// this, so it doesn't read as choppier than the longer original, just
// faster.
export const PHOTO_FOCUS_DURATION = 0.15;
export const PHOTO_FOCUS_EASE = "power3.out";
export const PHOTO_CLOSE_DURATION = 0.35;
export const PHOTO_CLOSE_EASE = "power2.inOut";

// ---- Part 8.4 — a tiny roll around the camera's own view axis on the
// focused pose (alternating sign per card index) so a held-up photo
// never reads as a perfectly dead-on flat scan — a physical print always
// has a hair of natural tilt in hand.
export const PHOTO_FOCUS_TILT_Z = 0.05;

// ---- Part 8.3 — sequential افتحي-triggered reveal (see
// PhotoPlaceholders.js's own revealSequential()). How long each card
// stays fully on screen before automatically flying back — the ONE
// place this duration is defined, mirroring LetterConstants.js's own
// LETTER_DISPLAY_HOLD_DURATION for the letter itself.
export const PHOTO_AUTO_DISPLAY_DURATION = 1.2; // retimed from 3 -> 1.8 -> 1.2 (successive retiming passes)

// ===========================
// Part 9 — final close. Each card retracts deeper into the box
// interior once the افتحي sequence is complete, well below the body's
// own rim (local y ≈ 0.48, see GiftBoxGeometry.js's own centering
// comment) rather than a token nudge, mirroring LetterConstants.js's
// own LETTER_RETRACT_* for the envelope (see PhotoPlaceholders.js's
// own retractIntoBox()) — otherwise a tilted card corner still pokes
// above the rim and shows through the closing lid.
// ===========================
export const PHOTO_RETRACT_X_FACTOR = 0.4;
export const PHOTO_RETRACT_DROP = 0.55;
export const PHOTO_RETRACT_BACK = 0.12;

// `tint` is the placeholder/fallback color underneath each photo — it
// still shows through for the brief instant before that card's own
// texture finishes loading (or if it fails to load at all), rather
// than the inset ever going blank.
export const PHOTO_CARDS = [
  // Photo 1 — slightly left.
  { tint: "#f6dfe6", src: PHOTO_1, x: -0.86, y: 0.503, z: 0.05, rotationZ: -0.26, tiltXExtra: 0.05, tiltY: -0.04 },
  // Photo 2 — slightly right.
  { tint: "#f8ecd4", src: PHOTO_2, x: 0.84, y: 0.498, z: -0.08, rotationZ: 0.22, tiltXExtra: -0.03, tiltY: 0.05 },
  // Photo 3 — lower/behind the envelope.
  { tint: "#f2d9c2", src: PHOTO_3, x: 0.05, y: 0.492, z: 0.8, rotationZ: -0.1, tiltXExtra: 0.06, tiltY: 0.02 },
];
