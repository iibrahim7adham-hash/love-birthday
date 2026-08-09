// ===========================
// Camera — the establishing shot for the whole scene. Fixed for now;
// Responsive.js (added once the composition is approved) will take
// over making this adapt by aspect ratio without changing the
// composition itself.
// ===========================
export const CAMERA_DISTANCE = 16;
export const CAMERA_ELEVATION_DEG = 22;
export const CAMERA_LOOK_TARGET_Y = 0.3;

// A small idle drift so the shot never reads as a frozen frame.
export const CAMERA_SWAY_AMOUNT = 0.05;
export const CAMERA_SWAY_SPEED = 0.15;

// A slow side-to-side arc layered underneath the sway — a full
// there-and-back cycle takes roughly 2*PI / CAMERA_ARC_SPEED ≈ 45s, and
// the camera never swings more than CAMERA_ARC_AMOUNT_DEG off center,
// so it reads as a living shot, not a reframing.
export const CAMERA_ARC_AMOUNT_DEG = 4;
export const CAMERA_ARC_SPEED = 0.14;

// ===========================
// Background / stars
// ===========================
export const BACKGROUND_COLOR = "#000000";

export const STAR_COUNT = 2200;
export const STAR_FIELD_RADIUS = 60;
export const STAR_COLOR = "#eaf0ff";

// A gentle whole-field shimmer — the star field's opacity breathes
// within this range, slowly, so distant stars never look like a flat,
// static backdrop.
export const STAR_TWINKLE_MIN_OPACITY = 0.72;
export const STAR_TWINKLE_MAX_OPACITY = 0.95;
export const STAR_TWINKLE_SPEED = 0.25;

// Fog only ever reaches the outer star field — the platform, heart and
// petals all sit well inside STAR_FOG_NEAR — so it adds a sense of
// depth to the sky without touching the actual subject.
export const STAR_FOG_NEAR = 30;
export const STAR_FOG_FAR = 65;

// ===========================
// Orbit platform — the ring the heart sits above.
// ===========================
export const PLATFORM_RADIUS = 3.4;
export const PLATFORM_RING_WIDTH = 0.6;
export const PLATFORM_COLOR = "#ffb6c9";
export const PLATFORM_Y = -1.8;

// A very slow spin around its own vertical axis — a full rotation
// takes minutes, not seconds. Enough to read as "alive/orbiting" over
// time without ever looking like it's visibly turning frame to frame.
export const PLATFORM_ROTATION_SPEED = 0.0125;

// The ring's alpha fades smoothly around its own circumference, dimmest
// exactly at the far/world side (away from the camera, where it passes
// behind the heart) and brightest at the near/front side — a world-space
// effect, independent of the texture spin above, so the ring reads as
// naturally passing behind the heart instead of being cut.
export const PLATFORM_BACK_ALPHA = 0.1;
export const PLATFORM_FRONT_ALPHA = 1;

// ===========================
// Heart formation. HEART_SCALE is a derived value, not an arbitrary
// one: the parametric heart curve HeartFormation.js traces is exactly
// 1.808 units tall unscaled; at Stage 1's approved camera position
// (CAMERA_DISTANCE/CAMERA_ELEVATION_DEG above), the visible frame
// height at the heart's distance works out to roughly 9.9 world units.
// 1.808 * 2.2 = 3.98, which is ~40% of 9.9 — inside the requested
// 35-45% range. If the camera or the curve ever changes, re-derive this
// rather than eyeballing a new number.
// ===========================
export const HEART_PARTICLE_COUNT = 3000;
export const HEART_SCALE = 2.2;
export const HEART_CENTER_Y = 1.0;
export const HEART_COLOR = "#ff6f91";

// Particles nearer the heart's own geometric center render slightly
// larger and brighter than ones near its outline, tapering smoothly
// outward — a soft "glowing core" quality instead of a flat, uniformly
// dense silhouette.
export const HEART_CORE_SIZE = 3.4;
export const HEART_EDGE_SIZE = 1.5;
export const HEART_CORE_ALPHA = 1;
export const HEART_EDGE_ALPHA = 0.65;

// How far scattered the particles start before gathering — comfortably
// wider than the heart's own footprint so gathering inward reads as
// clear motion rather than a small settle.
export const HEART_SCATTER_RADIUS = 6;

// Generic LoveParticles attraction/damping values, tuned for a smooth,
// weighted gather-in rather than a snap or a bouncy overshoot.
export const HEART_ATTRACTION = 2.2;
export const HEART_DAMPING = 3.2;

// ===========================
// Floating petals — spawn/visual parameters only. All motion behavior
// (drift, wobble, rotation, fade, lifetime/respawn) lives in
// FloatingSystem.js, shared by any future floating decoration.
// ===========================
export const PETAL_COUNT = 28;
export const PETAL_COLOR = "#ffc9d9";
export const PETAL_SIZE_RANGE = [0.35, 0.6];

// Spawns above and around the heart, wide enough to drift past it on
// either side; falls down through the platform's level before its
// lifetime ends and it respawns back at the top.
export const PETAL_SPAWN_BOUNDS = {
  x: [-4, 4],
  y: [3, 6],
  z: [-2.5, 2],
};

export const PETAL_VELOCITY = {
  x: [-0.05, 0.05],
  y: [-0.4, -0.25],
  z: [-0.03, 0.03],
};

export const PETAL_WOBBLE_AMOUNT_RANGE = [0.3, 0.6];
export const PETAL_WOBBLE_SPEED_RANGE = [0.3, 0.6];
export const PETAL_ROTATION_SPEED_RANGE = [-0.4, 0.4];

export const PETAL_LIFETIME_RANGE = [10, 16];
export const PETAL_FADE_IN_DURATION = 1.5;
export const PETAL_FADE_OUT_DURATION = 2.5;
export const PETAL_ALPHA_RANGE = [0.55, 0.9];

// ===========================
// Falling birthday messages — a self-contained system (see
// LoveMessages.js), not split into a generic engine + skin the way
// Petals/FloatingSystem are, per how it was specced.
// ===========================
export const MESSAGE_TEXTS = [
  "Happy Birthday",
  "Happy Birthday to my favorite person",
  "Wishing you endless love and happiness",
  "You make every day brighter",
  "May all your dreams come true",
  "Today is all about you",
  "Thank you for being you",
  "You deserve every beautiful moment",
  "Stay happy, always",
  "Forever grateful for you",
  "You are my favorite person",
  "You make life more beautiful",
];

export const MESSAGE_POOL_SIZE = 16;

// The rain only begins once the heart is unmistakably done forming —
// see HeartFormation's HEART_ATTRACTION/HEART_DAMPING: at those values
// the worst-case (farthest-scattered) particle is ~99.5% converged by
// t=6s after HeartFormation.begin() (verified by simulating the same
// spring integrator LoveParticles.update() runs), and HeartAnimation's
// own breathing is already at full amplitude by t=5s (its
// BREATH_START_DELAY + BREATH_FADE_IN_DURATION). 8s lands ~2s after the
// heart is visually settled and already breathing — "roughly 1-2
// seconds after fully formed" — without touching either of those
// systems' own timing.
export const MESSAGE_START_DELAY = 8;

export const MESSAGE_FONT_SIZE = 64;
export const MESSAGE_HEIGHT = 0.55;

// Spawns outside the visible camera frustum (verified against the
// reference camera: at these Y values the frame's own top edge sits at
// world Y ~4.8-5.4 across the full MESSAGE_SPAWN_Z_RANGE depth, leaving
// a ~3.6-4.2 unit margin here) and across its full width; Z gives each
// message its own depth for parallax (see MESSAGE_DEPTH_MIN/MAX_
// BRIGHTNESS below). A message's entrance into frame is purely
// physical — it falls into view — never an opacity fade-in; see
// LoveMessages' fadeOutFactor().
export const MESSAGE_SPAWN_Y_RANGE = [9, 12];
export const MESSAGE_SPAWN_X_RANGE = [-9, 9];
export const MESSAGE_SPAWN_Z_RANGE = [-4, 5];

// MESSAGE_SPAWN_X_RANGE is divided into MESSAGE_POOL_SIZE equal lanes,
// one per pooled item, so no amount of bad luck can cluster several
// messages into the same narrow region — each item still picks a
// random X *within* its own lane (this fraction of the lane's width),
// which is what keeps the result reading as organic scattered rain
// rather than a visible grid.
export const MESSAGE_X_SLOT_JITTER_FRACTION = 0.6;

// Slow, gentle rain — no acceleration, no bounce, just a constant
// per-item fall speed plus tiny wobble/float layered on top.
export const MESSAGE_FALL_SPEED_RANGE = [-0.23, -0.4];
export const MESSAGE_WOBBLE_AMOUNT_RANGE = [0.15, 0.35];
export const MESSAGE_WOBBLE_SPEED_RANGE = [0.1, 0.25];
export const MESSAGE_FLOAT_AMOUNT_RANGE = [0.05, 0.12];
export const MESSAGE_FLOAT_SPEED_RANGE = [0.4, 0.7];

// Fade-out only — there is no fade-in. A message's entrance is the
// physical act of falling into frame from MESSAGE_SPAWN_Y_RANGE (well
// outside the frustum); introducing an opacity ramp on top of that
// would make it visibly "complete" its fade while still above frame,
// which reads as popping in the instant it crosses the edge instead of
// gradually entering. Fade is driven by POSITION, not age:
// MESSAGE_FADE_OUT_Y sits well above the heart's own top edge (~2.64,
// see HEART_SCALE/CENTER_Y), so a message is always fully invisible
// before it could ever reach the heart or platform.
export const MESSAGE_FADE_OUT_Y = 3.2;
export const MESSAGE_FADE_OUT_DISTANCE = 1.8;

// Farther messages (toward MESSAGE_SPAWN_Z_RANGE's near end) render
// dimmer than closer ones — a depth cue on top of the size difference
// perspective already gives sprites for free.
export const MESSAGE_DEPTH_MIN_BRIGHTNESS = 0.5;
export const MESSAGE_DEPTH_MAX_BRIGHTNESS = 1;

// The soft glowing trail beneath each message — what makes it read as
// "rain" and not just floating text.
export const MESSAGE_STREAK_COLOR = "#ffc7dc";
export const MESSAGE_STREAK_HEIGHT_RANGE = [1.4, 2.4];
export const MESSAGE_STREAK_WIDTH = 0.09;
export const MESSAGE_STREAK_OPACITY_FACTOR = 0.7;

// ===========================
// Intro — the cinematic "chapter zero" before the main experience
// begins (see LoveIntro.js). Its background reuses LoveEnvironment,
// Petals and LoveCamera exactly as they already are — same visual
// language, zero duplicated code — so only the small floating hearts
// and the 2D question/button UI below are genuinely new.
// ===========================
export const INTRO_TITLE = "Are You Ready?";
export const INTRO_SUBTITLE = "مفاجأة صغيرة تليق بيج";

// Small ambient hearts drifting gently upward — the inverse of the
// petals' downward fall, for a layered, two-directional background.
export const INTRO_HEART_COUNT = 12;
export const INTRO_HEART_COLOR = "#ff8fa8";
export const INTRO_HEART_SIZE_RANGE = [0.22, 0.4];

export const INTRO_HEART_SPAWN_BOUNDS = {
  x: [-6, 6],
  y: [-3.5, 1],
  z: [-3, 4],
};

export const INTRO_HEART_VELOCITY = {
  x: [-0.03, 0.03],
  y: [0.04, 0.09],
  z: [-0.02, 0.02],
};

export const INTRO_HEART_WOBBLE_AMOUNT_RANGE = [0.15, 0.3];
export const INTRO_HEART_WOBBLE_SPEED_RANGE = [0.2, 0.4];
export const INTRO_HEART_ROTATION_SPEED_RANGE = [-0.15, 0.15];
export const INTRO_HEART_LIFETIME_RANGE = [14, 22];
export const INTRO_HEART_FADE_IN_DURATION = 2.5;
export const INTRO_HEART_FADE_OUT_DURATION = 3;
export const INTRO_HEART_ALPHA_RANGE = [0.4, 0.75];

// How far the No button must stay from the viewport edge, and from the
// title/subtitle/Yes button block, every time it picks a new spot.
export const INTRO_NO_VIEWPORT_MARGIN = 24;
export const INTRO_NO_EXCLUSION_PADDING = 28;
