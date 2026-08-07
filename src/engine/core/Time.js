export default class Time {
  constructor() {
    this.start = performance.now();
    this.current = this.start;
    this.elapsed = 0;
    this.delta = 0;

    this.update();
  }

  update() {
    const now = performance.now();

    this.delta = (now - this.current) / 1000;
    this.elapsed = (now - this.start) / 1000;
    this.current = now;

    if (this.onTick) {
      this.onTick();
    }

    requestAnimationFrame(() => this.update());
  }
}
