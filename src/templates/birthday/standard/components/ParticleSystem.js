import * as THREE from "three";

// Generic, configurable point-cloud particle system — the one reusable
// particle building block the whole template shares (ambient dust,
// firework bursts, the cake's magical dissolve). Intentionally simple
// (THREE.PointsMaterial, no custom shader/spring physics like the luxury
// template's BlackHole) since this scaffold is about having a working,
// swappable piece in every scene, not a finished effect. Two modes:
//  - "idle": particles drift slowly forever (ambient dust, ready-made cake
//    sparkle) until dispose() is called.
//  - "burst": particles fly outward from an origin and fade out over a
//    fixed duration, then call onComplete once (fireworks, cake dissolve).
export default class ParticleSystem {
  constructor(options = {}) {
    this.count = options.count ?? 200;
    this.color = options.color ?? "#ffffff";
    this.size = options.size ?? 0.05;
    this.spread = options.spread ?? 1;

    this.mode = "idle";
    this.elapsed = 0;
    this.burstDuration = 0;
    this.onComplete = null;

    this.velocities = new Float32Array(this.count * 3);

    this.geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(this.count * 3);

    for (let i = 0; i < this.count; i++) {
      positions[i * 3] = THREE.MathUtils.randFloatSpread(this.spread);
      positions[i * 3 + 1] = THREE.MathUtils.randFloatSpread(this.spread);
      positions[i * 3 + 2] = THREE.MathUtils.randFloatSpread(this.spread);
    }

    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3),
    );

    this.material = new THREE.PointsMaterial({
      color: this.color,
      size: this.size,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(this.geometry, this.material);
  }

  addTo(group) {
    group.add(this.points);

    return this;
  }

  // Sends every particle flying outward from `origin` and fades them out
  // over `duration` seconds. Used by Firework and the cake dissolve.
  burst(origin, { force = 2, duration = 1.2, onComplete } = {}) {
    this.mode = "burst";
    this.elapsed = 0;
    this.burstDuration = duration;
    this.onComplete = onComplete ?? null;

    this.points.position.copy(origin);

    const positions = this.geometry.attributes.position;

    for (let i = 0; i < this.count; i++) {
      positions.array[i * 3] = 0;
      positions.array[i * 3 + 1] = 0;
      positions.array[i * 3 + 2] = 0;

      const direction = new THREE.Vector3(
        THREE.MathUtils.randFloatSpread(1),
        THREE.MathUtils.randFloatSpread(1),
        THREE.MathUtils.randFloatSpread(1),
      ).normalize();

      this.velocities[i * 3] = direction.x * force;
      this.velocities[i * 3 + 1] = direction.y * force;
      this.velocities[i * 3 + 2] = direction.z * force;
    }

    positions.needsUpdate = true;
    this.material.opacity = 1;
  }

  update(delta) {
    if (this.mode === "burst") {
      this.stepBurst(delta);
      return;
    }

    // Idle drift: a slow, constant rotation is enough to read as "alive"
    // without any per-particle bookkeeping.
    this.points.rotation.y += delta * 0.02;
  }

  stepBurst(delta) {
    this.elapsed += delta;

    const positions = this.geometry.attributes.position;

    for (let i = 0; i < this.count; i++) {
      positions.array[i * 3] += this.velocities[i * 3] * delta;
      positions.array[i * 3 + 1] += this.velocities[i * 3 + 1] * delta;
      positions.array[i * 3 + 2] += this.velocities[i * 3 + 2] * delta;
    }

    positions.needsUpdate = true;

    const progress = Math.min(this.elapsed / this.burstDuration, 1);

    this.material.opacity = 1 - progress;

    if (progress >= 1) {
      this.mode = "idle";

      if (this.onComplete) this.onComplete();
    }
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
