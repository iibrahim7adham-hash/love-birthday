export default class Performance {
  constructor(device) {
    this.device = device;

    this.level = "medium";

    this.detect();

    this.startBenchmark();
  }

  detect() {
    const memory = navigator.deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;

    if (memory >= 8 && cores >= 8) {
      this.level = "ultra";
    } else if (memory >= 6 && cores >= 6) {
      this.level = "high";
    } else if (memory <= 2 || cores <= 2) {
      this.level = "low";
    }

    console.log("Initial:", this.level);
  }

  startBenchmark() {
    let frames = 0;
    const start = performance.now();

    const loop = () => {
      frames++;

      const elapsed = performance.now() - start;

      if (elapsed < 1000) {
        requestAnimationFrame(loop);
        return;
      }

      const fps = Math.round(frames / (elapsed / 1000));

      if (fps >= 100) {
        this.level = "ultra";
      } else if (fps >= 70) {
        this.level = "high";
      } else if (fps >= 45) {
        this.level = "medium";
      } else {
        this.level = "low";
      }

      console.log("FPS:", fps);
      console.log("Performance:", this.level);
    };

    requestAnimationFrame(loop);
  }

  isUltra() {
    return this.level === "ultra";
  }

  isHigh() {
    return this.level === "high";
  }

  isMedium() {
    return this.level === "medium";
  }

  isLow() {
    return this.level === "low";
  }
}
