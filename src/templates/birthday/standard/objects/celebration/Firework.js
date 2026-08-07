import * as THREE from "three";

import ParticleSystem from "../../components/ParticleSystem";

// A single firework explosion: spawns a burst-mode ParticleSystem at an
// origin point and disposes itself once the burst finishes fading.
// `config` is content/config/celebration.js's `fireworks` block —
// colors, particle count and force range all come from there.
// Stateless beyond that on purpose — CelebrationAtmosphere just does
// `new Firework(scene, point, config)` on an interval; it doesn't
// manage a lifecycle, it checks `.disposed` each frame to drop finished
// ones.
export default class Firework {
  constructor(scene, origin, config) {
    this.scene = scene;
    this.disposed = false;

    const color = config.colors[Math.floor(Math.random() * config.colors.length)];

    this.particles = new ParticleSystem({
      count: config.particleCount,
      color,
      size: 0.06,
      spread: 0.05,
    });

    this.particles.addTo(scene);

    this.particles.burst(origin, {
      force: THREE.MathUtils.randFloat(config.minForce, config.maxForce),
      duration: config.duration,
      onComplete: () => this.dispose(),
    });
  }

  update(delta) {
    this.particles.update(delta);
  }

  dispose() {
    this.disposed = true;

    this.scene.remove(this.particles.points);
    this.particles.dispose();
  }
}
