import Config from "./Config";
import Sizes from "./Sizes";
import Time from "./Time";
import Device from "./Device";
import Performance from "./Performance";
import Transition from "./Transition";

import SceneManager from "../scene";
import Camera from "../camera";
import Renderer from "../renderer";
import World from "../world";
import Lights from "../lights";
import AudioManager from "../audio";

import LoveScene from "../../templates/birthday/love";
import LuxuryScene from "../../templates/birthday/luxury/Scene";
import StandardScene from "../../templates/birthday/standard/Scene";

// Which template runs is chosen at build/dev time via `--mode` (see
// package.json's dev:luxury / dev:standard / dev:love scripts and the
// matching .env.luxury / .env.standard / .env.love files) instead of
// editing this file by hand every time you switch templates. No
// VITE_TEMPLATE set (e.g. the plain `npm run dev`) falls back to
// luxury, the current default.
const TEMPLATES = {
  luxury: LuxuryScene,
  standard: StandardScene,
  love: LoveScene,
};

let instance = null;

export default class Experience {
  constructor(canvas) {
    if (instance) return instance;

    instance = this;

    this.canvas = canvas;

    this.config = Config;

    this.sizes = new Sizes();
    this.time = new Time();

    this.device = new Device();
    this.performance = new Performance(this.device);
    this.transition = new Transition(this);

    this.init();

    this.sizes.onResize = () => this.resize();
    this.time.onTick = () => this.update();
  }

  init() {
    this.scene = new SceneManager();

    this.camera = new Camera(this.sizes);

    this.scene.add(this.camera.instance);

    this.lights = new Lights(this.scene);

    this.world = new World(this.scene);

    this.audio = new AudioManager();

    const TemplateScene =
      TEMPLATES[import.meta.env.VITE_TEMPLATE] || LuxuryScene;

    this.template = new TemplateScene(this);

    this.world.setScene(this.template);

    this.renderer = new Renderer(this.canvas, this.sizes, this.performance);
  }

  resize() {
    this.device.update();

    this.camera.resize();

    this.renderer.resize();
  }

  update() {
    this.camera.update();

    this.world.update(this.time.delta);

    this.renderer.render(this.scene.instance, this.camera.instance);
  }

  destroy() {
    this.world.destroy();
    this.audio.destroy();
  }
}
