import * as THREE from "three";
import gsap from "gsap";

import HeartField from "./HeartField";
import { getDotTexture } from "./HeartTextures";
import { BOMB_CENTER_X, BOMB_Y } from "../bomb/BombConstants";
import {
  BACKGROUND_STOPS,
  BACKGROUND_TRANSITION_DURATION,
  FLASH_START_SIZE,
  FLASH_PEAK_SIZE,
  FLASH_GROW_DURATION,
  FLASH_FADE_DURATION,
  FLASH_PEAK_OPACITY,
} from "./HeartBurstConstants";

// Part 2's entire visual surface: the instant bomb -> heart-cluster
// swap, the bright flash, the background deepening from Part 1's own
// pale pink into a dusty wine, and the dense heart field this settles
// into (see HeartField.js for the particles themselves — this file
// only owns the flash glow and the background, and orchestrates when
// everything starts). Mirrors standard/cake/CakeReveal.js's own role:
// one place that owns the sequence, delegating the actually-complex
// per-instance particle system to its own file.
//
// Deliberately independent of BombIntro — BoomScene.js polls
// BombIntro's own readyForExplosion flag and calls this class's
// ignite() once, the only coupling between the two systems (see
// BoomScene.js). Stops once the heart field has settled; the romantic
// text this eventually hands off to is a separate system, not built
// here.
export default class HeartBurst {
  constructor({ scene, camera, audio }) {
    this.scene = scene;
    this.camera = camera;
    this.audio = audio;

    this.heartField = new HeartField(scene, camera);

    this._backgroundCanvas = document.createElement("canvas");
    this._backgroundCanvas.width = 256;
    this._backgroundCanvas.height = 256;
    this._backgroundCtx = this._backgroundCanvas.getContext("2d");
    // One GPU texture, redrawn+reuploaded in place every frame via
    // needsUpdate (see _applyBackground() below) instead of a fresh
    // dispose()+`new THREE.CanvasTexture()` per frame — recreating the
    // WebGLTexture ~34 times over BACKGROUND_TRANSITION_DURATION was
    // real per-frame GPU allocation work landing right on the
    // heart-burst ignition, the actual cause of this scene's stutter.
    this._backgroundTexture = new THREE.CanvasTexture(this._backgroundCanvas);

    // A plain soft round glow (getDotTexture(), not the bomb's own
    // 4-ray spark texture) — the reference's own bloom right after the
    // swap is a soft radial brightening, not a starburst/cross-flare,
    // and the spark texture's rays would stretch into long visible
    // streaks at the scale this needs to grow to.
    this.flash = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: getDotTexture(), color: "#fff6ea", transparent: true, opacity: 0, depthWrite: false }),
    );
    this.flash.position.set(BOMB_CENTER_X, BOMB_Y, 0.05);
    this.flash.scale.set(FLASH_START_SIZE, FLASH_START_SIZE, 1);
    this.flash.visible = false;
    this.scene.add(this.flash);

    this._ignited = false;
  }

  // `bomb` is BombIntro's own already-built character (see
  // bomb/BombGeometry.js's buildBomb() return shape) — hidden here,
  // the instant the burst starts, rather than inside BombIntro.js
  // itself (which stays untouched/locked). The reference shows the
  // bomb completely replaced by the heart cluster with no morph/fade
  // step, so this is a hard visibility flip, not a tween.
  ignite(bomb) {
    if (this._ignited) return;
    this._ignited = true;

    bomb.bombGroup.visible = false;
    bomb.shadow.visible = false;

    this.audio.trigger("boom:explosion");

    this.heartField.ignite();

    this.flash.visible = true;
    const tl = gsap.timeline();
    this._flashTimeline = tl;
    tl.fromTo(
      this.flash.material,
      { opacity: 0 },
      { opacity: FLASH_PEAK_OPACITY, duration: FLASH_GROW_DURATION * 0.4, ease: "power1.out" },
    );
    tl.to(this.flash.material, { opacity: 0, duration: FLASH_FADE_DURATION, ease: "power1.in" });
    tl.to(this.flash.scale, { x: FLASH_PEAK_SIZE, y: FLASH_PEAK_SIZE, duration: FLASH_GROW_DURATION + FLASH_FADE_DURATION, ease: "power2.out" }, 0);

    this._backgroundElapsed = 0;
  }

  // Regenerates the (small) radial-gradient background texture from
  // the current lerped color stop — the same "cache a canvas drawing,
  // reuse the map" idea BoomScene.js's own Part 1 background uses,
  // just re-run a limited number of times across a brief transition
  // instead of once, since the colors themselves are animating. Cheap
  // at this resolution for the ~0.5s this actually runs.
  _applyBackground(t) {
    let lower = BACKGROUND_STOPS[0];
    let upper = BACKGROUND_STOPS[BACKGROUND_STOPS.length - 1];
    for (let i = 0; i < BACKGROUND_STOPS.length - 1; i++) {
      if (t >= BACKGROUND_STOPS[i].t && t <= BACKGROUND_STOPS[i + 1].t) {
        lower = BACKGROUND_STOPS[i];
        upper = BACKGROUND_STOPS[i + 1];
        break;
      }
    }
    const span = upper.t - lower.t || 1;
    const localT = THREE.MathUtils.clamp((t - lower.t) / span, 0, 1);

    const center = new THREE.Color(lower.center).lerp(new THREE.Color(upper.center), localT);
    const edge = new THREE.Color(lower.edge).lerp(new THREE.Color(upper.edge), localT);

    const size = this._backgroundCanvas.width;
    const ctx = this._backgroundCtx;
    // A tighter outer radius than the canvas's own half-width — reaches
    // the darker edge tone well before the true corner, so a wide
    // desktop viewport (which stretches this square gradient into a
    // wide ellipse) still reads as clearly deepening/vignetting rather
    // than staying mostly in the lighter center tone the way the exact
    // half-width radius did.
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.42);
    gradient.addColorStop(0, `#${center.getHexString()}`);
    gradient.addColorStop(1, `#${edge.getHexString()}`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    this._backgroundTexture.needsUpdate = true;
    if (this.scene.background !== this._backgroundTexture) {
      this.scene.background = this._backgroundTexture;
    }
  }

  update(delta) {
    if (!this._ignited) return;

    this.heartField.update(delta);

    if (this._backgroundElapsed <= BACKGROUND_TRANSITION_DURATION) {
      this._backgroundElapsed += delta;
      const t = THREE.MathUtils.clamp(this._backgroundElapsed / BACKGROUND_TRANSITION_DURATION, 0, 1);
      this._applyBackground(t);
    }
  }

  destroy() {
    if (this._flashTimeline) this._flashTimeline.kill();
    gsap.killTweensOf([this.flash.material, this.flash.scale]);

    this.heartField.destroy();

    this.flash.material.dispose();
    this.scene.remove(this.flash);

    if (this._backgroundTexture) this._backgroundTexture.dispose();
  }
}
