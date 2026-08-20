// GLSL strings for ParticleEngine's ShaderMaterial. Kept as plain JS
// template strings (no shader-file loader configured in this project),
// mirroring how other templates inline shader code.

export const particleVertexShader = /* glsl */ `
  attribute vec3 aStart;
  attribute vec3 aTarget;
  // Quadratic Bezier control point. When a caller doesn't need a curved
  // path (most morphs), this is set to the aStart/aTarget midpoint, which
  // makes the Bezier formula below collapse to a plain straight-line
  // mix(aStart, aTarget, t) exactly — see ParticleEngine.morphTo(). Only
  // callers that explicitly want a swept/curved motion (e.g. the
  // countdown's cinematic assemble — see NumberParticles.js) push it away
  // from that midpoint.
  attribute vec3 aControl;
  // Per-particle stagger, in the same 0..1 domain as uProgress. Left at
  // 0 for every ordinary morph (the whole population then moves exactly
  // in lockstep, as before). A caller that wants some particles to hang
  // back and depart later — e.g. the countdown's cinematic entrance, see
  // NumberParticles.js — sets this per particle; a particle whose delay
  // hasn't been reached yet just holds at aStart (local == 0 below).
  // Remapped so EVERY particle, regardless of its delay, still lands
  // exactly on aTarget the moment uProgress reaches 1 — a later start
  // means a steeper catch-up, never a late arrival.
  attribute float aDelay;

  uniform float uProgress;
  uniform float uSize;
  uniform float uPixelRatio;

  void main() {
    float local = clamp((uProgress - aDelay) / max(1.0 - aDelay, 0.0001), 0.0, 1.0);
    local = local * local * (3.0 - 2.0 * local); // smoothstep — its own gentle accelerate/decelerate on top of uProgress's own easing

    float u = 1.0 - local;
    vec3 pos = u * u * aStart + 2.0 * u * local * aControl + local * local * aTarget;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

    gl_PointSize = uSize * uPixelRatio * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// Soft round sprite (a glowing dot, not a flat square) with a glow halo
// baked into the same point — used by the countdown's particle-built
// numbers/words (see number/NumberParticles.js). Euclidean distance from
// center is what makes it a circle; uCoreFraction is the radius where
// the bright core ends and the halo begins (see ParticleEngine's
// `coreFraction` option) — callers can size the point sprite bigger than
// the "true" dot footprint to give the halo room without growing the
// dot itself. Both the core's own inner edge and the halo use eased
// (non-linear) falloffs — a soft graded glow rather than a flat disc
// with a hard edge, which is what reads as a rich, glowing orb instead
// of a plain dry circle.
export const particleFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uCoreFraction;

  void main() {
    vec2 p = (gl_PointCoord - vec2(0.5)) * 2.0; // 0 at center, 1 at sprite edge
    float dist = length(p);

    if (dist > 1.0) discard;

    float core = 1.0 - smoothstep(0.0, uCoreFraction, dist);
    core = pow(core, 0.6); // keeps the core bright well past its center, not just a pinprick

    float haloT = clamp((dist - uCoreFraction) / max(1.0 - uCoreFraction, 0.001), 0.0, 1.0);
    float halo = pow(1.0 - haloT, 2.4);

    float alpha = clamp(core * 0.95 + halo * 0.6, 0.0, 1.0) * uOpacity;
    if (alpha <= 0.001) discard;

    gl_FragColor = vec4(uColor, alpha);
  }
`;

// ---- "heart" mode (HeartFormation) ----
// A third shader pair, structurally a twin of particleVertexShader's
// morph (same aStart/aControl/aTarget/aDelay quadratic-Bezier-with-
// stagger interpolation — see there for why), but with per-particle
// aSize/aColor instead of engine-wide uSize/uColor uniforms (every
// heart particle needs its own size/tint — see HeartFormation.js's
// createHeartTargets()), and sampling a textured heart-glyph sprite
// (see heart/HeartAtlas.js) instead of drawing a round dot procedurally
// — so each particle reads as a tiny heart, not a circle.
//
// Two purely time-driven (uTime), always-on, small-amplitude motions are
// folded in here rather than as a separate system:
//  - a per-particle bob/float (aPhase decorrelates it particle to
//    particle so the swarm doesn't move as one rigid block)
//  - a whole-heart breathe (scales pos.xy about the origin — the
//    heart's own mathematical center, see HeartFormation.js) so it
//    reads as alive without ever distorting the silhouette
// Both run from t=0 onward rather than being gated to "after formation
// completes": their amplitude is small enough that during the
// convergence flight (see aStart/aTarget/aDelay) they're lost in the
// larger formation motion, and once particles settle they're all that's
// left — no separate "formation done" signal needs to reach the shader.
export const heartParticleVertexShader = /* glsl */ `
  attribute vec3 aStart;
  attribute vec3 aTarget;
  attribute vec3 aControl;
  attribute float aDelay;
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aPhase;

  uniform float uProgress;
  uniform float uPixelRatio;
  uniform float uTime;
  uniform float uBreatheAmp;
  uniform float uBreatheSpeed;
  uniform float uBobAmp;
  uniform float uBobSpeed;

  varying vec3 vColor;

  void main() {
    float local = clamp((uProgress - aDelay) / max(1.0 - aDelay, 0.0001), 0.0, 1.0);
    local = local * local * (3.0 - 2.0 * local);

    float u = 1.0 - local;
    vec3 pos = u * u * aStart + 2.0 * u * local * aControl + local * local * aTarget;

    pos.x += sin(uTime * uBobSpeed + aPhase) * uBobAmp;
    pos.y += cos(uTime * uBobSpeed * 0.85 + aPhase * 1.3) * uBobAmp;

    pos.xy *= 1.0 + sin(uTime * uBreatheSpeed) * uBreatheAmp;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

    gl_PointSize = aSize * uPixelRatio * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;

    vColor = aColor;
  }
`;

// Samples the pre-rendered glow-heart sprite (white shape + soft alpha
// halo, see heart/HeartAtlas.js) and tints it per-particle by vColor —
// same "white-glyph-alpha-as-mask, tint at render time" trick as
// rainFragmentShader, so subtle per-particle color variation (spec
// section 4) doesn't require a whole re-rasterized atlas per color.
// uUseTextureColor toggles between the two sprite conventions this mode
// supports: 0 (default) is the white-glyph-alpha-mask trick above —
// tex.rgb is discarded, color comes entirely from per-particle vColor.
// 1 is for a sprite that's already fully colored on its own (e.g. the
// multi-color layered-heart icon in heart/LayeredHeartAtlas.js, whose
// look depends on several distinct baked-in colors at once, not one
// tintable shape) — tex.rgb is used as-is and vColor is ignored.
export const heartParticleFragmentShader = /* glsl */ `
  uniform sampler2D uTexture;
  uniform float uOpacity;
  uniform float uUseTextureColor;

  varying vec3 vColor;

  void main() {
    vec4 tex = texture2D(uTexture, gl_PointCoord);
    float alpha = tex.a * uOpacity;
    if (alpha <= 0.003) discard;
    vec3 color = mix(vColor, tex.rgb, uUseTextureColor);
    gl_FragColor = vec4(color, alpha);
  }
`;

// ---- "fall" mode (LoveRain) ----
// A second, additive shader pair for ParticleEngine's `mode: "fall"` path
// (see ParticleEngine.js). Unlike the morph shaders above, these drive
// position from continuous elapsed time (uTime) plus per-particle static
// attributes instead of interpolating aStart -> aTarget by a shared
// progress uniform — the rain never "arrives" anywhere, it just falls and
// wraps, so a global progress value doesn't apply here. Reuses the same
// aStart/aTarget attribute slots for different data (see ParticleEngine's
// initFallData) to avoid allocating two more buffers, plus one new aVary
// attribute for glyph type/brightness/size.
//
// No time-based alpha of any kind — every particle is at full per-
// particle brightness from uTime=0 onward.
//
// Each particle's `phase` (aStart.y, 0..fallRange) is added to the
// traveled distance BEFORE the mod(), not baked in as a separate offset
// applied after — that's the difference between "every particle wraps
// within the same shared [uTopEdge - fallRange, uTopEdge] band forever"
// (correct: a rotating-phase uniform distribution stays uniform for all
// time) and "every particle wraps within its OWN randomly-shifted band"
// (the bug this replaced: the whole field would drift downward as a
// rigid block and empty out at the top until individual particles
// happened to complete a full cycle). With phase inside the mod, the
// field is already fully populated top-to-bottom on the very first
// frame AND stays that way forever — only individual particles recycle
// from bottom to top, never the population as a whole.
export const rainVertexShader = /* glsl */ `
  attribute vec3 aStart; // x, phase, z
  attribute vec3 aTarget; // fallSpeed, unused, rotation
  attribute vec3 aVary; // glyphType, brightness, sizeMult

  uniform float uTime;
  uniform float uFallRange;
  uniform float uTopEdge;
  uniform float uSpeedMult;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uAttraction;

  varying float vType;
  varying float vBrightness;
  varying float vRotation;

  void main() {
    float fallen = mod(uTime * aTarget.x * uSpeedMult + aStart.y, uFallRange);
    float y = uTopEdge - fallen;

    // Center attraction (vortex Part 1): bulge toward x=0 mid-fall-cycle,
    // easing back to the spawn x at the top/bottom of the band (bandT=0
    // and 1) so recycling never snaps and nothing drifts/accumulates at
    // the center — this is a bend in the fall path, not a straight-line
    // pull or an orbit. aTarget.z (rotation, already randomized per
    // particle) doubles as a stable per-particle variance source so
    // particles don't all bend by the same amount, without a new buffer.
    float bandT = fallen / uFallRange;
    // sqrt widens the hump's near-peak plateau (vs. plain sin) so the
    // inward bend stays clearly visible across most of the fall, not
    // just a brief moment mid-path, while still easing to exactly 0 at
    // bandT=0/1 (no snap at spawn/recycle).
    float curve = sqrt(sin(bandT * 3.14159265));
    float perFactor = 0.85 + 0.15 * (aTarget.z / 6.28318530718);

    float pulledX = aStart.x - aStart.x * uAttraction * curve * perFactor;

    vec3 pos = vec3(pulledX, y, aStart.z);

    vType = aVary.x;
    vBrightness = aVary.y;
    vRotation = aTarget.z;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

    gl_PointSize = uSize * aVary.z * uPixelRatio * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const rainFragmentShader = /* glsl */ `
  uniform sampler2D uAtlas;
  uniform float uGlyphCount;
  uniform vec3 uColor;
  uniform float uOpacity;

  varying float vType;
  varying float vBrightness;
  varying float vRotation;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);

    float c = cos(vRotation);
    float s = sin(vRotation);
    uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y) + vec2(0.5);

    float col = floor(vType + 0.5);
    vec2 atlasUV = vec2((col + uv.x) / uGlyphCount, uv.y);
    vec4 tex = texture2D(uAtlas, atlasUV);

    vec3 color = uColor * vBrightness;
    float alpha = tex.a * vBrightness * uOpacity;

    gl_FragColor = vec4(color, alpha);
  }
`;
