// ===========================
// Boom — template-wide (scene-level) constants. Bomb-character-specific
// values live in bomb/BombConstants.js instead — this file only holds
// things the top-level BoomScene.js itself owns (background, camera).
// ===========================

// A soft, barely-there pale pink panel — the reference's entire "scene"
// is this flat card, nothing else (no stars/hearts/scenery). Two close
// tones for a very subtle radial vignette (lighter center, a touch
// deeper at the edges via BoomScene's own background texture), not a
// loud gradient.
export const BOOM_BACKGROUND_CENTER_COLOR = "#fde7ef";
export const BOOM_BACKGROUND_EDGE_COLOR = "#f4c3d7";

// The reference is a fixed, non-moving flat shot — the camera just
// looks straight on at the scene, so this is a plain static position,
// not a choreographed rig like standard/cake/CakeCamera.js.
export const BOOM_CAMERA_Z = 10;

// ---- Vertical fov floor ----
// engine/camera/Camera.js holds *horizontal* fov constant across
// devices and derives vertical fov from the current aspect (see its own
// header comment) — that's tuned against a portrait mobile viewport
// (this template's actual audience), where the aspect is narrow enough
// that the derived vertical fov is usually maxed out (very wide/zoomed
// out vertically). On a wide-but-short viewport (a laptop) the same
// formula lands on a much narrower vertical fov instead — at the same
// fixed camera distance that alone makes the exact same gift box/button
// fill far more of the (shorter) frame, reading as oversized even
// though nothing about the scene itself changed.
//
// Raising a floor under the vertical fov (never lowering it, only
// preventing it going below this on wide screens) fixes that without
// moving the camera or touching the shared aspect-fov system at all —
// mobile is already above this floor so it's completely unaffected;
// only wide/short viewports (laptop, desktop) get pulled back up to a
// comparable vertical framing.
export const BOOM_MIN_VERTICAL_FOV = 70;
