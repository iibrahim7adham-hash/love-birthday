import * as THREE from "three";

import {
  HEART_ATTRACTION,
  HEART_CENTER_Y,
  HEART_COLOR,
  HEART_CORE_ALPHA,
  HEART_CORE_SIZE,
  HEART_DAMPING,
  HEART_EDGE_ALPHA,
  HEART_EDGE_SIZE,
  HEART_PARTICLE_COUNT,
  HEART_SCALE,
  HEART_SCATTER_RADIUS,
} from "./Constants";
import LoveParticles from "./LoveParticles";

// Traces the classic heart parametric curve once into a polygon, used
// for point-in-polygon rejection sampling — gives a proper heart
// silhouette (twin lobes, sharp bottom point) with uniform density
// across the shape, rather than warping a simpler primitive into
// roughly the right outline.
function buildHeartPolygon() {
  const points = [];
  const segments = 120;

  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;

    points.push({
      x: Math.pow(Math.sin(t), 3),
      y:
        (13 * Math.cos(t) -
          5 * Math.cos(2 * t) -
          2 * Math.cos(3 * t) -
          Math.cos(4 * t)) /
        16,
    });
  }

  return points;
}

const HEART_POLYGON = buildHeartPolygon();

function isInsideHeart(x, y) {
  let inside = false;

  for (
    let i = 0, j = HEART_POLYGON.length - 1;
    i < HEART_POLYGON.length;
    j = i++
  ) {
    const a = HEART_POLYGON[i];
    const b = HEART_POLYGON[j];

    const crosses =
      a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x;

    if (crosses) inside = !inside;
  }

  return inside;
}

// The curve's true bounds are x:[-1, 1], y:[-1.0625, 0.7452] — these
// pad slightly beyond that so rejection sampling never starves near the
// edges.
function sampleHeartPoint() {
  let x = 0;
  let y = 0;
  let attempts = 0;

  do {
    x = THREE.MathUtils.randFloat(-1.05, 1.05);
    y = THREE.MathUtils.randFloat(-1.12, 0.8);
    attempts += 1;
  } while (!isInsideHeart(x, y) && attempts < 50);

  return { x, y };
}

// A random point inside a sphere of the given radius, uniform by
// volume (cube-root the random radius) — the particles' scattered
// starting state.
function sampleScatterPoint(radius) {
  const direction = new THREE.Vector3(
    THREE.MathUtils.randFloatSpread(2),
    THREE.MathUtils.randFloatSpread(2),
    THREE.MathUtils.randFloatSpread(2),
  ).normalize();

  const distance = radius * Math.cbrt(Math.random());

  return direction.multiplyScalar(distance);
}

// The only owner of heart-specific particle logic: what a heart-shaped
// target looks like, where it sits in the scene, and how particles are
// scattered before gathering into it. Everything here is built
// exclusively on LoveParticles' generic public API (setPositions,
// setStyle, setTargets, setAttraction, setDamping) — the engine itself
// never sees a heart coordinate.
export default class HeartFormation {
  constructor(scene) {
    this.scene = scene;

    this.particles = new LoveParticles(HEART_PARTICLE_COUNT);
    this.scene.add(this.particles.points);

    const color = new THREE.Color(HEART_COLOR);

    this.particles.setPositions(() => {
      const scatter = sampleScatterPoint(HEART_SCATTER_RADIUS);

      return {
        x: scatter.x,
        y: HEART_CENTER_Y + scatter.y,
        z: scatter.z,
      };
    });

    // Computed once and kept public (rather than left buried inside
    // LoveParticles' own target buffer) so other heart-specific modules
    // — HeartAnimation's breathing pulse, for one — can read the base
    // shape without re-sampling it or reaching into the engine's
    // internals. Raw (pre-HEART_SCALE) points are kept only locally,
    // just long enough to derive each particle's radius from the
    // heart's own center for the style pass below.
    this.heartTargets = [];
    const rawPoints = [];

    for (let i = 0; i < HEART_PARTICLE_COUNT; i++) {
      const point = sampleHeartPoint();

      rawPoints.push(point);
      this.heartTargets.push({
        x: point.x * HEART_SCALE,
        y: HEART_CENTER_Y + point.y * HEART_SCALE,
        z: THREE.MathUtils.randFloatSpread(0.12),
      });
    }

    this.particles.setTargets((i) => this.heartTargets[i]);

    // Particles nearer the heart's own center render larger/brighter,
    // tapering smoothly toward the outline — a soft glowing-core feel
    // rather than a flat, uniformly dense silhouette. 1.1 is roughly
    // the curve's own radius from center (true bounds are x:[-1,1],
    // y:[-1.0625,0.7452]), so radiusFrac reaches ~1 right at the edge.
    this.particles.setStyle((i) => {
      const point = rawPoints[i];

      const radiusFrac = THREE.MathUtils.clamp(
        Math.sqrt(point.x * point.x + point.y * point.y) / 1.1,
        0,
        1,
      );

      return {
        color,
        size: THREE.MathUtils.lerp(HEART_CORE_SIZE, HEART_EDGE_SIZE, radiusFrac),
        alpha: THREE.MathUtils.lerp(HEART_CORE_ALPHA, HEART_EDGE_ALPHA, radiusFrac),
      };
    });
  }

  // Starts the gather — kept separate from the constructor so the
  // scene decides when formation actually begins, rather than it being
  // a side effect of construction.
  begin() {
    this.particles.setAttraction(HEART_ATTRACTION);
    this.particles.setDamping(HEART_DAMPING);
  }

  update(delta) {
    this.particles.update(delta);
  }

  destroy() {
    this.particles.destroy();
    this.scene.remove(this.particles.points);
  }
}
