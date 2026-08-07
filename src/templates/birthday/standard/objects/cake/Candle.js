import * as THREE from "three";

import CandleFlame from "./CandleFlame";

// A single candle: stick geometry + the flame it owns. CakeBuildScene
// creates one of these per content/config/candles.js's `count`,
// positioned in a ring on the cake's top surface, only after the cake
// itself has finished building. Height, stick color and every flame
// property come from `candlesConfig`.
export default class Candle {
  constructor({ x = 0, y = 0, z = 0, candlesConfig, smokeConfig }) {
    this.group = new THREE.Group();
    this.group.position.set(x, y, z);

    const height = candlesConfig.height;

    this.stick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, height, 12),
      new THREE.MeshStandardMaterial({ color: candlesConfig.stickColor }),
    );
    this.stick.position.y = height / 2;
    this.group.add(this.stick);

    this.flame = new CandleFlame(candlesConfig, smokeConfig);
    this.flame.object3D.position.y = height + 0.08;
    this.group.add(this.flame.object3D);
  }

  addTo(group) {
    group.add(this.group);

    return this;
  }

  update(delta) {
    this.flame.update(delta);
  }

  extinguish(delay = 0) {
    return this.flame.extinguish(delay);
  }

  dispose() {
    this.stick.geometry.dispose();
    this.stick.material.dispose();
    this.flame.dispose();
  }
}
