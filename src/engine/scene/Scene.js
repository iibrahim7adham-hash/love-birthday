import { Scene, Color } from "three";

export default class SceneManager {
  constructor() {
    this.instance = new Scene();

    this.instance.background = new Color("#111111");
  }

  add(...objects) {
    this.instance.add(...objects);
  }

  remove(...objects) {
    this.instance.remove(...objects);
  }
}
