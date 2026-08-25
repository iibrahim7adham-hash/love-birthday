// ===========================
// Boom — Part 5/6 (the envelope inside the open gift box). Appears once
// GiftBox's own camera rise has settled and the box interior has
// finished fading empty (see GiftBox.js's own _open() call site). Only
// the envelope's physical appearance, its decorative surroundings, and
// its click-to-open detection belong here — the actual opening
// animation and message text are later parts.
// ===========================

// Buffer added on top of GiftBoxConstants' own
// GIFTBOX_CAMERA_MOVE_DELAY + GIFTBOX_CAMERA_MOVE_DURATION so the
// envelope only appears once the camera has actually settled into its
// elevated view, not the instant the tween finishes.
export const LETTER_SHOW_DELAY = 0.3;

// ---- Part 7 — the dedicated wax-seal DOM button sitting outside the
// box (see Letter.js's own _buildSealButton()) that triggers the same
// open sequence the envelope's own click-to-open already plays. Text
// only, no emoji — a deliberately plainer affordance than GiftBox's own
// button.
export const LETTER_SEAL_BUTTON_LABEL = "افتحي";

// ---- Part 13 — the SAME single DOM button (#boom-letter-seal-button,
// never duplicated) relabels itself as the افتحي sequence advances
// through envelope -> photo1 -> photo2 -> photo3, keyed by Letter.js's
// own `_sequenceState` (see its own _updateSealButtonLabel()). Only the
// text node changes — position/size/color/animation all stay exactly
// the CSS already defines.
export const LETTER_SEAL_LABELS = {
  letter: LETTER_SEAL_BUTTON_LABEL,
  photo1: "افتحي مرة ثانية",
  photo2: "افتحي أنوب",
  photo3: "آخر مرة",
};

// ---- Envelope body — warm ivory/cream, matte (reads as real paper
// under the scene's existing lights, same MeshStandardMaterial approach
// giftbox/GiftBoxGeometry.js already uses for the box itself). Built as
// a real extruded shell (see LetterGeometry.js's own buildLetter()) so
// it has actual edge thickness, not just a flat card.
export const LETTER_COLOR = "#fbf3e1";
export const LETTER_WIDTH = 1.05;
export const LETTER_HEIGHT = 0.74;
export const LETTER_CORNER_RADIUS = 0.06;
export const LETTER_THICKNESS = 0.02;
export const LETTER_ROUGHNESS = 0.92;
export const LETTER_METALNESS = 0;

// Resting position — the box's own solid body top face (the visual
// "floor" once the lid swings open, see GiftBoxGeometry.js's own
// centering comment) sits at local y ≈ 0.48; a touch above that avoids
// z-fighting. Slightly off-center so the decorative props below have
// room to frame it rather than sit on top of it.
export const LETTER_POSITION_X = -0.05;
export const LETTER_POSITION_Y = 0.5;
export const LETTER_POSITION_Z = 0.05;

// Lying flat on that floor means rotating the envelope's own XY-plane
// geometry -90° around X (so its face points up, +Y); these are the
// SMALL extra tilts on top of that so it reads as "slightly tilted,
// not perfectly flat" rather than a perfectly rectangular grid-aligned
// card.
export const LETTER_TILT_X_EXTRA = 0.06;
export const LETTER_TILT_Z = -0.12;
export const LETTER_TILT_Y = 0.08;

// ---- Folded flap — a slightly darker cream than the body so the fold
// line reads even under flat lighting, sitting just above the body's
// own front face (see LETTER_THICKNESS) and inset a touch narrower so
// the body's own rounded top corners still peek out from underneath.
export const LETTER_FLAP_COLOR = "#f2e4c8";
export const LETTER_FLAP_INSET = 0.045;
export const LETTER_FLAP_DEPTH_RATIO = 0.56;
export const LETTER_FLAP_THICKNESS = 0.01;
export const LETTER_FLAP_ROUGHNESS = 0.9;

// ---- Wax seal — deep burgundy, sitting where the flap's own tip meets
// the body, small 3D depth (a short cylinder, not a flat decal) plus a
// soft offset highlight and a small heart baked into its own top-face
// texture (see LetterGeometry.js's own buildWaxSealTexture()).
export const LETTER_SEAL_COLOR = "#6d1a2c";
export const LETTER_SEAL_RADIUS = 0.1;
export const LETTER_SEAL_HEIGHT = 0.026;
export const LETTER_SEAL_ROUGHNESS = 0.4;
export const LETTER_SEAL_METALNESS = 0.08;
export const LETTER_SEAL_OFFSET_Y = -0.015;

// ---- Soft drop shadow — a dark radial-gradient plane just beneath the
// envelope (no shadow-mapped lights anywhere in this scene, see
// engine/lights/Lights.js, so this is the same faked-shadow technique
// as the reference's other soft depth cues).
export const LETTER_SHADOW_COLOR = "#3a1f14";
export const LETTER_SHADOW_OPACITY = 0.28;
export const LETTER_SHADOW_SCALE = 1.35;
export const LETTER_SHADOW_OFFSET_Y = -0.01;

// ---- Entrance — fades/scales in once show() is called, matching the
// restrained "subtle arrival" GiftBoxConstants' own GIFTBOX_ENTRANCE_*
// establishes for the box itself.
export const LETTER_ENTRANCE_DURATION = 0.9;
export const LETTER_ENTRANCE_START_SCALE = 0.82;
export const LETTER_ENTRANCE_EASE = "back.out(1.5)";

// ---- Idle motion — a very slow bob + gentle rotational sway, just
// enough that the envelope visibly reads as interactive/alive without
// looking jittery.
export const LETTER_IDLE_BOB_AMOUNT = 0.014;
export const LETTER_IDLE_BOB_SPEED = 1.1;
export const LETTER_IDLE_SWAY_AMOUNT = 0.02;
export const LETTER_IDLE_SWAY_SPEED = 0.8;

// ---- Idle glow — a slow emissive pulse on the envelope body itself (no
// extra light added), same warm tone as the box's own opening glow
// (GiftBoxConstants' own GIFTBOX_GLOW_COLOR) so it reads as belonging
// to this same scene.
export const LETTER_GLOW_COLOR = "#ffcf7a";
export const LETTER_GLOW_MIN = 0.03;
export const LETTER_GLOW_MAX = 0.22;
export const LETTER_GLOW_DURATION = 1.9;

// ---- Hover/touch feedback — a very subtle scale bump, smoothed every
// frame (not tweened) so rapid pointer movement never queues up
// competing tweens.
export const LETTER_HOVER_SCALE = 1.05;
export const LETTER_HOVER_LERP = 0.15;

// ---- Decorative keepsakes scattered around the envelope — minimal,
// framing rather than covering it, mostly sitting behind/beside so the
// envelope itself stays the clear hero. Positions are local offsets
// from the box's own center (same ground plane as the envelope, y set
// per-type below), kept inside the box's own interior footprint (see
// GiftBoxConstants' own GIFTBOX_INTERIOR_FADE_HALF_WIDTH/HEIGHT) and
// clear of the envelope's own bounds.
export const LETTER_DECOR_ITEMS = [
  {
    type: "heart",
    x: -0.74,
    z: -0.4,
    scale: 0.15,
    rotation: 0.3,
    color: "#e8607a",
  },
  {
    type: "heart",
    x: 0.7,
    z: 0.48,
    scale: 0.12,
    rotation: -0.4,
    color: "#f2879c",
  },
  {
    type: "heart",
    x: -0.18,
    z: 0.66,
    scale: 0.1,
    rotation: 0.5,
    color: "#f5a0b3",
  },
  {
    type: "polaroid",
    x: 0.64,
    z: -0.5,
    scale: 0.32,
    rotation: 0.22,
    tint: "#f6d9b8",
  },
  {
    type: "polaroid",
    x: -0.6,
    z: 0.44,
    scale: 0.3,
    rotation: -0.18,
    tint: "#e8c7d8",
  },
  {
    type: "note",
    x: 0.66,
    z: 0.16,
    scale: 0.28,
    rotation: -0.08,
    tint: "#fffdf6",
  },
  {
    type: "flower",
    x: -0.32,
    z: -0.62,
    scale: 0.22,
    rotation: 0.1,
    color: "#f4a7c0",
  },
  {
    type: "tape",
    x: 0.7,
    z: -0.4,
    scale: 0.22,
    rotation: 0.75,
    color: "#e9d9c5",
  },
];

// ===========================
// Part 7 — the envelope becoming interactive: a small glowing cue,
// camera focus, the seal's own reaction, the flap opening around its
// own fold-line hinge, and the cream message card rising out from
// inside. Everything below only ever plays once (Letter.js's own
// _openRequested gate already prevents a second trigger).
// ===========================

// ---- A small soft glow sitting just beside the seal, pulsing gently
// from the moment the envelope appears — the "this can be opened" cue,
// deliberately a tiny sprite rather than a UI button (see the brief's
// own "not a large UI button"). Fades out the instant the envelope is
// actually opened.
export const LETTER_CUE_COLOR = "#ffd9a0";
export const LETTER_CUE_SCALE = 0.16;
export const LETTER_CUE_OFFSET_X = 0.17;
export const LETTER_CUE_OFFSET_Y = 0.1;
export const LETTER_CUE_PULSE_MIN = 0.35;
export const LETTER_CUE_PULSE_MAX = 0.95;
export const LETTER_CUE_PULSE_DURATION = 1.3;

// ---- Camera focus — nudges the camera a small fraction of the way
// toward the envelope's own world position rather than a hard cut, so
// it reads as "gently focuses closer" per the brief.
export const LETTER_CAMERA_FOCUS_AMOUNT = 0.16;
export const LETTER_CAMERA_FOCUS_DURATION = 0.7;
export const LETTER_CAMERA_FOCUS_EASE = "power2.out";

// ---- Wax seal's own reaction — a quick pop, then it fades away as the
// flap lifts out from underneath it (no separate "crack" geometry).
export const LETTER_SEAL_REACT_SCALE = 1.22;
export const LETTER_SEAL_REACT_DURATION = 0.22;
export const LETTER_SEAL_FADE_DURATION = 0.35;

// ---- Flap opening — a real hinge rotation around the fold line (the
// flap's own top edge, see LetterGeometry.js's own flapHinge), not a
// flat swap. Positive angle swings the flap's tip up and back, away
// from the seal/camera, the same "hinge at the fold" reading a real
// envelope has.
export const LETTER_FLAP_OPEN_ANGLE = Math.PI * (152 / 180);
export const LETTER_FLAP_OPEN_DURATION = 0.85;
export const LETTER_FLAP_OPEN_DELAY = 0.15;
export const LETTER_FLAP_OPEN_EASE = "power2.inOut";

// ---- The message card — soft blush/rose paper (a lighter center
// fading to a slightly darker rose edge, painted directly into its own
// canvas texture, see LetterGeometry.js's own buildMessageCardTexture())
// with a subtle gold decorative border, distinct from the envelope's own
// warm ivory so it reads as a separate, more intimate keepsake.
export const MESSAGE_CARD_COLOR = "#fdeef2";
export const MESSAGE_CARD_CENTER_COLOR = "#fffaf9";
export const MESSAGE_CARD_EDGE_COLOR = "#e9aec2";
export const MESSAGE_CARD_GOLD_ACCENT = "#cda15c";
export const MESSAGE_CARD_WIDTH = LETTER_WIDTH * 0.82;
export const MESSAGE_CARD_HEIGHT = LETTER_HEIGHT * 0.82;
export const MESSAGE_CARD_CORNER_RADIUS = 0.045;

// ---- Part 8 — the card's own rise out of the open envelope happens in
// two stages: first a small local lift/scale-in still tucked inside the
// envelope's own tilted local frame (reads as "coming out of the
// envelope"), then it leaves that local frame entirely — reparented to
// the scene root with its world transform preserved — and flies to a
// fixed pose directly in front of the LIVE camera (see Letter.js's own
// _beginCardFaceTransition()), so the final reading is always centered
// and facing the viewer regardless of the envelope's own resting tilt
// or the viewport's own aspect ratio.
export const MESSAGE_CARD_START_Z = 0.01;
export const MESSAGE_CARD_START_SCALE = 0.55;
export const MESSAGE_CARD_RISE_DELAY = 0.55;
export const MESSAGE_CARD_LOCAL_RISE_Z = 0.16;
export const MESSAGE_CARD_LOCAL_RISE_DURATION = 0.55;
export const MESSAGE_CARD_LOCAL_RISE_EASE = "power2.out";

// Distance is chosen against the shared Camera's own held-constant
// horizontal fov (see engine/camera/Camera.js's own comment) so the
// card's on-screen width lands at roughly the same comfortable fraction
// of the viewport on every aspect ratio, not just the desktop baseline.
export const MESSAGE_CARD_FOCUS_DISTANCE = 1.4;
export const MESSAGE_CARD_FOCUS_SCALE = 1.08;
export const MESSAGE_CARD_FOCUS_DURATION = 1.1;
export const MESSAGE_CARD_FOCUS_EASE = "power3.inOut";

export const MESSAGE_CARD_SETTLED_BOB_AMOUNT = 0.012;
export const MESSAGE_CARD_SETTLED_BOB_SPEED = 0.8;

// ---- Part 7B — once the card has been settled and readable for a
// while, it auto-returns into the envelope (text fades, card flies back
// and shrinks into the envelope, flap closes) and the DOM wax seal
// (LETTER_SEAL_BUTTON_LABEL) fades back in over it. Durations reuse the
// matching opening-stage constants above/below for a symmetric reverse,
// this is the only genuinely new one — how long the card stays fully
// on-screen before that reverse begins.
export const LETTER_DISPLAY_HOLD_DURATION = 4;

// ---- Placeholder message copy, drawn as a canvas texture on its own
// small plane (real 3D object in-scene, not an HTML overlay) — elegant
// serif heading, clean readable body (word-wrapped, see
// LetterGeometry.js's own buildMessageTextTexture()), and a signature
// line, in dark rose/burgundy rather than plain black. Fades in with a
// slight upward drift only once the card has fully settled facing camera.
export const MESSAGE_HEADING_TEXT = "My Dearest,";
export const MESSAGE_BODY_TEXT =
  "اني اعتذر  منج لان زعلتج هوايه وحبيت اسويلج هل شي البسيط افرحج بي 🤍🤍";
export const MESSAGE_SIGNATURE_TEXT = "With all my love.";
export const MESSAGE_TEXT_COLOR = "#7a1f3d";
export const MESSAGE_HEADING_FONT =
  "italic 46px Georgia, 'Times New Roman', serif";
export const MESSAGE_BODY_FONT = "28px Georgia, 'Times New Roman', serif";
export const MESSAGE_SIGNATURE_FONT =
  "italic 30px Georgia, 'Times New Roman', serif";
export const MESSAGE_TEXT_FADE_DELAY = 0.35;
export const MESSAGE_TEXT_FADE_DURATION = 0.8;
export const MESSAGE_TEXT_RISE_DISTANCE = 0.05;

// ---- Small corner ornaments framing the card itself (distinct from
// LETTER_DECOR_ITEMS above, which frame the closed envelope on the box
// floor) — kept sparse per the brief's own "elegant and sparse" ask.
export const MESSAGE_DECOR_SCALE = 0.09;
export const MESSAGE_DECOR_FADE_DELAY = 0.6;
export const MESSAGE_DECOR_FADE_DURATION = 0.6;

// ---- A very small burst of soft warm particles once the card is
// rising — deliberately few, soft, and short-lived (see the brief's
// own "VERY SMALL amount... do NOT create a large particle explosion").
export const MESSAGE_PARTICLE_COUNT = 8;
export const MESSAGE_PARTICLE_COLORS = ["#ffd9a0", "#f5a8c0"];
export const MESSAGE_PARTICLE_SIZE = 0.09;
export const MESSAGE_PARTICLE_SPREAD = 0.5;
export const MESSAGE_PARTICLE_RISE = 0.5;
export const MESSAGE_PARTICLE_DURATION = 1.8;
export const MESSAGE_PARTICLE_SPAWN_DELAY = 1.2;

// ===========================
// Part 8 — the decorative keepsakes scattered around the envelope (see
// LETTER_DECOR_ITEMS above) becoming independently clickable. "polaroid"
// items open a focused, camera-facing photo viewer (still a placeholder
// swatch, no real photo yet); every other type just gets a small pop.
// ===========================

export const DECOR_STICKER_POP_SCALE = 1.35;
export const DECOR_STICKER_POP_DURATION = 0.45;

// Distance/scale picked the same way as MESSAGE_CARD_FOCUS_* above — a
// fixed pose in front of the live camera reads as centered and correctly
// sized on any aspect ratio.
export const PHOTO_FOCUS_DISTANCE = 1.3;
export const PHOTO_FOCUS_SCALE = 2.6;
export const PHOTO_FOCUS_DURATION = 0.7;
export const PHOTO_CLOSE_DURATION = 0.55;

// ===========================
// Part 9 — final close. Once the افتحي sequence is complete, the
// envelope (and its decor children) retracts deeper into the box
// interior — toward the center, well below the body's own rim (local
// y ≈ 0.48, see GiftBoxGeometry.js's own centering comment), a touch
// further back — right before GiftBox lowers the lid over it (see
// GiftBox.js's own _beginClose()/retractIntoBox() call site). The drop
// has to clear LETTER_POSITION_Y (0.5) down past that rim with margin
// to spare, not just nudge it — otherwise a corner (the envelope tilts
// slightly, see LETTER_TILT_*) still pokes above the rim and shows
// through the closing lid.
export const LETTER_RETRACT_X_FACTOR = 0.4;
export const LETTER_RETRACT_DROP = 0.55;
export const LETTER_RETRACT_BACK = 0.2;
