// Base class every act (Intro, Countdown, CakeBuild, ...) extends.
// SceneFlowManager only ever calls enter()/exit()/update()/destroy() on
// whatever scene is currently registered as active, so these no-op
// defaults mean a scene only has to implement the lifecycle hooks it
// actually needs instead of stubbing out the rest.
//
// `context` is the shared object StandardScene builds once and passes to
// every scene — it's how scenes reach the THREE.Scene/camera, the
// managers, content config, and persistent cross-scene state like
// `context.cake` (see CakeBuildScene) without importing each other.
export default class BaseScene {
  constructor(context) {
    this.context = context;
  }

  enter() {}

  exit() {}

  update(_delta) {}

  destroy() {
    this.exit();
  }
}
