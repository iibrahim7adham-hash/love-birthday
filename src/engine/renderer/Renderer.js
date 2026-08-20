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

    // On a high-DPI desktop/laptop screen, MSAA on top of an already
    // 1.5x-2x framebuffer is redundant GPU work — the pixel density
    // itself already smooths edges, so we skip antialias there to
    // avoid stacking two overdraw-multiplying costs.
    const isHighDPIDesktop =
      this.performance.device?.isDesktop && this.sizes.pixelRatio > 1;

    // "default" lets the browser pick the GPU on hybrid-graphics laptops
    // (NVIDIA Optimus / AMD switchable graphics), and it very often picks
    // the low-power integrated chip over the discrete one — the actual
    // cause of choppy frames on a lot of laptops regardless of measured
    // performance tier. Requesting "high-performance" on any
    // desktop/laptop-width viewport nudges that choice toward the
    // discrete GPU when one exists; mobile stays on "default" since
    // there's no discrete GPU to gain from and battery matters more there.
    const isDesktop = this.performance.device?.isDesktop;

    this.instance = new WebGLRenderer({
      canvas: this.canvas,
      antialias: !this.performance.isLow() && !isHighDPIDesktop,
      alpha: Config.renderer.alpha,
      powerPreference:
        isDesktop || this.performance.isUltra() ? "high-performance" : "default",
    });

    this.instance.outputColorSpace = SRGBColorSpace;

    this.instance.setSize(this.sizes.width, this.sizes.height);

    this.updatePixelRatio();
  }

  updatePixelRatio() {
    let pixelRatio = this.sizes.pixelRatio;
    const isDesktop = this.performance.device?.isDesktop;

    if (this.performance.isLow()) {
      pixelRatio = Math.min(pixelRatio, 1);
    } else if (this.performance.isMedium()) {
      pixelRatio = Math.min(pixelRatio, 1.5);
    } else if (isDesktop) {
      // Measured render time on desktop was ~20ms/frame (over the 16.7ms
      // 60fps budget) with update time near-zero — confirmed GPU/fill-rate
      // bound, not CPU-bound. Capping to 1.0x (down from 1.5x) cuts the
      // framebuffer's fragment work by another ~55% on a 1.5x-DPI laptop
      // screen, which is where that render time was going.
      pixelRatio = Math.min(pixelRatio, 1.0);
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
