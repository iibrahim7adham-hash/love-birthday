// Wraps any Object3D with a gentle sine-based bob + rotation drift, so
// balloons, message cards and floating text all share one idle-motion
// implementation instead of each hand-rolling its own sin(time) math.
// This is deliberately simple (no physics, no easing curves) — it exists
// so every scene has *something* alive on screen today, and can be swapped
// for a richer motion system later without touching the objects that use it.
export default class FloatingMotion {
  constructor(object3D, options = {}) {
    this.object3D = object3D;

    this.amplitude = options.amplitude ?? 0.15;
    this.speed = options.speed ?? 1;
    this.rotationSpeed = options.rotationSpeed ?? 0.2;

    // Random phase offset so multiple objects using the same options
    // don't all bob in perfect lockstep.
    this.phase = Math.random() * Math.PI * 2;

    this.baseY = object3D.position.y;
    this.elapsed = 0;
  }

  // Takes a per-frame delta (like every other update() in this template)
  // and accumulates its own elapsed time internally, rather than asking
  // callers to track and pass total elapsed time themselves.
  update(delta) {
    this.elapsed += delta;

    const t = this.elapsed * this.speed + this.phase;

    this.object3D.position.y = this.baseY + Math.sin(t) * this.amplitude;

    this.object3D.rotation.y += this.rotationSpeed * delta;
  }
}
