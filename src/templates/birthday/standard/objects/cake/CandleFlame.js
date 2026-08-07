import * as THREE from "three";
import gsap from "gsap";

import GlowSprite from "../../components/GlowSprite";
import ParticleSystem from "../../components/ParticleSystem";

// One candle's flame: a small cone + glow sprite that flickers every
// frame, plus the extinguish beat the Blow Candles interaction needs.
// Every color, size and duration comes from content/config/candles.js
// (`candlesConfig`) and its smoke puff from content/config/particles.js
// (`smokeConfig`) — both passed down from Candle, which gets them from
// CakeBuildScene.
export default class CandleFlame {
  constructor(candlesConfig, smokeConfig) {
    this.candlesConfig = candlesConfig;
    this.smokeConfig = smokeConfig;

    this.object3D = new THREE.Group();

    this.cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.035, 0.12, 8),
      new THREE.MeshBasicMaterial({ color: candlesConfig.flameColor }),
    );
    this.cone.position.y = 0.06;
    this.object3D.add(this.cone);

    this.glow = new GlowSprite(candlesConfig.glowColor, candlesConfig.glowSize);
    this.object3D.add(this.glow.sprite);

    this.lit = true;
    this.flickerPhase = Math.random() * Math.PI * 2;
  }

  update(delta) {
    if (!this.lit) return;

    this.flickerPhase += delta * this.candlesConfig.flickerSpeed;

    const flicker =
      1 + Math.sin(this.flickerPhase) * this.candlesConfig.flickerStrength;

    this.cone.scale.set(flicker, flicker, flicker);
  }

  // Shrinks the flame to nothing, fades its glow, then puffs a smoke
  // burst — reusing the generic ParticleSystem's "burst" mode rather
  // than writing bespoke smoke code. Returns a Promise so
  // BlowCandlesScene can wait for every candle to finish before
  // advancing the flow.
  extinguish(delay = 0) {
    if (!this.lit) return Promise.resolve();

    this.lit = false;

    const smoke = new ParticleSystem({
      count: this.smokeConfig.count,
      color: this.smokeConfig.color,
      size: this.smokeConfig.size,
      spread: this.smokeConfig.spread,
    });

    smoke.addTo(this.object3D);

    return new Promise((resolve) => {
      gsap.to(this.cone.scale, {
        x: 0.001,
        y: 0.001,
        z: 0.001,
        duration: this.candlesConfig.extinguishDuration,
        delay,
        ease: "power2.in",
      });

      gsap.to(this.glow.material, {
        opacity: 0,
        duration: this.candlesConfig.glowFadeDuration,
        delay,
        onComplete: () => {
          smoke.burst(new THREE.Vector3(0, 0.06, 0), {
            force: this.smokeConfig.force,
            duration: this.smokeConfig.duration,
            onComplete: () => {
              this.object3D.remove(smoke.points);
              smoke.dispose();
              resolve();
            },
          });
        },
      });
    });
  }

  dispose() {
    this.cone.geometry.dispose();
    this.cone.material.dispose();
    this.glow.dispose();
  }
}
