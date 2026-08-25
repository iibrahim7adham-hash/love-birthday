// ===========================
// Boom — Part 5 (the gift box reveal). Appears once the romantic
// "hhheeeyyy"/"I love you" reveal has had time to be read, becoming
// the scene's own new focal point. Covers both the CLOSED box's own
// appearance/entrance AND the click-to-open interaction (see
// GiftBox.js) — moving the camera and revealing anything inside are
// still later parts.
// ===========================

// Relative to HeartBurst's own ignite() moment, the same anchoring
// convention every other Boom part's own constants already use (see
// e.g. reveal/RevealConstants.js's own REVEAL_FADE_START_AT). Reveal
// itself has no fade-OUT of its own yet — out of scope for this part —
// so this is simply "long enough after ignite for the text to have
// been read" (reveal's own text is fully visible by ignite+1.1s; this
// leaves it up a further ~3.4s), not synced to an actual fade event.
export const GIFTBOX_START_AT = 4.5;

// ---- Palette — chocolate-brown gift box: body and lid are two
// distinct (but related) browns, ribbon and bow share one darker brown.
export const GIFTBOX_BODY_COLOR = "#6B3E32";
export const GIFTBOX_LID_COLOR = "#7D493A";
export const GIFTBOX_RIBBON_COLOR = "#C1123F";
// Darker brown for the inner bottom/walls (Part 5A) — the cavity
// revealed once the lid opens, distinct from the exterior body color.
export const GIFTBOX_INTERIOR_COLOR = "#331A14";

// ---- Body + lid proportions (world units) — a squarish box, not a
// tall/narrow one, per the brief's own "rectangular/square" ask.
export const GIFTBOX_WIDTH = 2.2;
export const GIFTBOX_DEPTH = 2.2;
export const GIFTBOX_BODY_HEIGHT = 1.3;
// A touch chunkier than the original 0.34 — the "premium gift box"
// lid-redesign brief's own "give the lid more thickness" ask. Overall
// box footprint (width/depth) and body height are untouched; only the
// lid itself reads as a heavier slab now.
export const GIFTBOX_LID_HEIGHT = 0.4;
// The lid overhangs the body slightly on every side, like a real box
// lid sitting over the body rather than flush with it.
export const GIFTBOX_LID_OVERHANG = 0.12;
// Wall thickness (Part 5A) — the body is now a real open-top shell
// (bottom + 4 walls) instead of a solid block, so it has visible
// interior depth once the lid opens.
export const GIFTBOX_WALL_THICKNESS = 0.14;

// ---- Lid redesign — the lid is built as TWO stacked slabs (see
// GiftBoxGeometry.js's own buildGiftBox()): a full-footprint BASE
// topped by a smaller INSET cap. That seam reads as a real recessed
// rim/bevel catching the scene's own lights, instead of one flat block
// with sharp corners — a cheap, low-poly-friendly stand-in for an
// actual beveled edge. The ratio/inset below split GIFTBOX_LID_HEIGHT
// between the two slabs; total height is unchanged either way.
export const GIFTBOX_LID_CAP_HEIGHT_RATIO = 0.42;
export const GIFTBOX_LID_CAP_INSET = 0.09;
// The cap's own TOP face only (not its sides) uses this lighter tint —
// a per-face material on the cap's BoxGeometry — so the lid reads as
// "premium wrapping paper" (lit top vs. shaded vertical sides) without
// an actual texture map.
export const GIFTBOX_LID_TOP_COLOR = "#9E776B";
// Both lid slabs (base + cap) are built as RoundedBoxGeometry, not a
// sharp-cornered BoxGeometry, so the lid reads as a real molded lid
// with soft edges/corners catching the light — the "top/lid redesign"
// brief's own "slightly rounded/beveled edges" ask. RoundedBoxGeometry
// clamps the radius to half the shortest side on its own, so this same
// value is safe to reuse on both the (taller) base and the (shorter) cap.
export const GIFTBOX_LID_BEVEL_RADIUS = 0.045;
export const GIFTBOX_LID_BEVEL_SEGMENTS = 2;

// ---- Ribbon — TWO perpendicular wraps (front/back AND left/right),
// each split into body+lid segments the same way, crossing on the
// lid's own top as a real "+" gift-wrap pattern — see
// GiftBoxGeometry.js's own buildGiftBox() ribbon section.
export const GIFTBOX_RIBBON_WIDTH = 0.4;
export const GIFTBOX_RIBBON_THICKNESS = 0.035;
// How far above the first (front/back) top strip the second
// (left/right) one sits — just enough to visibly lie "over" it at the
// crossing, like one physical ribbon laid across another, without
// z-fighting.
export const GIFTBOX_RIBBON_CROSS_LIFT = GIFTBOX_RIBBON_THICKNESS * 0.85;
// The lid-top crossing strips only (ribbonTop/ribbonTopCross) — a
// lighter tint of GIFTBOX_RIBBON_COLOR (a restrained step up, not a
// hue shift) so the top-facing ribbon reads as lit fabric against the
// darker vertical ribbon on the lid's own sides, a per-surface
// highlight instead of extra geometry. Deliberately close to the base
// ribbon color — under the scene's own warm point light a bigger jump
// reads as orange/salmon instead of "the same fabric, lit".
export const GIFTBOX_RIBBON_TOP_COLOR = "#D42A56";

// ---- Bow — two teardrop/petal "loops" (a Lathe-revolved profile:
// pointed at the base, rounded at the tip — the same silhouette a
// simple 🎀 icon's own loops use) flanking a small knot, plus two short
// tapered tails. A petal shape reads as a folded ribbon loop at any
// angle; a flattened torus (tried first) still reads as a tube/pipe
// once viewed close to face-on, since its ring silhouette never
// actually closes to a point.
export const GIFTBOX_BOW_KNOT_SIZE = 0.15;
export const GIFTBOX_BOW_LOOP_LENGTH = 0.36;
export const GIFTBOX_BOW_LOOP_MAX_RADIUS = 0.11;
// Flattens the revolved (circular-cross-section) petal into a ribbon-
// thin one.
export const GIFTBOX_BOW_LOOP_FLATTEN = 0.26;
// Diagonal lean of each loop away from vertical — the two loops fan
// out from the knot rather than standing straight up side by side.
export const GIFTBOX_BOW_LOOP_TILT = Math.PI / 5.5;
export const GIFTBOX_BOW_LOOP_OFFSET_X = 0.05;
// How much the two loops differ from each other in size/tilt/twist —
// a real tied bow is never perfectly mirror-symmetric.
export const GIFTBOX_BOW_ASYMMETRY = 0.14;
export const GIFTBOX_BOW_TAIL_LENGTH = 0.3;
export const GIFTBOX_BOW_TAIL_WIDTH = 0.075;
// How far apart the two tails spread from center — a multiple of
// GIFTBOX_BOW_TAIL_WIDTH so they hang close together just under the
// knot rather than splaying out to the loops' own outer edges.
export const GIFTBOX_BOW_TAIL_SPREAD = 0.8;
// The tail's OTHER end (its cut tip, away from the knot) — narrower
// than GIFTBOX_BOW_TAIL_WIDTH so each tail actually tapers instead of
// reading as a flat rectangular strip.
export const GIFTBOX_BOW_TAIL_TIP_WIDTH = 0.02;

// ---- Material response under the scene's own existing lights (see
// engine/lights/Lights.js) — soft/matte, not shiny/metallic, reading
// as paper/fabric rather than plastic or metal.
export const GIFTBOX_ROUGHNESS = 0.65;
export const GIFTBOX_METALNESS = 0.05;
// Interior surfaces sit slightly rougher/flatter than the exterior —
// no direct light reaches deep into the cavity, so a soft matte read
// (no metalness) works best there.
export const GIFTBOX_INTERIOR_ROUGHNESS = 0.8;

// ---- Entrance — the CLOSED box fading/scaling in, nothing more (no
// idle motion, no opening) — a subtle arrival, not a pop.
export const GIFTBOX_ENTRANCE_DURATION = 0.9;
export const GIFTBOX_ENTRANCE_START_SCALE = 0.92;
export const GIFTBOX_ENTRANCE_EASE = "power2.out";

// ---- Entrance — "pull the curtain down" interaction (replaces the
// scale/opacity tween above as the actual on-screen effect; the box
// itself, geometry, camera and everything else stay untouched). A
// small cord+handle DOM overlay appears at GIFTBOX_START_AT instead of
// the box itself; the box sits fully hidden above the frustum until the
// user drags the handle down, at which point the box's own group.y
// follows the drag 1:1 (see GiftBox.js's own _onPullMove()).
export const GIFTBOX_PULL_HANDLE_LABEL = "اسحب";
// World-space margin added on top of the camera's own live visible-half-
// height (same "read the camera live" technique reveal/Reveal.js's own
// _syncHeartScale() already uses) so the hidden box clears the top edge
// of the frustum on every viewport, not just the current one.
export const GIFTBOX_PULL_HIDDEN_MARGIN = 0.6;
// How many screen pixels of downward drag equal a FULLY revealed box —
// capped so short/wide viewports don't demand an unreasonably long drag.
export const GIFTBOX_PULL_MAX_DRAG_PX = 260;
// Below this many pixels of drag, a release is treated as an accidental
// tap/nudge — the box snaps back up rather than completing the reveal.
export const GIFTBOX_PULL_MIN_DRAG_PX = 48;
// The box's own automatic finish once the drag clears the threshold
// above — a short, slightly elastic settle (small overshoot/bounce),
// never a hard stop.
export const GIFTBOX_PULL_RELEASE_DURATION = 0.7;
export const GIFTBOX_PULL_RELEASE_EASE = "elastic.out(1, 0.65)";
// The snap-back when a drag DOESN'T clear the threshold — a plain
// retract, no bounce needed since nothing "landed".
export const GIFTBOX_PULL_CANCEL_DURATION = 0.4;
export const GIFTBOX_PULL_CANCEL_EASE = "power2.out";
// How the handle/cord themselves disappear once the reveal completes.
export const GIFTBOX_PULL_HANDLE_RETRACT_DURATION = 0.45;

// ---- The "open" button's own copy.
export const GIFTBOX_BUTTON_LABEL = "افتحي 🎁";

// ---- Opening interaction — a small upward lift, then a smooth
// backward rotation around the lid's own rear hinge (see
// GiftBoxGeometry.js's own lidHinge). The two durations sum to ~1.3s,
// inside the brief's own "approximately 1.2–1.5 seconds" ask.
export const GIFTBOX_LIFT_HEIGHT = 0.18;
export const GIFTBOX_LIFT_DURATION = 0.35;
export const GIFTBOX_ROTATE_DURATION = 0.95;
// Negative: with the hinge at the lid's own rear-bottom edge and the
// lid extending forward (+Z, toward camera) from there, a NEGATIVE
// rotation.x swings that forward edge up and back over the hinge — the
// sign a plain rotation-matrix check confirms (rather than guessing),
// not an arbitrary choice. A little past -90° (rather than stopping
// exactly there) so the open lid visibly leans back at rest instead of
// standing perfectly vertical.
export const GIFTBOX_ROTATE_OPEN_ANGLE = -Math.PI * (108 / 180);
export const GIFTBOX_OPEN_EASE = "power2.inOut";

// ---- The opening's own warm interior glow (a light, not a visible
// object — see GiftBoxGeometry.js's own glowLight) — same warm tone as
// the engine's own shared warmLight (see engine/lights/Lights.js), so
// it reads as "belonging" to this scene's existing lighting rather
// than a new invented color. Starts at 0 intensity; GiftBox.js only
// ever ramps it up once the ROTATE phase begins, per the brief's own
// "begin only after the lid starts opening". Kept deliberately low/
// short-range — "soft and restrained", not a spotlight.
export const GIFTBOX_GLOW_COLOR = "#ffb347";
export const GIFTBOX_GLOW_INTENSITY = 0.55;
export const GIFTBOX_GLOW_DISTANCE = 2.6;
export const GIFTBOX_GLOW_DECAY = 2;
export const GIFTBOX_GLOW_FADE_DURATION = 0.9;

// ---- Part 3 — the camera move that plays alongside the box opening
// (see GiftBox.js's own _open()). Starts a beat after the lid begins
// lifting, then rises well ABOVE the box's own top (body 1.3 + lid
// 0.34 ≈ 1.64 world units tall) while pushing in slightly from the
// scene's own static BOOM_CAMERA_Z (see ../Constants.js), ending on a
// downward-tilted ~40° elevated view straight into the open interior
// — a deliberate rise-and-look-down move, not a simple push-in.
export const GIFTBOX_CAMERA_MOVE_DELAY = 0.15;
export const GIFTBOX_CAMERA_MOVE_DURATION = 1.8;
export const GIFTBOX_CAMERA_MOVE_EASE = "power2.inOut";
export const GIFTBOX_CAMERA_ELEVATED_Y = 4.5;
export const GIFTBOX_CAMERA_ELEVATED_Z = 5.2;
// Where the camera looks throughout the move — down near the box's
// own interior floor (below the lift height) so the final gaze reads
// as looking DOWN into the open box, not just up at its rim. With the
// elevated Y/Z above, this yields ~40° of downward tilt off horizontal.
export const GIFTBOX_CAMERA_LOOKAT_Y = 0.15;

// ---- Part 4 — the world-space X/Y region GiftBox.js hands to
// HeartField's own hideInteriorRegion() the moment the camera rise
// starts, so any heart/dot/yellow particle drifting through it fades
// out (see HeartField.js's own _maybeFadeInteriorParticles()). The
// box+lid unit sits centered on (0, 0) (see GiftBoxGeometry.js's own
// centerShift), so a symmetric half-width/half-height around the
// origin covers it; a small margin beyond the box's own actual
// width/height so hearts right at the rim fade too, not just ones
// dead-center inside.
export const GIFTBOX_INTERIOR_FADE_HALF_WIDTH = GIFTBOX_WIDTH / 2 + 0.3;
export const GIFTBOX_INTERIOR_FADE_HALF_HEIGHT =
  (GIFTBOX_BODY_HEIGHT + GIFTBOX_LID_HEIGHT) / 2 + 0.3;

// ===========================
// Part 9 — the final closing sequence, triggered once the افتحي
// sequence is complete (see letter/Letter.js's own onSequenceComplete
// call site): the envelope + photo cards retract into the box interior,
// a short pause, then the lid closes (reusing GIFTBOX_LIFT_HEIGHT/
// GIFTBOX_LIFT_DURATION/GIFTBOX_ROTATE_DURATION/GIFTBOX_OPEN_EASE above
// in reverse — same hinge/lift, no new geometry), and finally the camera
// eases back to the scene's own original resting position.
// ===========================
export const GIFTBOX_CLOSE_RETRACT_DURATION = 0.8;
export const GIFTBOX_CLOSE_PAUSE_DURATION = 0.35;
export const GIFTBOX_CLOSE_GLOW_FADE_DURATION = 0.6;
export const GIFTBOX_CLOSE_CAMERA_DELAY = 0.2;

// ===========================
// Part 10 — final message. Once the box is fully closed and the camera
// has settled back into its resting shot (the last step _beginClose()
// above already ends on), the now-empty box itself fades away and the
// experience's own closing question screen takes its place — see
// GiftBox.js's own _beginClose() (continued) and _buildFinalQuestion().
// ===========================
export const GIFTBOX_QUESTION_TEXT = "وهسه رضيتي؟؟";
export const GIFTBOX_QUESTION_EMOJI = "🩷";
export const GIFTBOX_QUESTION_YES_LABEL = "اي رضيت";
export const GIFTBOX_QUESTION_NO_LABEL = "لاااا";
export const GIFTBOX_QUESTION_HINT_TEXT = "(حاولي تختارين الصح)";
export const GIFTBOX_FINAL_FADE_DELAY = 0.4;
export const GIFTBOX_FINAL_FADE_DURATION = 1.1;
export const GIFTBOX_QUESTION_ENTRANCE_DURATION = 0.7;

// ===========================
// Part 15 — dismissing the question UI once "اي رضيت" is pressed,
// right before FinalHeartFall's own celebration takes over (see
// GiftBox.js's own _answerYes() and FinalHeartFall.js). Short — a
// clean exit, not a lingering one.
// ===========================
export const GIFTBOX_QUESTION_EXIT_DURATION = 0.45;
