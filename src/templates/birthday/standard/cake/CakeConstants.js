// ===========================
// Standard — Step 3 (Cake Reveal) tuning + content. Its own file,
// separate from the flat Constants.js Steps 1-2 use, the same way Love
// splits envelope/EnvelopeConstants.js and stickers/PhotoStickerConstants.js
// out from its own top-level Constants.js once a subsystem gets
// substantial enough — this one has real geometry/timing/color data,
// not just a few strings.
// ===========================

import {
  STANDARD_ACCENT_PINK,
  STANDARD_ACCENT_PINK_SOFT,
  STANDARD_ACCENT_PINK_PALE,
  STANDARD_ACCENT_ROSE_DEEP,
  STANDARD_IVORY,
  STANDARD_GOLD,
} from "../StandardPalette";

// ---- Palette — the cake itself stays ivory/cream/gold regardless of
// the template's own accent color (currently Baby Pink — see
// ../StandardPalette.js and CakeAtmosphere.js's own use of it for the
// *environment* around the cake). The background stays dark/unchanged
// (see StandardScene.js's own STANDARD_BACKGROUND_COLOR) — all the
// warmth here comes from the cake, candles, and two dedicated lights
// this stage adds (see CakeLighting.js), never from recoloring the cake
// to match whatever the template's current accent happens to be.
export const CAKE_BODY_COLOR = "#f0d9c3"; // warm ivory
export const CAKE_CREAM_COLOR = "#faeadf"; // lighter blush-cream, frosting
export const CAKE_PLATE_COLOR = "#c9a869"; // soft gold stand
export const CANDLE_BODY_COLOR = "#f6e8d6";
export const CANDLE_STRIPE_COLOR = "#d9a86c";
export const FLAME_COLOR = "#ffb347";
export const FLAME_GLOW_COLOR = "#ffcf8a";

// Baby-pink decorative accents on the cake itself (ribbons, pearls,
// sprinkles, tiny hearts) — see CakeGeometry.js's own
// buildPinkAccents(). Three complementary shades rather than one flat
// pink; CAKE_BODY_COLOR/CAKE_CREAM_COLOR above stay the dominant cake
// color.
export const CAKE_ACCENT_PINK = STANDARD_ACCENT_PINK; // baby pink — the main accent
export const CAKE_ACCENT_PINK_SOFT = STANDARD_ACCENT_PINK_SOFT; // blush pink
export const CAKE_ACCENT_PINK_PALE = STANDARD_ACCENT_PINK_PALE; // palest, for subtler trims
export const CAKE_ACCENT_ROSE = STANDARD_ACCENT_ROSE_DEEP; // deeper rose — tiny accents only

// ---- Geometry — world units, in the same scale family as Love's own
// heart (~4 units tall — see love/Constants.js's HEART_SCALE comment).
// Each *_Y is that part's own local center within the cake group, built
// bottom-up from the plate so retuning one part's height automatically
// repositions everything stacked above it.
export const PLATE_RADIUS_TOP = 1.7;
export const PLATE_RADIUS_BOTTOM = 1.8;
export const PLATE_HEIGHT = 0.1;
export const PLATE_Y = PLATE_HEIGHT / 2;

export const LOWER_RADIUS_TOP = 1.5;
export const LOWER_RADIUS_BOTTOM = 1.55;
export const LOWER_HEIGHT = 0.85;
export const LOWER_Y = PLATE_HEIGHT + LOWER_HEIGHT / 2;

export const CREAM_RING_HEIGHT = 0.32;
export const CREAM_RING_Y = PLATE_HEIGHT + LOWER_HEIGHT + CREAM_RING_HEIGHT / 2;

export const UPPER_RADIUS_TOP = 1.0;
export const UPPER_RADIUS_BOTTOM = 1.08;
export const UPPER_HEIGHT = 0.68;
export const UPPER_Y = PLATE_HEIGHT + LOWER_HEIGHT + CREAM_RING_HEIGHT + UPPER_HEIGHT / 2;

export const TOP_FROSTING_HEIGHT = 0.34;
export const TOP_FROSTING_Y =
  PLATE_HEIGHT + LOWER_HEIGHT + CREAM_RING_HEIGHT + UPPER_HEIGHT + TOP_FROSTING_HEIGHT / 2;
export const TOP_FROSTING_MAX_RADIUS = 1.12;
export const TOP_FROSTING_MIN_RADIUS = 0.08;

// Where candles sit — approximately the frosting dome's own top surface;
// a slight embed into the dome reads as "pushed into the frosting"
// rather than floating.
export const CANDLE_TOP_SURFACE_Y =
  PLATE_HEIGHT + LOWER_HEIGHT + CREAM_RING_HEIGHT + UPPER_HEIGHT + TOP_FROSTING_HEIGHT * 0.55;
export const CANDLE_COUNT = 5;
export const CANDLE_RING_RADIUS = 0.5;
export const CANDLE_HEIGHT = 0.55;
export const CANDLE_RADIUS = 0.035;
export const FLAME_HEIGHT = 0.11;
export const FLAME_GLOW_SCALE = 0.55; // world-space sprite scale

// The whole cake group's own world position — centered under the
// camera's default lookAt, roughly matching where Love's own heart
// sits relative to ITS camera (see love/LoveCamera.js's
// CAMERA_LOOK_TARGET_Y) so the same shared responsive camera code
// reads reasonably well without needing a second correction layer.
export const CAKE_GROUP_Y = 0;

// ---- Camera — a wide establishing framing right after the countdown,
// dollying slowly in to a closer hero shot as the cake completes. Same
// idiom luxury/Animation/IntroCamera.js already uses (animate
// camera.position directly via GSAP, re-calling lookAt in onUpdate)
// rather than LoveCamera's own continuous per-frame formula — this is a
// one-time dolly, not a perpetual drift.
export const CAMERA_LOOK_TARGET_Y = 1.55;
export const CAMERA_WIDE_POSITION = { x: 0, y: 3.4, z: 15.5 };
export const CAMERA_HERO_POSITION = { x: 0, y: 2.35, z: 9.2 };
export const CAMERA_DOLLY_DURATION = 5.5; // spans roughly the whole formation, not a separate discrete beat
export const CAMERA_DOLLY_EASE = "power1.inOut";

// A hair of continuous life once settled — much smaller than Love's own
// idle sway (this is a single hero object, not an establishing shot),
// just enough that a long hold never reads as a frozen frame.
export const CAMERA_IDLE_SWAY_AMOUNT = 0.06;
export const CAMERA_IDLE_SWAY_SPEED = 0.35;

// After the cake has fully revealed and held briefly, the camera eases
// slightly farther back — breathing room for the stages that follow
// (personal messages, celebration effects) without touching the cake
// itself. Expressed as a distance multiplier on CAMERA_HERO_POSITION's
// own offset from CAMERA_LOOK_TARGET_Y (computed in CakeCamera.js)
// rather than a second hand-tuned raw position, so it always preserves
// the exact hero viewing angle — only the distance changes.
export const CAMERA_PULLBACK_DISTANCE_SCALE = 1.75; // ~30% smaller apparent cake size vs. the hero framing
export const CAMERA_PULLBACK_DURATION = 3.0;

// ---- Sequence timing — see CakeReveal.js's own master timeline. Kept
// here rather than scattered magic numbers so the whole pacing can be
// tuned in one place.
export const REVEAL_BREATH_DELAY = 0.6; // dark silence after "1" disappears
export const REVEAL_WARM_LIGHT_FADE_DURATION = 1.4; // subtle warmth arriving during the breath

export const CAKE_PART_ENTRANCE_DURATION = 0.7;
export const CAKE_PART_ENTRANCE_START_SCALE = 0.15;
export const CAKE_PART_STAGGER = 0.45; // gap between one part starting and the next

// The five wide structural/frosting tiers (plate, lowerLayer, creamRing,
// upperLayer, topFrosting) start their entrance already spanning most of
// their own footprint (x/z), rising into full height (y) from there —
// not shrinking uniformly toward a point like the small parts (candles)
// do. A wide flat cylinder scaled uniformly down to
// CAKE_PART_ENTRANCE_START_SCALE loses its radius as much as its height,
// so mid-tween it reads as a small disconnected blob hovering above the
// tier below rather than a cake layer settling into place.
export const CAKE_TIER_RADIUS_START_SCALE = 0.8;

export const CANDLE_ENTRANCE_DURATION = 0.5;
export const CANDLE_STAGGER = 0.09;
export const CANDLES_TO_FLAMES_PAUSE = 0.5; // the brief's own "short pause" before ignition

export const FLAME_IGNITE_DURATION = 0.45;
export const FLAME_STAGGER = 0.06;
export const CANDLELIGHT_FADE_DURATION = 0.8;

// How long CakeLighting's own dimForBlowOut() takes once the candles are
// blown out — see StandardCandleBlowoutConstants.js's own comment on the
// full "blow out -> dim -> pause -> fireworks" sequence this is one beat
// of.
export const CANDLE_BLOWOUT_DIM_DURATION = 1.2;

export const CAKE_REVEAL_HOLD_DURATION = 2.2; // time to actually appreciate the finished cake before onComplete

// ---- Formation sparkles — see FormationSparkles.js. Deliberately
// small counts; this is a soft materialize cue accompanying each part,
// never a particle explosion.
export const SPARKLE_BURST_COUNT = 7;
export const SPARKLE_BURST_RADIUS = 0.4;
export const SPARKLE_BURST_DURATION = 0.9;
export const SPARKLE_COLOR = "#ffd9a0";

// ---- Atmosphere — see CakeAtmosphere.js. Purely environmental/ambient
// elements (background gradient, a halo behind the cake, a soft ground
// glow, a handful of drifting particles, a few distant bokeh points) —
// entirely separate from the cake's own materials and from
// CakeLighting.js's own real lights. Kept deliberately restrained: the
// intended hierarchy is candle flames > CakeLighting's own warm cake
// illumination > this environmental halo > the faint background
// atmosphere, so every opacity here stays well below what the cake's
// own lighting already contributes.
export const ATMOSPHERE_BACKGROUND_CENTER_COLOR = "#1d1019"; // very dark plum — a touch of warmth without reading as anything but near-black
export const ATMOSPHERE_BACKGROUND_EDGE_COLOR = "#05070d"; // matches Constants.js's own STANDARD_BACKGROUND_COLOR exactly — no seam when this gradient texture replaces the flat color at cake-reveal time
export const ATMOSPHERE_BACKGROUND_TEXTURE_SIZE = 512;
// A wide falloff so the center-to-edge transition reads as a soft cloud
// of warmth rather than a defined vignette edge — corners still land on
// pure ATMOSPHERE_BACKGROUND_EDGE_COLOR.
export const ATMOSPHERE_BACKGROUND_GRADIENT_RADIUS_FRACTION = 0.42;

// The central glow behind the cake is layered (ivory core, gold mid,
// pale-pink outer) rather than one flat-colored sprite — three soft,
// low-opacity, differently-sized sprites overlapping at a small random
// offset from each other read as one irregular "cloud of warm light"
// instead of a visible circular spotlight (see CakeAtmosphere.js's own
// _buildHaloLayers()).
export const ATMOSPHERE_HALO_POSITION = { x: 0, y: 2.05, z: -1.6 }; // behind + slightly above the cake
export const ATMOSPHERE_HALO_LAYERS = [
  { color: STANDARD_IVORY, opacity: 0.078, scale: 9 },
  { color: STANDARD_GOLD, opacity: 0.1, scale: 6.8 },
  { color: STANDARD_ACCENT_PINK_PALE, opacity: 0.048, scale: 5.6 },
];

export const ATMOSPHERE_GROUND_GLOW_COLOR = "#ffb35a";
export const ATMOSPHERE_GROUND_GLOW_OPACITY = 0.16;
export const ATMOSPHERE_GROUND_GLOW_RADIUS = 2.6;
export const ATMOSPHERE_GROUND_GLOW_Y = 0.015; // just above the plate's own base

// Three device tiers (not just mobile/desktop) so tablet gets its own
// tuned density rather than inheriting the desktop count — see
// CakeAtmosphere.js's own _densityTier(). Same breakpoint values the
// project's earlier message-density work used, kept here as this
// system's own copy rather than a cross-file import (nothing left to
// import from now — that system was removed).
export const ATMOSPHERE_MOBILE_BREAKPOINT = 560; // px
export const ATMOSPHERE_TABLET_BREAKPOINT = 1100; // px

// ---- Star field — DELIBERATELY SPARSE this pass: "individual stars
// with plenty of empty space between them", not a dense field. Spread
// across seven named screen zones (upper-left/center/right, middle-
// left/right, lower-left/right — no zone centered on the cake) rather
// than pure independent randomness, so the whole sky still reads as
// covered even at a low count instead of risking a chance clump near
// the cake (see CakeAtmosphere.js's own _buildParticles()). Each star
// also rolls one of three depth tiers (background/midground/foreground),
// biasing its own scale/opacity into that tier's own band — a subtle
// continuum, not three hand-authored discrete groups per the brief's
// own "do not exaggerate the depth". Only a few small four-point
// sparkles exist (see the Sparkles section below) — a texture/behavior
// variant of this same star system, not a second star layer.
export const ATMOSPHERE_STAR_ZONES = [
  { name: "upper-left", nx: -0.55, ny: 0.55 },
  { name: "upper-center", nx: 0, ny: 0.65 },
  { name: "upper-right", nx: 0.55, ny: 0.55 },
  { name: "middle-left", nx: -0.75, ny: 0.05 },
  { name: "middle-right", nx: 0.75, ny: 0.05 },
  { name: "lower-left", nx: -0.55, ny: -0.55 },
  { name: "lower-right", nx: 0.55, ny: -0.55 },
];
export const ATMOSPHERE_STAR_ZONE_JITTER_X = 0.22; // fraction of frustum half-width, added on top of each zone's own center
export const ATMOSPHERE_STAR_ZONE_JITTER_Y = 0.18;

export const ATMOSPHERE_STAR_COUNT_DESKTOP = 26;
export const ATMOSPHERE_STAR_COUNT_TABLET = 19;
export const ATMOSPHERE_STAR_COUNT_MOBILE = 13;
export const ATMOSPHERE_PARTICLE_MIN_DEPTH = 3; // world units in front of the camera's own reference position
export const ATMOSPHERE_PARTICLE_MAX_DEPTH = 13;
export const ATMOSPHERE_PARTICLE_SCREEN_COVERAGE = 0.92; // fraction of the frustum's own half-extents used, keeping particles off the literal edge
export const ATMOSPHERE_PARTICLE_EXCLUSION_RADIUS_X = 0.24; // as a fraction of the frustum half-width at a particle's own depth — a safety net on top of zone placement, since the cake's own area still isn't one of the seven zones
export const ATMOSPHERE_PARTICLE_EXCLUSION_RADIUS_Y = 0.32;
export const ATMOSPHERE_PARTICLE_MIN_SCALE = 0.07;
export const ATMOSPHERE_PARTICLE_MAX_SCALE = 0.27; // raised for more size variation — a few stars now read as clearly "brighter/bigger", not just uniformly tiny
export const ATMOSPHERE_PARTICLE_MIN_OPACITY = 0.16;
export const ATMOSPHERE_PARTICLE_MAX_OPACITY = 0.8;
// Mostly warm white/ivory, with pale Baby Pink and soft gold as the
// occasional accent — see StandardPalette.js. Cycled by index across
// particles, so roughly half stay neutral ivory and the rest alternate
// pink/gold.
export const ATMOSPHERE_PARTICLE_COLORS = [STANDARD_IVORY, STANDARD_ACCENT_PINK_PALE, STANDARD_IVORY, STANDARD_GOLD];
export const ATMOSPHERE_PARTICLE_DRIFT_AMOUNT = 0.16; // world units
export const ATMOSPHERE_PARTICLE_DRIFT_SPEED_MIN = 0.15;
export const ATMOSPHERE_PARTICLE_DRIFT_SPEED_MAX = 0.35;

export const ATMOSPHERE_STAR_TIER_BACKGROUND_FRACTION = 0.55;
export const ATMOSPHERE_STAR_TIER_MIDGROUND_FRACTION = 0.3; // the remaining 0.15 is foreground
export const ATMOSPHERE_STAR_TWINKLE_CHANCE = 0.65; // fraction of the (small) foreground tier that actually twinkles
export const ATMOSPHERE_STAR_TWINKLE_SPEED_MIN = 0.35;
export const ATMOSPHERE_STAR_TWINKLE_SPEED_MAX = 0.85;
export const ATMOSPHERE_STAR_TWINKLE_STRENGTH = 0.5; // fraction of the star's own opacity/scale pulsed up and down

// ---- Sparkles — a texture/behavior variant of the star system above
// (getStarburstTexture()'s own 4-point glint shape instead of the plain
// glow dot, always gently twinkling, same zone distribution) rather
// than a separate particle manager. "A very small number" per the
// brief — a handful of glints, not a second star layer.
export const ATMOSPHERE_SPARKLE_COUNT_DESKTOP = 6;
export const ATMOSPHERE_SPARKLE_COUNT_TABLET = 5;
export const ATMOSPHERE_SPARKLE_COUNT_MOBILE = 4;
export const ATMOSPHERE_SPARKLE_MIN_SCALE = 0.11;
export const ATMOSPHERE_SPARKLE_MAX_SCALE = 0.22;
export const ATMOSPHERE_SPARKLE_MIN_OPACITY = 0.4;
export const ATMOSPHERE_SPARKLE_MAX_OPACITY = 0.88;
export const ATMOSPHERE_SPARKLE_COLORS = [STANDARD_IVORY, STANDARD_ACCENT_PINK_PALE, STANDARD_GOLD];
export const ATMOSPHERE_SPARKLE_TWINKLE_SPEED_MIN = 0.5;
export const ATMOSPHERE_SPARKLE_TWINKLE_SPEED_MAX = 1.1;

// ---- Pink hearts — the main new atmospheric idea this pass, used VERY
// sparingly per the brief: a small reusable pool (see CakeAtmosphere.js's
// own _buildHearts()), each running one continuous lifecycle (fade in ->
// gently float/drift -> fade out -> silently reposition elsewhere ->
// repeat — see _cycleHeart()) rather than three separate hand-picked
// behaviors. The direction of each cycle's own drift is re-rolled every
// time (mostly-upward vs. sideways, by a random angle rather than a
// binary switch), so a single heart doesn't always move the same way
// twice in a row, and the pool size itself IS the "~5-10 visible on
// desktop" the brief asks for — with every heart continuously fading in
// and out, not all of them are ever at full opacity at once, so the
// felt density is naturally softer than the raw count. Placed via plain
// random frame positions (not the star field's own zone stratification)
// so hearts read as organically scattered rather than arranged in a
// pattern, with the same central exclusion ellipse the stars use so
// none land directly over the cake.
export const ATMOSPHERE_HEART_COUNT_DESKTOP = 10; // within the requested 8-12
export const ATMOSPHERE_HEART_COUNT_TABLET = 7; // within the requested 6-9
export const ATMOSPHERE_HEART_COUNT_MOBILE = 5; // within the requested 4-7
export const ATMOSPHERE_HEART_MIN_DEPTH = 3;
export const ATMOSPHERE_HEART_MAX_DEPTH = 9; // pulled in slightly from 10 — a touch closer on average reads larger/more present without changing the actual sprite scale
// Three named sizes rather than one continuous range, matching the
// brief's own "mostly tiny / a few small / at most one occasional
// larger heart" — weighted so most hearts stay tiny. Raised from the
// previous pass (0.045/0.075/0.11) — those read as near-invisible dots
// at typical viewing distance even at full opacity.
export const ATMOSPHERE_HEART_SIZES = [
  { scale: 0.062, weight: 0.5 }, // tiny
  { scale: 0.1, weight: 0.36 }, // small
  { scale: 0.15, weight: 0.14 }, // occasional larger heart
];
// Raised well above the previous pass (0.12–0.42) — those opacities,
// combined with the small pre-tuning sprite size, made hearts
// functionally invisible against the dark background. Still soft/
// romantic, never neon: even the MAX here is well below a fully-opaque
// UI element, and every heart still spends real time at the low end of
// this range during its own fade in/out.
export const ATMOSPHERE_HEART_MIN_OPACITY = 0.24; // "some can be almost transparent" — still faint, but no longer imperceptible
export const ATMOSPHERE_HEART_MAX_OPACITY = 0.7; // "some can be softly glowing"
export const ATMOSPHERE_HEART_COLORS = [STANDARD_ACCENT_PINK_PALE, STANDARD_ACCENT_PINK_PALE, STANDARD_ACCENT_ROSE_DEEP];
// A soft companion glow sprite rendered just behind each heart (see
// CakeAtmosphere.js's own _buildHearts()/_cycleHeart()) — the same
// tinted-glow-texture technique the halo/bokeh already use, reused here
// rather than inventing a blur pass, giving each heart the "subtle soft
// glow" the brief asks for instead of a flat, hard-edged silhouette.
export const ATMOSPHERE_HEART_GLOW_SCALE_MULTIPLIER = 2.6; // relative to the heart sprite's own scale
export const ATMOSPHERE_HEART_GLOW_OPACITY_MULTIPLIER = 0.55; // relative to the heart's own target opacity
export const ATMOSPHERE_HEART_DRIFT_MIN = 0.4; // world units travelled per lifecycle — small and gentle
export const ATMOSPHERE_HEART_DRIFT_MAX = 0.9;
// Slowed from the previous pass (0.025–0.06) — for the same travel
// distance, a slower speed means a longer duration, which directly
// means more time spent visible at/near full opacity per the brief's
// own "should remain visible long enough for the viewer to notice".
export const ATMOSPHERE_HEART_DRIFT_SPEED_MIN = 0.016;
export const ATMOSPHERE_HEART_DRIFT_SPEED_MAX = 0.04;
export const ATMOSPHERE_HEART_SIDEWAYS_CHANCE = 0.4; // otherwise drifts mostly upward, per cycle

// ---- Floating light particles ("dust") — a distinct, smaller/dimmer
// layer from both stars and hearts: tiny, closer, drifting continuously
// in one general direction per cycle (mostly upward, occasionally
// sideways, occasionally a very short "almost stationary" hop) rather
// than the stars' own bounded sway, recycled to a fresh position once a
// cycle finishes instead of growing its position unbounded. Restrained
// counts — "the purpose is to prevent the background from feeling
// completely static", not to be individually noticed.
export const ATMOSPHERE_DUST_COUNT_DESKTOP = 9;
export const ATMOSPHERE_DUST_COUNT_TABLET = 6;
export const ATMOSPHERE_DUST_COUNT_MOBILE = 4;
export const ATMOSPHERE_DUST_MIN_DEPTH = 2.5; // closer than the star field's own MIN_DEPTH — genuinely "in the air" nearer the viewer
export const ATMOSPHERE_DUST_MAX_DEPTH = 8.5;
export const ATMOSPHERE_DUST_MIN_SCALE = 0.018;
export const ATMOSPHERE_DUST_MAX_SCALE = 0.045;
export const ATMOSPHERE_DUST_MIN_OPACITY = 0.08;
export const ATMOSPHERE_DUST_MAX_OPACITY = 0.22;
export const ATMOSPHERE_DUST_DRIFT_MIN = 0.5; // world units travelled per cycle — some cycles land tiny (near-stationary), some larger, from the same range
export const ATMOSPHERE_DUST_DRIFT_MAX = 1.6;
export const ATMOSPHERE_DUST_DRIFT_SPEED_MIN = 0.03; // world units / second
export const ATMOSPHERE_DUST_DRIFT_SPEED_MAX = 0.08;
export const ATMOSPHERE_DUST_SIDEWAYS_CHANCE = 0.35; // otherwise drifts upward
export const ATMOSPHERE_DUST_COLORS = [STANDARD_IVORY, STANDARD_ACCENT_PINK_PALE];

// ---- Light trails — VERY rare and small per the brief: at most one in
// flight at a time, short, thin, low-opacity, Baby Pink. Each is a thin
// dotted line of tiny static points (a single THREE.Points — one draw
// call) plus one small heart/sparkle/glow-dot sprite traveling along it
// via a plain GSAP-tweened `t` value sampling a CatmullRomCurve3 (see
// CakeAtmosphere.js's own _spawnTrail()), never a per-frame manual
// path-follow.
export const ATMOSPHERE_TRAIL_MAX_CONCURRENT = 2; // brief now explicitly allows "one or two visible at a time"
export const ATMOSPHERE_TRAIL_RESPAWN_DELAY_MIN = 6; // gap after one trail finishes before the next begins
export const ATMOSPHERE_TRAIL_RESPAWN_DELAY_MAX = 14;
export const ATMOSPHERE_TRAIL_MIN_DEPTH = 4;
export const ATMOSPHERE_TRAIL_MAX_DEPTH = 9;
export const ATMOSPHERE_TRAIL_SPAN_MIN = 1.1; // world units the curve's own start/end are apart — short, per the brief
export const ATMOSPHERE_TRAIL_SPAN_MAX = 1.9;
export const ATMOSPHERE_TRAIL_DOT_COUNT = 10;
export const ATMOSPHERE_TRAIL_DOT_SIZE = 0.03;
export const ATMOSPHERE_TRAIL_DOT_OPACITY = 0.32;
export const ATMOSPHERE_TRAIL_DOT_COLOR = STANDARD_ACCENT_PINK_PALE;
export const ATMOSPHERE_TRAIL_ICON_SCALE = 0.06;
export const ATMOSPHERE_TRAIL_ICON_OPACITY = 0.72;
export const ATMOSPHERE_TRAIL_TRAVEL_DURATION_MIN = 6;
export const ATMOSPHERE_TRAIL_TRAVEL_DURATION_MAX = 10;
export const ATMOSPHERE_TRAIL_HOLD_DURATION = 0.8; // dotted line stays visible this long after the icon arrives, before the whole trail fades out

// ---- Bokeh — "only a few extremely subtle blurred light points",
// large, heavily blurred, very low opacity, slowly moving, mixed warm
// gold/ivory/pale-pink. Never more than a handful.
export const ATMOSPHERE_BOKEH_COUNT_DESKTOP = 4;
export const ATMOSPHERE_BOKEH_COUNT_MOBILE = 3;
export const ATMOSPHERE_BOKEH_MIN_RADIUS = 5.5;
export const ATMOSPHERE_BOKEH_MAX_RADIUS = 8.5;
export const ATMOSPHERE_BOKEH_MIN_SCALE = 1.2;
export const ATMOSPHERE_BOKEH_MAX_SCALE = 1.9;
export const ATMOSPHERE_BOKEH_OPACITY = 0.045;
export const ATMOSPHERE_BOKEH_PINK_OPACITY = 0.065; // pink reads weaker per-unit than ivory/gold at the same value, so its own resting target sits a touch higher — still "barely noticeable"
export const ATMOSPHERE_BOKEH_COLORS = [STANDARD_IVORY, STANDARD_GOLD, STANDARD_ACCENT_PINK_PALE, STANDARD_IVORY];
export const ATMOSPHERE_BOKEH_DRIFT_AMOUNT = 0.4; // world units — a much larger, slower excursion than the star particles', so it reads as barely-there movement
export const ATMOSPHERE_BOKEH_DRIFT_SPEED_MIN = 0.02;
export const ATMOSPHERE_BOKEH_DRIFT_SPEED_MAX = 0.05;

// How long the whole atmosphere takes to fade in once triggered — see
// CakeReveal.js's own call site (fired alongside "cake begins forming",
// the same cursor CakeLighting's own fadeInRevealLight() already uses).
export const ATMOSPHERE_FADE_IN_DURATION = 3.5;
