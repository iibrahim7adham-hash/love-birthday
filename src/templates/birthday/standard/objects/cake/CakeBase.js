import * as THREE from "three";

import CakeLayer from "./CakeLayer";
import CakeFrosting from "./CakeFrosting";

// Composes N CakeLayer tiers (narrowing as they go up) plus a
// CakeFrosting ring on top into one assembled cake. Takes the whole
// content/config/cake.js object directly — layer count, colors,
// dimensions and every build-in duration all live there, so this class
// never needs editing to change how the cake looks or how long it takes
// to build. CakeBuildScene is what talks to this — it doesn't know or
// care how many layers there are, only that `build()` resolves once the
// whole thing is done.
export default class CakeBase {
  constructor(config) {
    this.config = config;
    this.group = new THREE.Group();
    this.layers = [];

    let y = 0;

    for (let i = 0; i < config.layerCount; i++) {
      const radius = config.baseRadius - i * config.layerTaper;

      const layer = new CakeLayer({
        radius,
        height: config.layerHeight,
        color: config.layerColors[i % config.layerColors.length],
        y: y + config.layerHeight / 2,
        buildDuration: config.layerBuildDuration,
      });

      layer.addTo(this.group);
      this.layers.push(layer);

      y += config.layerHeight;
    }

    // Top surface Y — CakeBuildScene uses this to place candles once
    // build() resolves.
    this.topY = y;

    this.frosting = new CakeFrosting({
      radius: config.baseRadius - (config.layerCount - 1) * config.layerTaper,
      y: this.topY,
      color: config.frostingColor,
      buildDuration: config.frostingBuildDuration,
    }).addTo(this.group);
  }

  addTo(scene) {
    scene.add(this.group);

    return this;
  }

  // Builds every layer bottom-up (staggered) then the top frosting.
  // Resolving only once all of that has finished is what lets
  // CakeBuildScene honor "candles appear only after the cake is complete".
  async build() {
    await Promise.all(
      this.layers.map((layer, i) =>
        layer.buildIn(i * this.config.layerStagger),
      ),
    );

    await this.frosting.buildIn(this.config.frostingDelay);
  }

  dispose() {
    this.layers.forEach((layer) => layer.dispose());
    this.frosting.dispose();
  }
}
