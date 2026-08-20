// ===========================
// Hyatei — Part 3 (LOVE rain). Scene-wide constants only; per-system
// tuning that's genuinely local to one file stays inline there instead
// of being funneled through here.
// ===========================

// A near-black background — the reference is dark throughout this part,
// with the pink rain as the only light source.
export const HYATEI_BACKGROUND_COLOR = "#0a0a0f";

export const HYATEI_CAMERA_Z = 10;

// ---- LOVE rain (Group A) ----
// The same main color the particle heart itself uses (HEART_COLORS[0]
// below) — was a separate desaturated "baby pink", changed on request
// so the rain and the heart read as one consistent palette.
export const RAIN_COLOR = "#FF3B81";
export const RAIN_GLYPHS = ["L", "O", "V", "E", "heart"];
// Hearts are rare relative to the LOVE letters (spec section 4).
export const RAIN_GLYPH_WEIGHTS = [1, 1, 1, 1, 0.35];

export const RAIN_COUNT_BY_PERFORMANCE = {
  low: 350,
  medium: 550,
  high: 800,
  ultra: 900,
};

export const RAIN_SIZE = 0.34;
export const RAIN_SPEED_MIN = 0.55;
export const RAIN_SPEED_MAX = 1.15;
export const RAIN_SIZE_MULT_MIN = 0.6;
export const RAIN_SIZE_MULT_MAX = 1.4;
export const RAIN_BRIGHTNESS_MIN = 0.4;
export const RAIN_BRIGHTNESS_MAX = 1.0;

// ---- Center attraction (vortex sequence, Part 1 only) ----
// Was a gentle pull that bent each particle's fall path toward x=0 —
// disabled (max 0) on request because it made the rain visibly funnel/
// converge toward the center in diagonal streaks, which read as an
// unwanted conical motion. Left in place (rather than deleted) in case a
// future part wants it back.
export const RAIN_ATTRACTION_MAX = 0;
export const RAIN_ATTRACTION_RAMP_DELAY = 2; // seconds of plain rain before it begins
export const RAIN_ATTRACTION_RAMP_DURATION = 10; // seconds to reach full (still-subtle) strength

// A partial (not full) dim once the particle heart becomes the scene's
// main focus (see LoveRain.fadeOut(), called from HyateiScene once
// HeartFormation signals it's done) — the rain keeps quietly falling
// underneath at low opacity rather than vanishing outright.
export const RAIN_FADE_OPACITY = 0.15;
export const RAIN_FADE_DURATION = 2.5;

// ---- Countdown numbers (particle-built 3 -> 2 -> 1, LED/dot-matrix grid) ----
// Runs on top of LoveRain, in its own ParticleEngine ("morph" mode) —
// never touches LoveRain's engine/uniforms/timing. Every digit is sampled
// onto the SAME cols x rows lattice (see number/GlyphSampler.js) so a
// formed digit is always an exact grid of evenly-spaced cells, never
// freely-sampled points — that's what keeps the "on" state
// mathematically precise while scatter/transform/burst stay organic.
export const COUNTDOWN_COLOR = "#ffffff";
// fillRatio: a dot's own solid footprint as a fraction of one grid
// cell's spacing — bold/LED-bright, dots from neighboring "on" cells
// touch and slightly overlap rather than leaving a gap.
// glowMargin: the rendered point sprite is this much BIGGER than the
// dot's own footprint, purely to leave room for the glow halo around
// it (see particleFragmentShader's uCoreFraction) — the glow bleeds
// outward from the dot without the dot itself growing.
// Both are scaled DOWN at coarser grid tiers on purpose: a low-res grid
// already has much bigger individual cells (fewer rows over the same
// COUNTDOWN_DIGIT_SIZE), so the same "bold" ratio/margin used at a dense
// grid would make neighboring dots swallow each other into a blurry
// blob instead of a readable dot-matrix — this bit the phone case, where
// Performance.js's post-benchmark downgrade can land on "low" even on a
// capable device (e.g. a slow first-second FPS reading from a high-DPR
// canvas). Every tier still ends up looking bold/glowing on its own grid.
export const COUNTDOWN_GRID_BY_PERFORMANCE = {
  low: { cols: 22, rows: 30, fillRatio: 0.85, glowMargin: 1.3 },
  medium: { cols: 30, rows: 40, fillRatio: 0.95, glowMargin: 1.5 },
  high: { cols: 36, rows: 48, fillRatio: 1.05, glowMargin: 1.7 },
  ultra: { cols: 42, rows: 56, fillRatio: 1.1, glowMargin: 1.9 },
};
// Extra reduction applied ON TOP of the tier's own fillRatio/glowMargin
// when `device.isMobile` (narrow viewport, regardless of GPU tier).
// A phone's much narrower CSS width means the SAME world-space grid gets
// far fewer physical pixels across the digit, so the exact-same fraction
// of "gap" between cells that reads fine on desktop can shrink to a
// sub-pixel sliver on a phone and anti-alias/glow away entirely — the
// digit reads as one solid glowing block instead of a dot-matrix, even
// on a high `performanceLevel` tier where the grid itself is fine. This
// is a screen-size problem, not a GPU-power problem, so it's a separate
// multiplier from the per-tier table above, not folded into it.
export const COUNTDOWN_MOBILE_FILL_SCALE = 0.78;
export const COUNTDOWN_MOBILE_GLOW_SCALE = 0.7;
export const COUNTDOWN_DIGIT_SIZE = 5.2; // world-space span each digit's grid occupies

// ---- Cinematic entrance (scatter -> "3" only — see
// NumberParticles._buildEntrancePositions/_buildEntranceControls) ----
// Particles start already gathered at the digit's own center as one
// small, softly-glowing circle — not scattered off-screen — and that
// circle blooms outward into the "3". Denser toward its own middle
// (COUNTDOWN_ENTRANCE_CIRCLE_RADIUS scaled by a LINEAR, non-sqrt,
// per-particle radius fraction — see _buildEntrancePositions()) so it
// reads as a small glowing orb, not a flat evenly-filled disc. The
// angle around that circle comes from a golden-angle spiral over the
// particle index (see GOLDEN_ANGLE in NumberParticles.js), not
// Math.random — deterministic every run, still organic-looking.
export const COUNTDOWN_ENTRANCE_CIRCLE_RADIUS = 0.85;
// Small per-particle depth jitter around z = 0 (the circle isn't
// perfectly flat) so the starting orb reads as a small round cluster
// with a little depth to it, not a flat coin.
export const COUNTDOWN_ENTRANCE_Z_JITTER = 0.25;
// Per-particle stagger, as a fraction of the assemble's own duration —
// see aDelay in particleVertexShader. Some particles depart immediately,
// others hold briefly first; all still land exactly on the "3" the
// instant the assemble completes; deterministic per particle index, not
// randomized per run. Wide on purpose — the orb unfurls petal by petal
// rather than every particle departing as one synchronized wave.
export const COUNTDOWN_ENTRANCE_DELAY_SPREAD = 0.6;
// How far a particle's Bezier control point sweeps off the straight
// start->target line, as a fraction of that particle's own travel
// distance — see NumberParticles._buildEntranceControls(). The sweep
// direction is the SAME 90 degree rotation for every particle (not a
// random per-particle sign), which is what makes the whole bloom read
// as one coherent outward swirl rather than particles curving every
// which way. Kept shallow — a soft, unhurried arc rather than a tight,
// mechanical-looking vortex spin.
export const COUNTDOWN_ENTRANCE_SWIRL_MIN = 0.14;
export const COUNTDOWN_ENTRANCE_SWIRL_MAX = 0.3;
// The control point's z lifts slightly toward the camera (a fraction of
// the particle's own xy travel distance) before settling back to the
// digit's flat z = 0 plane — a gentle "bloom forward, then settle" life
// to the unfurl instead of a perfectly flat outward slide.
export const COUNTDOWN_ENTRANCE_BLOOM_LIFT_MIN = 0.05;
export const COUNTDOWN_ENTRANCE_BLOOM_LIFT_MAX = 0.16;

// Particles are invisible (opacity 0) until this many seconds into the
// scene — nothing at all is on screen (just LOVE rain) until then. At
// that moment they pop into existence already scattered at random
// positions in space (COUNTDOWN_APPEAR_DURATION, a quick fade-in, no
// movement yet), THEN start being "pulled in" toward "3"
// (COUNTDOWN_ASSEMBLE_DURATION) — two distinct beats, not one blended
// appear-while-moving motion.
export const COUNTDOWN_ENTER_DELAY = 3;
export const COUNTDOWN_APPEAR_DURATION = 0.25;
export const COUNTDOWN_OPACITY = 0.92;
export const COUNTDOWN_ASSEMBLE_DURATION = 2.6; // scatter -> "3": unhurried on purpose — a slow, tender drift together, not a rush
// "3"->"2" and "2"->"1" are a direct morph — every particle moves in a
// straight line from its current grid cell to its new one (see
// ParticleEngine.morphTo). A shatter-and-reform variant (particles pop
// outward briefly before reassembling) was tried and explicitly
// rejected ("ماعجبتني الانتقاله") — do not reintroduce it without a new
// request.
export const COUNTDOWN_TRANSFORM_DURATION = 0.9; // "3"->"2" and "2"->"1"
export const COUNTDOWN_HOLD_DURATION = 0.7; // stable pause after "3" and "2"
export const COUNTDOWN_FINAL_HOLD_DURATION = 0.5; // stable pause after "1", before the burst

// After "1", particles explode outward across the WHOLE visible space
// (not a small pop near the center) — distance is a fraction of the
// camera's actual visible half-diagonal at HYATEI_CAMERA_Z (computed at
// runtime in NumberParticles, since it depends on aspect/fov), so it
// genuinely reaches edge-to-edge on any screen size rather than a fixed
// world-unit distance that would look tiny on a wide screen or overflow
// a narrow one.
export const COUNTDOWN_BURST_DURATION = 1.2;
export const COUNTDOWN_BURST_REACH_MIN_FRACTION = 0.55;
export const COUNTDOWN_BURST_REACH_MAX_FRACTION = 1.05;
// A held breath at full scatter before the particles start gathering
// back in — makes "explode, then reform" read as two distinct beats
// instead of an immediate rebound.
export const COUNTDOWN_SCATTERED_HOLD_DURATION = 0.6;

// The final reveal: the same particles that were "3" -> "2" -> "1" get
// pulled back in from across the whole space into this word, sampled
// onto the same kind of grid as the digits (see GlyphSampler.js) but a
// much wider one — COUNTDOWN_TEXT_ASPECT (cols:rows) is tuned for this
// specific word's proportions, not reused generically.
export const COUNTDOWN_TEXT = "You";
export const COUNTDOWN_TEXT_ASPECT = 2.6;
export const COUNTDOWN_GATHER_DURATION = 1.3;
// "You" -> this word: a second beat after the gather, same direct-morph
// mechanism as "3"->"2"->"1" (see ParticleEngine.morphTo, no swirl/
// stagger) — every particle moves in a straight line from its current
// grid cell to its new one.
export const COUNTDOWN_TEXT_2 = "Are";
export const COUNTDOWN_TEXT_2_HOLD_DURATION = 0.8; // stable pause on "You" before morphing onward
export const COUNTDOWN_TEXT_2_TRANSFORM_DURATION = 1.1; // "You" -> this word — a bit longer than a digit transform since the shapes are wider/more complex
// "Are" -> this word, same direct-morph mechanism again.
export const COUNTDOWN_TEXT_3 = "My";
export const COUNTDOWN_TEXT_3_HOLD_DURATION = 0.8; // stable pause on "Are" before morphing onward
export const COUNTDOWN_TEXT_3_TRANSFORM_DURATION = 1.1; // "Are" -> this word
// "My" -> this word.
export const COUNTDOWN_TEXT_4 = "Love";
export const COUNTDOWN_TEXT_4_HOLD_DURATION = 0.8; // stable pause on "My" before morphing onward
export const COUNTDOWN_TEXT_4_TRANSFORM_DURATION = 1.1; // "My" -> this word

// ---- Finale: "Love" holds, then disperses into a soft cinematic drift
// outward, then fades away — the sequence's true end state now (nothing
// forms after this; HyateiScene only tears the whole scene down when it
// itself is destroyed). Reuses the entrance's own swirl/stagger math
// (NumberParticles._buildEntranceControls/_buildEntranceDelays), just
// mirrored outward instead of inward, so the goodbye reads as the same
// gentle, unhurried motion language as the opening bloom rather than the
// sharper "1"->burst explosion earlier in the sequence.
export const COUNTDOWN_FINALE_HOLD_DURATION = 1.4; // stable pause on "Love" before dispersing
export const COUNTDOWN_FINALE_DISPERSE_DURATION = 3.2;
export const COUNTDOWN_FINALE_DISPERSE_REACH_MIN_FRACTION = 0.5;
export const COUNTDOWN_FINALE_DISPERSE_REACH_MAX_FRACTION = 1.15;
// Fraction of COUNTDOWN_FINALE_DISPERSE_DURATION already elapsed when
// the opacity fade begins — started partway through the drift (not
// only once it's fully finished) so the particles are visibly still in
// gentle motion as they dim, rather than coming to a dead stop and only
// then fading.
export const COUNTDOWN_FINALE_FADE_DELAY_FRACTION = 0.5;
export const COUNTDOWN_FINALE_FADE_DURATION = 2.6;

// ---- Heart particle formation (heart/HeartFormation.js) ----
// A cinematic particle-built heart, made of hundreds/thousands of tiny
// glowing pink heart-shaped sprites (see heart/HeartAtlas.js) gathering
// from scattered points in space onto a mathematically exact heart
// contour (see heart/HeartCurve.js) — never a random cloud that merely
// resembles a heart. Runs in its own ParticleEngine ("heart" mode),
// entirely separate from LoveRain and NumberParticles.
export const HEART_COUNT_BY_PERFORMANCE = {
  low: 900,
  medium: 1600,
  high: 2400,
  ultra: 3200,
};

// The heart's own world-space height, as a fraction of the camera's
// visible height at HYATEI_CAMERA_Z — computed at runtime (depends on
// aspect/fov) so it genuinely reads as "65-75% of screen height" on any
// screen size, same reasoning as NumberParticles' burst-reach fraction.
export const HEART_HEIGHT_FRACTION = 0.7;

// The particle band around the curve: a CONTINUOUS spread across the
// curve's local normal (see sampleHeartNormal in HeartCurve.js, not a
// naive radial offset from the shape's centroid, which would badly
// distort the pointed tip), not discrete inner/middle/outer strata —
// three fixed offset lines were tried first and rejected: with too
// little jitter to bridge the gaps between them, they read as separate
// parallel railroad-track lines instead of one soft band. Each
// particle's own offset is +/-HEART_BAND_HALF_WIDTH_FRACTION (a fraction
// of the heart's world-space height) at most, biased toward 0 (sitting
// closer to the exact mathematical contour) by raising a signed 0..1
// low-discrepancy value to HEART_BAND_BIAS_POWER before scaling — a
// higher power packs more particles near the curve itself and thins
// smoothly toward the band's outer edge, satisfying spec section 2's
// "density highest near the main contour, gradually thinner toward the
// outside" without ever producing a visible discrete line.
export const HEART_BAND_HALF_WIDTH_FRACTION = 0.05;
export const HEART_BAND_BIAS_POWER = 1.8;

// Extra fine-grained jitter on top of the band placement above — a very
// small controlled variation (spec section 2) so particles don't sit on
// a perfectly smooth offset curve, giving the band a grainy, organic
// texture rather than a crisp mathematical stripe. jitterAlong is a
// fraction of the curve's own arc-length domain (0..1); jitterNormal is
// a fraction of the heart's world-space height.
export const HEART_JITTER_ALONG_FRACTION = 0.0035;
export const HEART_JITTER_NORMAL_FRACTION = 0.006;

// Particle sprite size (world units, same "uSize"-like scale as
// COUNTDOWN_DIGIT_SIZE's dots). Size varies smoothly per particle (a
// continuous function of a deterministic low-discrepancy channel, see
// createHeartTargets()) between MIN and MAX, biased toward the small end
// so small particles dominate — with a rarer, smoothly-blended ACCENT
// multiplier for the "slightly larger heart particles" spec section 3
// asks for as visual accents, not a hard random size jump.
export const HEART_SIZE_MIN = 0.09;
export const HEART_SIZE_MAX = 0.2;
export const HEART_SIZE_ACCENT_MULT = 1.75;
export const HEART_SIZE_ACCENT_FRACTION = 0.08; // fraction of particles eligible to be accents

// Romantic neon pink palette (spec section 4) — picked per particle with
// these weights (main color most common) and blended a little toward a
// neighboring palette color per-particle for subtle continuous variation
// rather than every particle being one of exactly 4 flat colors.
export const HEART_COLORS = ["#FF3B81", "#FF6FA8", "#FF9BC5", "#E91E63"];
export const HEART_COLOR_WEIGHTS = [0.42, 0.27, 0.18, 0.13];
export const HEART_OPACITY = 0.95;

// Entrance: every particle starts scattered across a wide volume around
// the scene (spec section 8 — "start with the particles dispersed
// around the scene"), well beyond the visible frame, at a per-particle
// distance between these two fractions of the camera's own visible
// half-diagonal at HYATEI_CAMERA_Z (same reach math as the countdown's
// burst — see NumberParticles.js). zSpread scatters the starting depth
// so particles visibly approach from in front of AND behind the heart's
// own z = 0 plane, not just from the sides.
export const HEART_SCATTER_REACH_MIN_FRACTION = 1.2;
export const HEART_SCATTER_REACH_MAX_FRACTION = 2.4;
export const HEART_SCATTER_Z_SPREAD = 3.5;

// The gather itself: one long, unhurried convergence (spec section 8 —
// "gradually pull them... progressively... not all at exactly the same
// speed"). delaySpread staggers departure per particle (deterministic,
// same ld() convention as NumberParticles' entrance); swirl/lift bow
// each particle's flight path off the straight line, same Bezier-control
// trick as NumberParticles._buildEntranceControls, so the whole gather
// reads as one coherent inward swirl rather than particles cutting
// straight lines from every direction.
export const HEART_FORMATION_DURATION = 3.6;
export const HEART_FORMATION_DELAY_SPREAD = 0.55;
export const HEART_FORMATION_SWIRL_MIN = 0.08;
export const HEART_FORMATION_SWIRL_MAX = 0.22;
export const HEART_FORMATION_LIFT_MIN = 0.04;
export const HEART_FORMATION_LIFT_MAX = 0.14;
export const HEART_APPEAR_DURATION = 0.5;

// After formation (spec sections 9-10): a very subtle whole-heart
// breathe and a tiny per-particle bob/float, both driven straight off
// heartParticleVertexShader's own uTime (no JS-side tween loop needed —
// see ParticleEngine.update()'s "heart" branch). Amplitudes are in the
// same fractional/world-unit domain the shader multiplies pos by — kept
// small on purpose ("only a few percent scale difference", "extremely
// small floating/bobbing variations").
export const HEART_BREATHE_AMP = 0.025;
export const HEART_BREATHE_SPEED = 0.32;
export const HEART_BOB_AMP = 0.012;
export const HEART_BOB_SPEED = 0.55;

// ---- 3D hearts (heart/Hearts3D.js) ----
// The SAME heart.glb model luxury/Environment/Hearts.js floats through
// its own scene — reused here (per explicit request) rather than a
// custom 2D sprite, scattered across the WHOLE visible frame at three
// size tiers, not confined near the main particle contour. Its own
// THREE.Group of real mesh clones (not a ParticleEngine population —
// this is actual geometry, so it can catch real light/rotate in 3D) —
// never touches HeartFormation's or LoveRain's own engine/targets.
// Starts only once both HeartFormation has finished forming AND LoveRain
// has faded (see HyateiScene.js).
// Counts raised (a wider, denser spread) alongside the smaller scale
// range below — more, smaller hearts read as "spread out more" without
// the field feeling emptier.
export const HEARTS_3D_COUNT_BY_PERFORMANCE = {
  low: { large: 9, medium: 18, small: 32 },
  medium: { large: 14, medium: 28, small: 48 },
  high: { large: 19, medium: 38, small: 64 },
  ultra: { large: 24, medium: 48, small: 82 },
};

// Scale as a FRACTION of the camera's own visible min(halfWidth,
// halfHeight) — not a fixed world-unit number. This camera holds
// horizontal fov roughly constant and widens vertical fov to compensate
// on narrow/portrait aspects (see Camera.js's computeResponsiveFov,
// and HeartFormation.js's own heartWorldHeight for the same fix
// applied to the main contour) — a fixed absolute scale would render
// visibly bigger/smaller depending on the device's aspect ratio.
// Multiplying by the SAME visible-extent metric every device computes
// keeps each heart's on-screen size consistent everywhere. Shrunk on
// request — this population reads as a fine scattered sprinkle, not
// chunky foreground hearts.
export const HEARTS_3D_SCALE_LARGE_FRACTION = [0.075, 0.11];
export const HEARTS_3D_SCALE_MEDIUM_FRACTION = [0.045, 0.068];
export const HEARTS_3D_SCALE_SMALL_FRACTION = [0.02, 0.04];

// Fraction of the camera's own visible half-width/half-height the
// scatter is allowed to use — pushed past 1 (on request, "spread out
// more") so hearts also spawn partly beyond the visible frame's edges,
// not just neatly inside it.
export const HEARTS_3D_SPREAD_FRACTION = 1.15;
export const HEARTS_3D_Z_MIN = -3.2;
export const HEARTS_3D_Z_MAX = 3.2;

// Kept OUT of the main particle heart's own interior (on request) — a
// heart is rejection-sampled up to this many times against
// HeartCurve.isPointInsideHeart before falling back to whatever the
// last attempt landed on (bounded, so this can never hang).
export const HEARTS_3D_EXCLUSION_MAX_ATTEMPTS = 30;

// A single flat color — the SAME pink as HeartMessage.css's own "I Love
// You" text (#ff6fa8) — rather than the mixed palette Hearts.js uses, so
// every heart reads as one consistent color with the message (still an
// array of one, so Hearts3D.js's random-pick logic doesn't need a
// special case).
export const HEARTS_3D_COLORS = ["#ff6fa8"];

export const HEARTS_3D_OPACITY = 0.92;
export const HEARTS_3D_APPEAR_DURATION = 2.2;

// The entrance: every heart starts above the visible top edge and falls
// straight down to its own scattered resting spot (like LoveRain, but a
// one-time entrance rather than a continuous loop), each with its own
// randomized duration/delay so the field cascades in in a scattered,
// varied way rather than one flat synchronized drop. Once a heart
// arrives it's marked "landed" and Hearts3D.update()'s usual float/bob
// motion (HEARTS_3D_FLOAT_*) takes over from there — see playIn().
export const HEARTS_3D_FALL_START_MARGIN = 1.5; // world units above the visible top edge
export const HEARTS_3D_FALL_DURATION_MIN = 1.1;
export const HEARTS_3D_FALL_DURATION_MAX = 2.4;
export const HEARTS_3D_FALL_STAGGER_MAX = 2.2;
export const HEARTS_3D_FALL_EASE = "power2.out";

// Continuous gentle float/rotate — same motion language as Hearts.js's
// own update(), just re-implemented locally (hyatei doesn't import
// another template's files) at amplitudes matching this smaller scene.
export const HEARTS_3D_FLOAT_SPEED_MIN = 0.2;
export const HEARTS_3D_FLOAT_SPEED_MAX = 0.55;
export const HEARTS_3D_FLOAT_AMPLITUDE_MIN = 0.15;
export const HEARTS_3D_FLOAT_AMPLITUDE_MAX = 0.4;
export const HEARTS_3D_ROTATE_SPEED_MAX = 0.3;
