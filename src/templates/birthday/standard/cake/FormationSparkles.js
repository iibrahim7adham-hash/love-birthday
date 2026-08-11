import * as THREE from "three";
import gsap from "gsap";

import {
  SPARKLE_BURST_COUNT,
  SPARKLE_BURST_RADIUS,
  SPARKLE_BURST_DURATION,
  SPARKLE_COLOR,
} from "./CakeConstants";

// A soft radial gradient sprite texture, built once and shared by every
// burst — the same "cache a canvas gradient, reuse the map" technique
// love/Utils.js's own createGlowTexture already uses, just kept local
// to this file rather than cross-imported from another template's own
// folder (this project never imports one template's files into
// another's — see e.g. how Love/Luxury/Standard each build their own
// small canvas textures independently).
let sharedTexture = null;

function getSparkleTexture() {
  if (sharedTexture) return sharedTexture;

  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  sharedTexture = new THREE.CanvasTexture(canvas);
  return sharedTexture;
}

// The "small glowing particles converge into the shape" accompaniment
// to each cake part's own entrance (see CakeReveal.js's call sites) —
// a handful of small additive sprites scattered around a target point,
// which shrink/converge inward while fading in, then fade back out.
// Deliberately a one-shot burst, not a continuous particle system: each
// call creates a small THREE.Group, animates it, and disposes itself
// when done — nothing here persists between bursts except the shared
// texture above (cached, never re-created).
export default class FormationSparkles {
  constructor(scene) {
    this.scene = scene;
    this._active = new Set();
  }

  // `position` is the world-space point the sparkles converge toward.
  // Fully independent of whatever solid mesh is entering at the same
  // point — this never touches cake geometry directly, it only needs a
  // coordinate.
  burst(position, { count = SPARKLE_BURST_COUNT, color = SPARKLE_COLOR } = {}) {
    const group = new THREE.Group();
    group.position.copy(position);
    this.scene.add(group);

    const material = new THREE.SpriteMaterial({
      map: getSparkleTexture(),
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const sprites = [];

    for (let i = 0; i < count; i++) {
      const sprite = new THREE.Sprite(material.clone());
      const offset = new THREE.Vector3(
        THREE.MathUtils.randFloatSpread(2),
        THREE.MathUtils.randFloatSpread(2),
        THREE.MathUtils.randFloatSpread(2),
      )
        .normalize()
        .multiplyScalar(SPARKLE_BURST_RADIUS * THREE.MathUtils.randFloat(0.5, 1));

      sprite.position.copy(offset);
      sprite.scale.setScalar(THREE.MathUtils.randFloat(0.05, 0.1));

      group.add(sprite);
      sprites.push({ sprite, offset });
    }

    const tl = gsap.timeline({
      onComplete: () => {
        this._active.delete(entry);
        sprites.forEach(({ sprite }) => sprite.material.dispose());
        material.dispose();
        this.scene.remove(group);
      },
    });

    const entry = { group, tl };
    this._active.add(entry);

    sprites.forEach(({ sprite }) => {
      // Converge toward the group's own local origin (i.e. toward
      // `position` in world space) while fading in, then fade out —
      // "arriving from the atmosphere" rather than just popping.
      tl.to(
        sprite.position,
        { x: 0, y: 0, z: 0, duration: SPARKLE_BURST_DURATION, ease: "power2.out" },
        0,
      );
      tl.to(
        sprite.material,
        {
          opacity: 0.9,
          duration: SPARKLE_BURST_DURATION * 0.4,
          ease: "power1.out",
        },
        0,
      );
      tl.to(
        sprite.material,
        {
          opacity: 0,
          duration: SPARKLE_BURST_DURATION * 0.6,
          ease: "power1.in",
        },
        SPARKLE_BURST_DURATION * 0.4,
      );
    });

    return tl;
  }

  // Kills every still-running burst immediately — used by CakeReveal's
  // own destroy() so no sparkle tween/callback can fire after teardown.
  // Kills each burst's own timeline directly (not just the tweens it
  // contains) so its onComplete can never fire afterward and
  // double-dispose/double-remove an already-cleaned-up group.
  destroy() {
    this._active.forEach(({ group, tl }) => {
      tl.kill();
      group.children.forEach((sprite) => sprite.material.dispose());
      this.scene.remove(group);
    });
    this._active.clear();
  }
}
