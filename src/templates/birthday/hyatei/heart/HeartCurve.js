// The exact mathematical heart silhouette every particle target in
// HeartFormation.js is derived from — never approximated with a random
// cloud. Pure math, no THREE/DOM dependency, so it's trivially testable
// in isolation from the particle system that consumes it.
//
//   x(t) = 16 sin(t)^3
//   y(t) = 13 cos(t) - 5 cos(2t) - 2 cos(3t) - cos(4t)
//
// Sampling is done by ARC LENGTH, not by t: this curve's speed
// (dx/dt, dy/dt) varies a lot around the loop — slow through the sharp
// bottom cusp, fast across the top indentation — so equal steps in t
// would bunch particles unevenly around the contour. buildHeartLUT()
// precomputes a fine (t -> cumulative arc length) table once;
// sampleHeartByArcLength() then inverts it so callers can ask for "the
// point s (0..1) of the way around the perimeter" and get points evenly
// spaced by actual distance travelled along the curve.

const ARC_SAMPLES = 2000;

function heartPoint(t) {
  const sinT = Math.sin(t);
  const x = 16 * sinT * sinT * sinT;
  const y =
    13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
  return [x, y];
}

// Built once and reused by every sample/normal call — the raw (x, y) at
// ARC_SAMPLES+1 evenly-t-spaced points, their cumulative arc length, and
// the curve's own bounding box (for centering/scaling to world units).
export function buildHeartLUT() {
  const points = new Array(ARC_SAMPLES + 1);
  const cumulative = new Float64Array(ARC_SAMPLES + 1);

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (let i = 0; i <= ARC_SAMPLES; i++) {
    const t = (i / ARC_SAMPLES) * Math.PI * 2;
    const [x, y] = heartPoint(t);
    points[i] = [x, y];

    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;

    if (i > 0) {
      const [px, py] = points[i - 1];
      cumulative[i] = cumulative[i - 1] + Math.hypot(x - px, y - py);
    }
  }

  return {
    points,
    cumulative,
    totalLength: cumulative[ARC_SAMPLES],
    minX,
    maxX,
    minY,
    maxY,
  };
}

function findSegment(lut, target) {
  let lo = 0;
  let hi = ARC_SAMPLES;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (lut.cumulative[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return Math.max(1, lo);
}

// The curve's raw (x, y) at arc-length fraction s (wraps at 0/1), linearly
// interpolated between the two bracketing LUT samples — smooth output at
// any density, not snapped to the coarser ARC_SAMPLES grid.
export function sampleHeartByArcLength(lut, s) {
  const wrapped = (((s % 1) + 1) % 1) * lut.totalLength;
  const i1 = findSegment(lut, wrapped);
  const i0 = i1 - 1;

  const seg = lut.cumulative[i1] - lut.cumulative[i0] || 1;
  const frac = (wrapped - lut.cumulative[i0]) / seg;

  const [x0, y0] = lut.points[i0];
  const [x1, y1] = lut.points[i1];

  return [x0 + (x1 - x0) * frac, y0 + (y1 - y0) * frac];
}

// The local outward normal at arc-length fraction s, from a small
// forward/backward finite difference along the curve — used to offset
// points across the curve's own thickness for the particle band's inner/
// middle/outer layers (see HeartFormation.js). Deliberately NOT a radial
// offset from the shape's centroid, which would badly distort the
// pointed tip and the top indentation.
export function sampleHeartNormal(lut, s) {
  const EPS = 0.0015;
  const [xa, ya] = sampleHeartByArcLength(lut, s - EPS);
  const [xb, yb] = sampleHeartByArcLength(lut, s + EPS);

  const dx = xb - xa;
  const dy = yb - ya;
  const len = Math.hypot(dx, dy) || 1;

  // 90 degree rotation of the tangent. Which of the two perpendiculars
  // this is (inward vs outward) only matters relative to itself — layer
  // offsets are applied as +/- multiples of this same vector, so both
  // sides of the band come out correct regardless of the curve's winding
  // direction.
  return [dy / len, -dx / len];
}

// The scale/center a caller needs to map the curve's own raw (x, y) unit
// space onto world units of a given height, centered on the origin —
// shared by HeartFormation.js (the contour itself) and any decorative
// population that needs to know where "inside"/"outside" the heart
// actually is (e.g. heart/Hearts3D.js, kept out of the main contour).
export function heartWorldTransform(lut, worldHeight) {
  const scale = worldHeight / (lut.maxY - lut.minY);
  const centerX = (lut.minX + lut.maxX) / 2;
  const centerY = (lut.minY + lut.maxY) / 2;
  return { scale, centerX, centerY };
}

// The curve's own LUT points, mapped to world space via
// heartWorldTransform — a closed polygon approximating the exact
// contour, dense enough (ARC_SAMPLES) for isPointInsideHeart's ray-cast
// below to be accurate anywhere it matters, including through the
// pointed tip and the top indentation.
export function buildHeartWorldPolygon(lut, transform) {
  const { scale, centerX, centerY } = transform;
  return lut.points.map(([x, y]) => [(x - centerX) * scale, (y - centerY) * scale]);
}

// Standard ray-casting point-in-polygon test.
export function isPointInsideHeart(polygon, x, y) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}
