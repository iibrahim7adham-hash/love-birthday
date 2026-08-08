import * as THREE from "three";

// ===========================
// A generic GPU particle engine — creation, per-frame update, rendering,
// and buffer/style utilities only. It has no idea what shape it's
// drawing: callers hand it per-particle positions/targets/styling
// through plain callbacks, so the same engine can become a heart, a
// scattered field, an orbit ring, or anything else without this file
// ever changing. No shape sampling, no choreography, no gsap — those
// belong to whatever scene-specific module uses this engine.
// ===========================

// The spring-toward-target integrator in update() is an explicit
// (forward) Euler step — unconditionally stable only for small
// timesteps. A stalled tab, a dropped frame, or a throttled background
// window can hand update() a delta of several seconds; left unclamped,
// that overshoots every particle's target by a huge margin in one step
// and the system diverges instead of converging. Capping delta is a
// numerical-stability concern of the integrator itself, not a
// scene-specific one.
const MAX_DELTA = 0.1;

const VERTEX_SHADER = `
  attribute float size;
  attribute float alpha;

  uniform float uOpacity;
  uniform float uPointScale;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = color;
    vAlpha = alpha * uOpacity;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float dist = max(-mvPosition.z, 1.0);

    // gl_PointSize is specified in device pixels, bypassing the normal
    // projection-matrix scaling every other object goes through —
    // uPointScale is the caller's hook to compensate for device pixel
    // ratio / responsive fov, the same way any consumer of this engine
    // needs to for particles to read as a consistent size across
    // screens. This engine only exposes the uniform; computing the
    // right value is the caller's responsibility.
    gl_PointSize = clamp(size * uPointScale * (20.0 / dist), 1.0, 20.0 * uPointScale);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv);

    if (d > 0.5) discard;

    float edge = smoothstep(0.5, 0.05, d);

    gl_FragColor = vec4(vColor, vAlpha * edge);
  }
`;

export default class LoveParticles {
  constructor(count) {
    this.count = count;

    this.velocities = new Float32Array(count * 3);
    this.targets = new Float32Array(count * 3);

    // Generic spring-toward-target knobs. Zero by default, so a fresh
    // engine with no targets set simply holds still — "particles exist
    // in space" is the natural resting state, not a special case.
    this.attraction = 0;
    this.damping = 2;

    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(count * 3), 3),
    );
    geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(new Float32Array(count * 3), 3),
    );
    geometry.setAttribute(
      "size",
      new THREE.BufferAttribute(new Float32Array(count), 1),
    );
    geometry.setAttribute(
      "alpha",
      new THREE.BufferAttribute(new Float32Array(count), 1),
    );

    this.geometry = geometry;

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: {
        uOpacity: { value: 1 },
        uPointScale: { value: 1 },
      },
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geometry, this.material);
  }

  // Sets every particle's current position directly (no easing) from a
  // per-index callback — the starting state for whatever shape a caller
  // wants, or a plain scatter with no shape at all.
  setPositions(positionFn) {
    const pos = this.geometry.attributes.position;

    for (let i = 0; i < this.count; i++) {
      const p = positionFn(i);
      const i3 = i * 3;

      pos.array[i3] = p.x;
      pos.array[i3 + 1] = p.y;
      pos.array[i3 + 2] = p.z;
    }

    pos.needsUpdate = true;
  }

  // Sets every particle's color/size/alpha from a per-index callback.
  setStyle(styleFn) {
    const colors = this.geometry.attributes.color;
    const sizes = this.geometry.attributes.size;
    const alphas = this.geometry.attributes.alpha;

    for (let i = 0; i < this.count; i++) {
      const style = styleFn(i);
      const i3 = i * 3;

      colors.array[i3] = style.color.r;
      colors.array[i3 + 1] = style.color.g;
      colors.array[i3 + 2] = style.color.b;

      sizes.array[i] = style.size;
      alphas.array[i] = style.alpha;
    }

    colors.needsUpdate = true;
    sizes.needsUpdate = true;
    alphas.needsUpdate = true;
  }

  // Sets where every particle is headed. update() eases current
  // positions toward these every frame once `attraction` is above zero
  // — the caller decides both the destination shape and when/how hard
  // it pulls.
  setTargets(targetFn) {
    for (let i = 0; i < this.count; i++) {
      const t = targetFn(i);
      const i3 = i * 3;

      this.targets[i3] = t.x;
      this.targets[i3 + 1] = t.y;
      this.targets[i3 + 2] = t.z;
    }
  }

  // A plain spring-toward-target integrator: velocity accumulates
  // pull-toward-target minus damping, position integrates velocity.
  // With `attraction` at its default of zero and no initial velocity,
  // this is a no-op — particles simply stay where setPositions() left
  // them.
  update(rawDelta) {
    const delta = Math.min(rawDelta, MAX_DELTA);

    const pos = this.geometry.attributes.position;

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;

      const dx = this.targets[i3] - pos.array[i3];
      const dy = this.targets[i3 + 1] - pos.array[i3 + 1];
      const dz = this.targets[i3 + 2] - pos.array[i3 + 2];

      this.velocities[i3] +=
        (dx * this.attraction - this.velocities[i3] * this.damping) * delta;
      this.velocities[i3 + 1] +=
        (dy * this.attraction - this.velocities[i3 + 1] * this.damping) *
        delta;
      this.velocities[i3 + 2] +=
        (dz * this.attraction - this.velocities[i3 + 2] * this.damping) *
        delta;

      pos.array[i3] += this.velocities[i3] * delta;
      pos.array[i3 + 1] += this.velocities[i3 + 1] * delta;
      pos.array[i3 + 2] += this.velocities[i3 + 2] * delta;
    }

    pos.needsUpdate = true;
  }

  // Generic knobs for the spring-toward-target integrator in update() —
  // how hard particles pull toward their targets, and how quickly that
  // pull settles rather than overshooting. Zero attraction (the
  // default) is what makes a fresh engine with no caller input hold
  // still.
  setAttraction(value) {
    this.attraction = value;
  }

  setDamping(value) {
    this.damping = value;
  }

  setOpacity(value) {
    this.material.uniforms.uOpacity.value = value;
  }

  setPointScale(value) {
    this.material.uniforms.uPointScale.value = value;
  }

  destroy() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
