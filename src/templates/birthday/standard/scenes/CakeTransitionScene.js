import * as THREE from "three";

import BaseScene from "./BaseScene";
import ParticleSystem from "../components/ParticleSystem";

// Scene 6 — Transition. Dissolves the cake (and clears the celebration
// atmosphere around it) into a burst of particles, then moves on to the
// Memories scene once the burst finishes fading. Reuses the generic
// ParticleSystem component's "burst" mode — the same mechanic Firework
// and CandleFlame's smoke puff already use — configured entirely by
// content/config/particles.js's `cakeDissolve` preset.
export default class CakeTransitionScene extends BaseScene {
  enter() {
    const { scene, cake, atmosphere, config } = this.context;
    const dissolve = config.particles.cakeDissolve;

    const origin = cake
      ? new THREE.Vector3(0, cake.topY / 2, 0)
      : new THREE.Vector3(0, 1, 0);

    this.particles = new ParticleSystem({
      count: dissolve.count,
      color: dissolve.color,
      size: dissolve.size,
      spread: dissolve.spread,
    }).addTo(scene);

    this.particles.burst(origin, {
      force: dissolve.force,
      duration: dissolve.duration,
      onComplete: () => this.context.goToNext(),
    });

    // The cake vanishes immediately, replaced by the particle burst —
    // that swap *is* the "magical particle effect" the flow calls for,
    // rather than the cake fading independently alongside it.
    if (cake) {
      scene.remove(cake.group);
      cake.base.dispose();
      cake.candles.forEach((candle) => candle.dispose());
      this.context.cake = null;
    }

    if (atmosphere) {
      atmosphere.dispose();
      this.context.atmosphere = null;
    }
  }

  update(delta) {
    if (this.particles) this.particles.update(delta);
  }

  exit() {
    if (this.particles) {
      this.context.scene.remove(this.particles.points);
      this.particles.dispose();
      this.particles = null;
    }
  }
}
