import * as THREE from "three";

import Balloon from "./Balloon";
import Firework from "./Firework";
import FloatingText from "./FloatingText";
import ParticleSystem from "../../components/ParticleSystem";

// Owns every decoration Scene 4 (Celebration) spawns — balloons, the
// floating birthday text, ambient dust, and periodic fireworks — all
// driven by content/config/celebration.js (`config`) plus
// content/config/theme.js (`theme`) for the floating text's font/color,
// and the already-resolved message string (`floatingText`, built from
// content/messages.js's birthdayMessages).
//
// Pulled out into its own object (rather than living inside
// CelebrationScene) because this atmosphere needs to keep animating
// through BlowCandlesScene too — the user should still see balloons and
// fireworks while blowing out the candles. Both scenes just call
// `update()` on whichever instance `context.atmosphere` holds instead of
// duplicating the spawn/update logic in two places.
export default class CelebrationAtmosphere {
  constructor(scene, { topY = 2, config, theme, floatingText }) {
    this.scene = scene;
    this.config = config;
    this.theme = theme;

    this.group = new THREE.Group();
    scene.add(this.group);

    this.balloons = [];
    this.fireworks = [];
    this.fireworkTimer = 0;

    this.buildBalloons();
    this.buildFloatingText(topY, floatingText);
    this.buildAmbientDust();
  }

  buildBalloons() {
    const {
      balloonCount,
      balloonColors,
      balloonAppearDuration,
      balloonAppearStagger,
      balloonMotion,
    } = this.config;

    for (let i = 0; i < balloonCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = THREE.MathUtils.randFloat(1.8, 3.2);
      const color =
        balloonColors[Math.floor(Math.random() * balloonColors.length)];

      const balloon = new Balloon({
        x: Math.cos(angle) * radius,
        y: THREE.MathUtils.randFloat(1.5, 3),
        z: Math.sin(angle) * radius,
        color,
        motion: balloonMotion,
      }).addTo(this.group);

      balloon.appear(i * balloonAppearStagger, balloonAppearDuration);

      this.balloons.push(balloon);
    }
  }

  buildFloatingText(topY, text) {
    this.floatingText = new FloatingText(text, {
      x: 0,
      y: topY + 1.6,
      z: 0,
      color: this.theme.textColor,
      fontFamily: this.theme.fontFamily,
      motion: this.config.floatingTextMotion,
    }).addTo(this.group);
  }

  buildAmbientDust() {
    const { count, color, size, spread } = this.config.ambientDust;

    this.ambientDust = new ParticleSystem({ count, color, size, spread }).addTo(
      this.group,
    );
  }

  update(delta) {
    this.balloons.forEach((balloon) => balloon.update(delta));
    this.floatingText.update(delta);
    this.ambientDust.update(delta);

    this.fireworkTimer += delta;

    if (this.fireworkTimer >= this.config.fireworks.interval) {
      this.fireworkTimer = 0;
      this.spawnFirework();
    }

    this.fireworks = this.fireworks.filter((firework) => {
      firework.update(delta);
      return !firework.disposed;
    });
  }

  spawnFirework() {
    const origin = new THREE.Vector3(
      THREE.MathUtils.randFloatSpread(4),
      THREE.MathUtils.randFloat(3, 5),
      THREE.MathUtils.randFloatSpread(4),
    );

    this.fireworks.push(new Firework(this.scene, origin, this.config.fireworks));
  }

  dispose() {
    this.balloons.forEach((balloon) => balloon.dispose());
    this.floatingText.dispose();
    this.ambientDust.dispose();
    this.fireworks.forEach((firework) => firework.dispose());

    this.scene.remove(this.group);
  }
}
