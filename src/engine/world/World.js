export default class World {
  constructor(scene) {
    this.scene = scene;

    this.activeScene = null;
  }

  setScene(scene) {
    this.activeScene = scene;
  }

  update(delta) {
    if (this.activeScene && this.activeScene.update) {
      this.activeScene.update(delta);
    }
  }

  destroy() {
    if (this.activeScene && this.activeScene.destroy) {
      this.activeScene.destroy();
    }
  }
}
