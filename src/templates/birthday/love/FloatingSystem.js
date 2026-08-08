import * as THREE from "three";

// ===========================
// A generic engine for continuously-spawning, drifting, rotating,
// fading decorative sprites — petals, floating hearts, embers, or
// anything else that behaves like "things gently wafting through the
// scene". It owns spawning, lifetime, drift, rotation, fade, and the
// per-frame update; it has no idea what texture it's drawing or what
// the caller calls the result. Every visual/spawn choice comes in
// through the options object at construction — this is the one place
// the shared motion language lives, so every floating object in the
// scene moves the same way by construction, never by each one
// reimplementing it.
// ===========================

function randomInRange([min, max]) {
  return THREE.MathUtils.randFloat(min, max);
}

function randomFromBounds(bounds) {
  return {
    x: randomInRange(bounds.x),
    y: randomInRange(bounds.y),
    z: randomInRange(bounds.z),
  };
}

// Fades in over `fadeInDuration`, holds, then fades out over the last
// `fadeOutDuration` of its life — the shared "appear gently, vanish
// gently" envelope every item's opacity follows.
function fadeEnvelope(age, lifetime, fadeInDuration, fadeOutDuration) {
  if (age < fadeInDuration) return age / fadeInDuration;

  const fadeOutStart = lifetime - fadeOutDuration;

  if (age > fadeOutStart) {
    return Math.max(0, (lifetime - age) / fadeOutDuration);
  }

  return 1;
}

export default class FloatingSystem {
  constructor(count, options) {
    this.options = options;
    this.group = new THREE.Group();

    this.items = [];

    for (let i = 0; i < count; i++) {
      this.items.push(this.createItem());
    }
  }

  createItem() {
    const { texture, color, sizeRange } = this.options;

    const material = new THREE.SpriteMaterial({
      map: texture,
      color: new THREE.Color(color),
      transparent: true,
      depthWrite: false,
      opacity: 0,
    });

    const sprite = new THREE.Sprite(material);
    const size = randomInRange(sizeRange);

    sprite.scale.set(size, size, 1);

    this.group.add(sprite);

    const item = { sprite };

    this.resetItem(item);

    return item;
  }

  // Re-rolls an item's spawn position, drift, rotation, wobble, and
  // lifetime — used both for the initial spawn and every respawn once
  // an item's life ends, so an item never needs to be destroyed and
  // recreated to keep the effect going indefinitely.
  resetItem(item) {
    const {
      spawnBounds,
      driftVelocity,
      wobbleAmountRange,
      wobbleSpeedRange,
      rotationSpeedRange,
      lifetimeRange,
      baseAlphaRange,
    } = this.options;

    item.basePosition = randomFromBounds(spawnBounds);
    item.velocity = randomFromBounds(driftVelocity);

    item.wobbleAmount = randomInRange(wobbleAmountRange);
    item.wobbleSpeed = randomInRange(wobbleSpeedRange);
    item.wobblePhase = Math.random() * Math.PI * 2;

    item.rotationSpeed = randomInRange(rotationSpeedRange);
    item.baseRotation = Math.random() * Math.PI * 2;

    item.lifetime = randomInRange(lifetimeRange);
    item.baseAlpha = randomInRange(baseAlphaRange);
    item.age = 0;

    item.sprite.position.set(
      item.basePosition.x,
      item.basePosition.y,
      item.basePosition.z,
    );
    item.sprite.material.rotation = item.baseRotation;
    item.sprite.material.opacity = 0;
  }

  update(delta) {
    const { fadeInDuration, fadeOutDuration } = this.options;

    this.items.forEach((item) => {
      item.age += delta;

      if (item.age >= item.lifetime) {
        this.resetItem(item);
        return;
      }

      // Position/rotation are computed directly from age rather than
      // accumulated frame-over-frame, so there's no drift/rounding
      // error over a long-lived, continuously-recycled item.
      const wobble =
        Math.sin(item.age * item.wobbleSpeed + item.wobblePhase) *
        item.wobbleAmount;

      item.sprite.position.set(
        item.basePosition.x + item.velocity.x * item.age + wobble,
        item.basePosition.y + item.velocity.y * item.age,
        item.basePosition.z + item.velocity.z * item.age,
      );

      item.sprite.material.rotation =
        item.baseRotation + item.rotationSpeed * item.age;

      const envelope = fadeEnvelope(
        item.age,
        item.lifetime,
        fadeInDuration,
        fadeOutDuration,
      );

      item.sprite.material.opacity = envelope * item.baseAlpha;
    });
  }

  // Disposes what this system created (each item's own material) —
  // not the shared texture, which the caller supplied and owns.
  destroy() {
    this.items.forEach((item) => item.sprite.material.dispose());
  }
}
