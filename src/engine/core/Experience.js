import Config from "./Config";
import Sizes from "./Sizes";
import Time from "./Time";
import Device from "./Device";
import Performance from "./Performance";
import Transition from "./Transition";
import { PerfPhase } from "./PerfPhase"; // TEMP PROFILING — remove with PerfPhase.js

import SceneManager from "../scene";
import Camera from "../camera";
import Renderer from "../renderer";
import World from "../world";
import Lights from "../lights";
import AudioManager from "../audio";

import LoveScene from "../../templates/birthday/love";
import LuxuryScene from "../../templates/birthday/luxury/Scene";
import StandardScene from "../../templates/birthday/standard";
import BoomScene from "../../templates/birthday/boom";
import HyateiScene from "../../templates/birthday/hyatei";
import AliMuneerScene from "../../templates/engagement/ali-muneer";

// Which template runs is chosen at build/dev time via `--mode` (see
// package.json's dev:luxury / dev:love / dev:standard scripts and the
// matching .env.luxury / .env.love / .env.standard files) instead of
// editing this file by hand every time you switch templates. No
// VITE_TEMPLATE set (e.g. the plain `npm run dev`) falls back to
// luxury, the current default.
const TEMPLATES = {
  luxury: LuxuryScene,
  love: LoveScene,
  standard: StandardScene,
  boom: BoomScene,
  hyatei: HyateiScene,
  "ali-muneer": AliMuneerScene,
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
    // TEMP PROFILING — everything below the `this.camera.update()` line
    // down to the closing brace is instrumentation only; the three real
    // calls (camera.update / world.update / renderer.render) are
    // unchanged, just timed. Delete this whole block (and PerfPhase.js,
    // and the setPhase() call sites in GiftBox.js/Letter.js) once done —
    // see the import above.
    const t0 = performance.now();
    this.camera.update();

    this.world.update(this.time.delta);
    const t1 = performance.now();

    this.renderer.render(this.scene.instance, this.camera.instance);
    const t2 = performance.now();

    const frameMs = t2 - t0;
    if (frameMs > 16.7) {
      const info = this.renderer.instance.info;
      console.log(
        `[PERF]\n` +
          `phase: ${PerfPhase.current}\n` +
          `frame: ${frameMs.toFixed(1)}ms\n` +
          `update: ${(t1 - t0).toFixed(1)}ms\n` +
          `render: ${(t2 - t1).toFixed(1)}ms\n` +
          `calls: ${info.render.calls}\n` +
          `triangles: ${info.render.triangles.toLocaleString()}\n` +
          `textures: ${info.memory.textures}\n` +
          `geometries: ${info.memory.geometries}`,
      );
    }
    // END TEMP PROFILING
  }

  destroy() {
    this.world.destroy();
    this.audio.destroy();
  }
}
