import { WebGLRenderer, SRGBColorSpace } from "three";
import Config from "../core/Config";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { Vector2 } from "three";

export default class Renderer {
  constructor(canvas, sizes, performance) {
    this.canvas = canvas;
    this.sizes = sizes;
    this.performance = performance;

    this.instance = new WebGLRenderer({
      canvas: this.canvas,
      antialias: !this.performance.isLow(),
      alpha: Config.renderer.alpha,
      powerPreference: this.performance.isUltra()
        ? "high-performance"
        : "default",
    });

    this.instance.outputColorSpace = SRGBColorSpace;

    this.instance.setSize(this.sizes.width, this.sizes.height);

    this.updatePixelRatio();
  }

  updatePixelRatio() {
    let pixelRatio = this.sizes.pixelRatio;

    if (this.performance.isLow()) {
      pixelRatio = Math.min(pixelRatio, 1);
    } else if (this.performance.isMedium()) {
      pixelRatio = Math.min(pixelRatio, 1.5);
    } else {
      pixelRatio = Math.min(pixelRatio, 2);
    }

    this.instance.setPixelRatio(pixelRatio);
  }

  resize() {
    this.instance.setSize(this.sizes.width, this.sizes.height);

    this.updatePixelRatio();
  }

  render(scene, camera) {
    this.instance.render(scene, camera);
  }

  destroy() {
    this.instance.dispose();
  }
}
