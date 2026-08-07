export default class Device {
  constructor() {
    this.update();

    window.addEventListener("resize", () => this.update());
  }

  update() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

    this.isMobile = this.width < 768;

    this.isTablet = this.width >= 768 && this.width < 1024;

    this.isDesktop = this.width >= 1024;

    this.pixelRatio = Math.min(window.devicePixelRatio, 2);
  }
}
