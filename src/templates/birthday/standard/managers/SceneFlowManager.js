// Orchestrates the template's 7 acts as a simple state machine: exactly
// one scene is "active" at a time, and moving between them always goes
// through exit() -> enter() so every scene can rely on that lifecycle
// instead of reaching into whichever scene came before or after it.
//
// `order` is content/config/flow.js's scene sequence — it's what makes
// goToNext() work without any scene hardcoding the name of whichever
// one follows it, so reordering the reel is a config change, not a code
// change.
export default class SceneFlowManager {
  constructor(order = []) {
    this.order = order;
    this.scenes = new Map();
    this.active = null;
    this.activeName = null;
  }

  register(name, scene) {
    this.scenes.set(name, scene);
  }

  goTo(name) {
    const next = this.scenes.get(name);

    if (!next) {
      console.warn(`SceneFlowManager: no scene registered as "${name}"`);
      return;
    }

    if (this.active && this.active.exit) {
      this.active.exit();
    }

    this.active = next;
    this.activeName = name;

    if (this.active.enter) {
      this.active.enter();
    }
  }

  goToNext() {
    const index = this.order.indexOf(this.activeName);
    const next = this.order[index + 1];

    if (next) {
      this.goTo(next);
    } else {
      console.warn("SceneFlowManager: no scene follows", this.activeName);
    }
  }

  update(delta) {
    if (this.active && this.active.update) {
      this.active.update(delta);
    }
  }

  destroy() {
    this.scenes.forEach((scene) => {
      if (scene.destroy) scene.destroy();
    });

    this.scenes.clear();
    this.active = null;
  }
}
