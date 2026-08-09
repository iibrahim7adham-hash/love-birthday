import * as THREE from "three";

import {
  MESSAGE_DEPTH_MAX_BRIGHTNESS,
  MESSAGE_DEPTH_MIN_BRIGHTNESS,
  MESSAGE_FADE_OUT_DISTANCE,
  MESSAGE_FADE_OUT_Y,
  MESSAGE_FALL_SPEED_RANGE,
  MESSAGE_FLOAT_AMOUNT_RANGE,
  MESSAGE_FLOAT_SPEED_RANGE,
  MESSAGE_FONT_SIZE,
  MESSAGE_HEIGHT,
  MESSAGE_POOL_SIZE,
  MESSAGE_SPAWN_X_RANGE,
  MESSAGE_SPAWN_Y_RANGE,
  MESSAGE_SPAWN_Z_RANGE,
  MESSAGE_START_DELAY,
  MESSAGE_STREAK_COLOR,
  MESSAGE_STREAK_HEIGHT_RANGE,
  MESSAGE_STREAK_OPACITY_FACTOR,
  MESSAGE_STREAK_WIDTH,
  MESSAGE_TEXTS,
  MESSAGE_WOBBLE_AMOUNT_RANGE,
  MESSAGE_WOBBLE_SPEED_RANGE,
  MESSAGE_X_SLOT_JITTER_FRACTION,
} from "./Constants";

// A completely separate, self-contained system — a continuous rain of
// glowing birthday wishes falling through the sky, entirely independent
// of the heart/orbit/petal/star systems already in the scene. It owns
// everything about itself: text-texture creation (once per unique
// sentence, cached and reused — see the constructor), object pooling,
// spawning, movement, fading, and recycling. Nothing outside this file
// knows a "message" exists.

function randomInRange([min, max]) {
  return THREE.MathUtils.randFloat(min, max);
}

// MESSAGE_SPAWN_X_RANGE divided into `count` equal lanes — slotIndex
// picks which one, and the result still lands at a random point within
// that lane (scaled by MESSAGE_X_SLOT_JITTER_FRACTION) rather than
// dead-center, so the outcome still reads as organic scatter rather
// than a visible grid. This is what keeps items from clustering: no
// amount of bad luck can put two lanes' worth of messages in the same
// narrow region, since every item is confined to its own lane.
function sampleSlottedX(slotIndex, count) {
  const [min, max] = MESSAGE_SPAWN_X_RANGE;
  const laneWidth = (max - min) / count;
  const laneCenter = min + laneWidth * (slotIndex + 0.5);

  return laneCenter + THREE.MathUtils.randFloatSpread(laneWidth * MESSAGE_X_SLOT_JITTER_FRACTION);
}

// Drawn once per unique sentence (see the constructor) and reused by
// every pooled item that happens to display it — never regenerated per
// spawn. Two glow passes (a soft blurred one, then a crisp one on top)
// give the "soft edges, small bloom" look without needing a separate
// blur/bloom render pass.
function createMessageTexture(text) {
  const fullText = `${text}  ♥`;
  const font = `italic ${MESSAGE_FONT_SIZE}px "Segoe Script", "Brush Script MT", "Lucida Handwriting", cursive`;

  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d");
  measureCtx.font = font;
  const textWidth = measureCtx.measureText(fullText).width;

  const paddingX = 36;
  const paddingY = 34;
  const width = Math.ceil(textWidth + paddingX * 2);
  const height = Math.ceil(MESSAGE_FONT_SIZE + paddingY * 2);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.shadowColor = "rgba(255, 173, 209, 0.95)";
  ctx.shadowBlur = 20;
  ctx.fillStyle = "rgba(255, 214, 231, 0.9)";
  ctx.fillText(fullText, width / 2, height / 2);
  ctx.fillText(fullText, width / 2, height / 2);

  ctx.shadowBlur = 4;
  ctx.fillStyle = "#fff6f9";
  ctx.fillText(fullText, width / 2, height / 2);

  return { texture: new THREE.CanvasTexture(canvas), aspect: width / height };
}

// A soft vertical glow, brightest at the top (nearest the text) and
// fading to nothing — the trailing light streak that makes each
// message read as "falling rain" rather than just floating text.
// Shared by every pooled item (tinted per-instance via material.color).
function createStreakTexture() {
  const width = 32;
  const height = 256;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "rgba(255, 255, 255, 0.9)");
  gradient.addColorStop(0.18, "rgba(255, 220, 235, 0.5)");
  gradient.addColorStop(1, "rgba(255, 220, 235, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(width * 0.32, 0, width * 0.36, height);

  return new THREE.CanvasTexture(canvas);
}

// Fade-out only, driven by POSITION rather than age (so a message is
// guaranteed fully invisible before it could ever reach fadeOutY,
// regardless of how its randomized fall speed and spawn height happen
// to combine) — 1 while cruising, easing to 0 as it nears fadeOutY.
// There is no fade-in counterpart: a message's entrance is the
// physical act of falling in from off-screen (see
// Constants.MESSAGE_SPAWN_Y_RANGE), never an opacity ramp.
function fadeOutFactor(y, fadeOutY) {
  return THREE.MathUtils.clamp((y - fadeOutY) / MESSAGE_FADE_OUT_DISTANCE, 0, 1);
}

export default class LoveMessages {
  constructor(scene, audio) {
    this.scene = scene;
    this.audio = audio;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Counts up from 0 and gates update() below — nothing in this
    // system moves, fades, or even spends its staggered starting age
    // (see resetItem's randomizeAge) until the heart is done forming.
    this.sceneTime = 0;
    this.hasTriggeredStart = false;

    // Every unique sentence's texture is created exactly once here and
    // referenced (never copied or regenerated) by however many pooled
    // items happen to be displaying it at once.
    this.textEntries = MESSAGE_TEXTS.map((text) => createMessageTexture(text));
    this.streakTexture = createStreakTexture();

    this.items = [];

    for (let i = 0; i < MESSAGE_POOL_SIZE; i++) {
      this.items.push(this.createItem(i));
    }
  }

  createItem(slotIndex) {
    const textMaterial = new THREE.SpriteMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0,
    });

    const streakMaterial = new THREE.SpriteMaterial({
      map: this.streakTexture,
      color: new THREE.Color(MESSAGE_STREAK_COLOR),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0,
    });

    const textSprite = new THREE.Sprite(textMaterial);
    const streakSprite = new THREE.Sprite(streakMaterial);

    const group = new THREE.Group();
    group.add(streakSprite);
    group.add(textSprite);
    this.group.add(group);

    const item = { group, textSprite, streakSprite, slotIndex };

    // Staggered only on this first spawn (see resetItem's
    // randomizeAge param) — without it, all 16 pooled items burst in
    // from the top together and stay visibly clustered/synchronized
    // for a full cycle before naturally spreading out. Every respawn
    // after this first one starts fresh from the top, same as real
    // rain restarting.
    this.resetItem(item, true);

    return item;
  }

  // Re-rolls an item's text, position, fall speed, wobble/float, and
  // depth — used for the initial spawn and every respawn once it fades
  // out at the bottom, so an item is recycled indefinitely rather than
  // ever destroyed and recreated.
  resetItem(item, randomizeAge = false) {
    const entry =
      this.textEntries[Math.floor(Math.random() * this.textEntries.length)];

    item.textSprite.material.map = entry.texture;
    item.textSprite.material.needsUpdate = true;
    item.textSprite.scale.set(MESSAGE_HEIGHT * entry.aspect, MESSAGE_HEIGHT, 1);

    const streakHeight = randomInRange(MESSAGE_STREAK_HEIGHT_RANGE);

    item.streakSprite.scale.set(MESSAGE_STREAK_WIDTH, streakHeight, 1);
    item.streakSprite.position.set(0, -(MESSAGE_HEIGHT / 2 + streakHeight / 2), 0);

    item.spawnY = randomInRange(MESSAGE_SPAWN_Y_RANGE);

    item.basePosition = {
      x: sampleSlottedX(item.slotIndex, MESSAGE_POOL_SIZE),
      y: item.spawnY,
      z: randomInRange(MESSAGE_SPAWN_Z_RANGE),
    };

    item.fallSpeed = randomInRange(MESSAGE_FALL_SPEED_RANGE);

    item.wobbleAmount = randomInRange(MESSAGE_WOBBLE_AMOUNT_RANGE);
    item.wobbleSpeed = randomInRange(MESSAGE_WOBBLE_SPEED_RANGE);
    item.wobblePhase = Math.random() * Math.PI * 2;

    item.floatAmount = randomInRange(MESSAGE_FLOAT_AMOUNT_RANGE);
    item.floatSpeed = randomInRange(MESSAGE_FLOAT_SPEED_RANGE);
    item.floatPhase = Math.random() * Math.PI * 2;

    const [zFar, zNear] = MESSAGE_SPAWN_Z_RANGE;
    const depthFrac = (item.basePosition.z - zFar) / (zNear - zFar);

    item.brightness = THREE.MathUtils.lerp(
      MESSAGE_DEPTH_MIN_BRIGHTNESS,
      MESSAGE_DEPTH_MAX_BRIGHTNESS,
      depthFrac,
    );

    // A fresh respawn always starts at age 0 (falling from the very
    // top, fully faded out). Only the pool's first-ever spawn fast
    // -forwards to a random point in flight — capped at this item's
    // own natural travel time (spawnY down to the fade-out line, at
    // its own fallSpeed), so it can never land past the point where
    // it would have already respawned.
    const cycleDuration =
      (item.spawnY - MESSAGE_FADE_OUT_Y) / -item.fallSpeed;

    item.age = randomizeAge ? Math.random() * cycleDuration : 0;

    const y = item.basePosition.y + item.fallSpeed * item.age;

    item.group.position.set(item.basePosition.x, y, item.basePosition.z);
    item.textSprite.material.opacity = 0;
    item.streakSprite.material.opacity = 0;
  }

  update(delta) {
    this.sceneTime += delta;

    // Frozen, not just invisible: age doesn't advance either, so the
    // staggered starting ages every item was given (see createItem)
    // are still exactly as staggered the moment this gate opens,
    // rather than having all drifted forward in lockstep while
    // waiting.
    if (this.sceneTime < MESSAGE_START_DELAY) return;

    if (!this.hasTriggeredStart) {
      this.hasTriggeredStart = true;
      this.audio.trigger("messages:start");
    }

    this.items.forEach((item) => {
      item.age += delta;

      const y = item.basePosition.y + item.fallSpeed * item.age;

      if (y <= MESSAGE_FADE_OUT_Y) {
        this.resetItem(item);
        return;
      }

      const wobbleX =
        Math.sin(item.age * item.wobbleSpeed + item.wobblePhase) *
        item.wobbleAmount;
      const floatY =
        Math.sin(item.age * item.floatSpeed + item.floatPhase) *
        item.floatAmount;

      item.group.position.set(
        item.basePosition.x + wobbleX,
        y + floatY,
        item.basePosition.z,
      );

      const fade = fadeOutFactor(y, MESSAGE_FADE_OUT_Y);

      item.textSprite.material.opacity = fade * item.brightness;
      item.streakSprite.material.opacity =
        fade * item.brightness * MESSAGE_STREAK_OPACITY_FACTOR;
    });
  }

  destroy() {
    this.items.forEach((item) => {
      item.textSprite.material.dispose();
      item.streakSprite.material.dispose();
    });

    // Each unique sentence's texture was created exactly once in the
    // constructor and only ever referenced since — disposed the same
    // way, once, here.
    this.textEntries.forEach((entry) => entry.texture.dispose());
    this.streakTexture.dispose();

    this.scene.remove(this.group);
  }
}
