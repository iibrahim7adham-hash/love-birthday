// GLSL strings for ParticleEngine's ShaderMaterial. Kept as plain JS
// template strings (no shader-file loader configured in this project),
// mirroring how other templates inline shader code.

export const particleVertexShader = /* glsl */ `
  attribute vec3 aStart;
  attribute vec3 aTarget;

  uniform float uProgress;
  uniform float uSize;
  uniform float uPixelRatio;

  void main() {
    vec3 pos = mix(aStart, aTarget, uProgress);

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
