export default class Sizes {
  constructor() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.pixelRatio = Math.min(window.devicePixelRatio, 2);

    this._resizeScheduled = false;

    // Mobile browsers can fire several "resize" events in quick
    // succession (address-bar show/hide, elastic scroll, pinch) —
    // without this, each one triggers a full
    // renderer.setSize()/setPixelRatio() (a real WebGL framebuffer
    // reallocation, not cheap) on Experience's own resize(), which can
    // visibly hitch an in-progress animation if it happens to land
    // mid-burst. Coalescing to at most one actual resize per animation
    // frame keeps the same end result (final width/height/pixelRatio
    // are always read fresh when the rAF callback runs) without the
    // redundant work.
    window.addEventListener("resize", () => {
      if (this._resizeScheduled) return;
      this._resizeScheduled = true;

      requestAnimationFrame(() => {
        this._resizeScheduled = false;

        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.pixelRatio = Math.min(window.devicePixelRatio, 2);

        if (this.onResize) {
          this.onResize();
        }
      });
    });
  }
}
