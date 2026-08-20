import * as THREE from "three";
import gsap from "gsap";

import { getHeartTexture, getDotTexture } from "./HeartTextures";
import { BOMB_CENTER_X, BOMB_Y } from "../bomb/BombConstants";
import {
  HEART_COLORS,
  DOT_COLORS,
  YELLOW_ACCENT_COLOR,
  HEART_COUNT,
  DOT_COUNT,
  YELLOW_ACCENT_COUNT,
  HEART_SIZE_MIN,
  HEART_SIZE_MAX,
  HEART_SIZE_BIAS,
  DOT_SIZE_MIN,
  DOT_SIZE_MAX,
  YELLOW_ACCENT_SIZE_MIN,
  YELLOW_ACCENT_SIZE_MAX,
  CLUSTER_START_RADIUS,
  SPREAD_MARGIN,
  SPREAD_RADIUS_BIAS,
  SPREAD_DURATION_MIN,
  SPREAD_DURATION_MAX,
  SPREAD_STAGGER_MAX,
  DRIFT_AMPLITUDE_MIN,
  DRIFT_AMPLITUDE_MAX,
  DRIFT_SPEED_MIN,
  DRIFT_SPEED_MAX,
  ROTATION_SPEED_MIN,
  ROTATION_SPEED_MAX,
  HEART_INTERIOR_FADE_DURATION,
} from "./HeartBurstConstants";

// The actual heart-burst particle field: every heart/dot/yellow-accent
// this template's own explosion produces, and nothing else (no
// background, no flash glow — see HeartBurst.js for those). Pure
// per-instance procedural motion driven by plain elapsed-time math in
// update(delta), not GSAP — with up to 100+ independently-timed
// particles, one manual matrix update per frame is both cheaper and
// simpler than managing that many individual tweens, the "use an
// efficient approach, optimize internally" the brief itself asks for.
//
// One THREE.InstancedMesh PER COLOR (not one big instanced mesh with
// per-instance vertex colors) — still only a handful of draw calls
// total (a handful of heart tints + a few dot tints), but every
// instance's color comes from its mesh's own plain material.color, the
// same reliable "tint a shared texture via material.color" technique
// every other part of this project already uses (see e.g.
// bomb/BombGeometry.js), rather than depending on instance-color vertex
// attributes. The yellow accents are few enough (a handful) that plain
// Sprites are simplest, the same "low-count glow element = a Sprite"
// precedent bomb/BombGeometry.js's own spark already establishes.
// The reference's own expansion isn't a fast-start/slow-finish ease
// (which would already be near-fully spread within the first ~15% of
// the burst) — it stays visibly compact through roughly its first
// third, then does most of its actual traveling through the middle,
// before settling. A smoothstep-shaped ease-in-out reproduces that
// slow -> fast -> slow shape; a plain ease-out was tried first and read
// visibly too fast/too spread-out in the earliest frames against the
// reference.
function easeInOutSmooth(t) {
  return t * t * (3 - 2 * t);
}

function weightedRandomColor(entries) {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry.color;
  }
  return entries[entries.length - 1].color;
}

function buildInstances(count, { sizeMin, sizeMax, sizeBias = 1 }, colorEntries, visibleHalfWidth, visibleHalfHeight) {
  const instances = [];
  for (let i = 0; i < count; i++) {
    const startAngle = Math.random() * Math.PI * 2;
    const startRadius = Math.random() * CLUSTER_START_RADIUS;

    const targetAngle = Math.random() * Math.PI * 2;
    const targetRadius = Math.random() ** SPREAD_RADIUS_BIAS * SPREAD_MARGIN;

    instances.push({
      color: weightedRandomColor(colorEntries),
      startX: BOMB_CENTER_X + Math.cos(startAngle) * startRadius,
      startY: BOMB_Y + Math.sin(startAngle) * startRadius,
      targetX: BOMB_CENTER_X + Math.cos(targetAngle) * targetRadius * visibleHalfWidth,
      targetY: BOMB_Y + Math.sin(targetAngle) * targetRadius * visibleHalfHeight,
      size: THREE.MathUtils.lerp(sizeMin, sizeMax, Math.random() ** sizeBias),
      initialRotation: Math.random() * Math.PI * 2,
      rotationSpeed: THREE.MathUtils.randFloat(ROTATION_SPEED_MIN, ROTATION_SPEED_MAX),
      driftAmplitude: THREE.MathUtils.randFloat(DRIFT_AMPLITUDE_MIN, DRIFT_AMPLITUDE_MAX),
      driftSpeed: THREE.MathUtils.randFloat(DRIFT_SPEED_MIN, DRIFT_SPEED_MAX),
      driftPhase: Math.random() * Math.PI * 2,
      delay: Math.random() * SPREAD_STAGGER_MAX,
      duration: THREE.MathUtils.randFloat(SPREAD_DURATION_MIN, SPREAD_DURATION_MAX),
      // Part 4 (giftbox) — multiplies the instance's own scale so a
      // particle can be faded to invisible without touching its
      // material's shared (per-color-group) opacity. Stays 1 forever
      // unless _maybeFadeInteriorParticles() below tweens it toward 0.
      fadeMultiplier: 1,
    });
  }
  return instances;
}

// Groups `instances` (each already carrying its own `.color`) into one
// InstancedMesh per distinct color, and stamps each instance with a
// back-reference (`_mesh` / `_localIndex`) so the per-frame update loop
// can write straight into the right mesh at the right slot without
// needing a second lookup structure.
function buildColorGroupedMeshes(instances, texture, zOffset, dummy) {
  const groups = new Map();
  instances.forEach((instance) => {
    if (!groups.has(instance.color)) groups.set(instance.color, []);
    groups.get(instance.color).push(instance);
  });

  const meshes = [];
  groups.forEach((group, colorHex) => {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      color: colorHex,
      transparent: true,
      depthWrite: false,
    });
    const mesh = new THREE.InstancedMesh(geometry, material, group.length);

    group.forEach((instance, localIndex) => {
      instance._mesh = mesh;
      instance._localIndex = localIndex;

      dummy.position.set(instance.startX, instance.startY, zOffset);
      dummy.rotation.z = instance.initialRotation;
      dummy.scale.set(0, 0, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(localIndex, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;

    meshes.push(mesh);
  });

  return meshes;
}

export default class HeartField {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    this._ignited = false;
    this._driftPaused = false;
    this._elapsed = 0;
    this._dummy = new THREE.Object3D();

    const { halfWidth, halfHeight } = this._getVisibleBounds();

    this._heartInstances = buildInstances(
      HEART_COUNT,
      { sizeMin: HEART_SIZE_MIN, sizeMax: HEART_SIZE_MAX, sizeBias: HEART_SIZE_BIAS },
      HEART_COLORS,
      halfWidth,
      halfHeight,
    );
    this._dotInstances = buildInstances(
      DOT_COUNT,
      { sizeMin: DOT_SIZE_MIN, sizeMax: DOT_SIZE_MAX },
      DOT_COLORS.map((color) => ({ color, weight: 1 })),
      halfWidth,
      halfHeight,
    );
    this._yellowInstances = buildInstances(
      YELLOW_ACCENT_COUNT,
      { sizeMin: YELLOW_ACCENT_SIZE_MIN, sizeMax: YELLOW_ACCENT_SIZE_MAX },
      [{ color: YELLOW_ACCENT_COLOR, weight: 1 }],
      halfWidth,
      halfHeight,
    );

    this.heartMeshes = buildColorGroupedMeshes(this._heartInstances, getHeartTexture(), 0.01, this._dummy);
    this.dotMeshes = buildColorGroupedMeshes(this._dotInstances, getDotTexture(), 0.005, this._dummy);

    this.yellowSprites = this._yellowInstances.map((instance) => {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: getDotTexture(), color: YELLOW_ACCENT_COLOR, transparent: true, depthWrite: false }),
      );
      sprite.position.set(instance.startX, instance.startY, 0.015);
      sprite.scale.set(0, 0, 1);
      sprite.visible = false;
      this.scene.add(sprite);
      return sprite;
    });

    [...this.heartMeshes, ...this.dotMeshes].forEach((mesh) => {
      mesh.visible = false;
      this.scene.add(mesh);
    });
  }

  _getVisibleBounds() {
    const distance = Math.abs(this.camera.position.z);
    const verticalHalfFovRad = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const halfHeight = Math.tan(verticalHalfFovRad) * distance;
    const halfWidth = halfHeight * this.camera.aspect;
    return { halfWidth, halfHeight };
  }

  ignite() {
    if (this._ignited) return;
    this._ignited = true;
    this._elapsed = 0;
    [...this.heartMeshes, ...this.dotMeshes].forEach((mesh) => {
      mesh.visible = true;
    });
    this.yellowSprites.forEach((sprite) => {
      sprite.visible = true;
    });
  }

  // Opt-in extension point for a later system that wants to take over
  // positioning these same particles (see getGatherHandles() below) —
  // does nothing unless something explicitly calls it; the normal
  // ignite()/update() spread behavior is entirely unaffected until it
  // does.
  pauseDrift() {
    this._driftPaused = true;
  }

  // Called once the final DOM/canvas heart-rain celebration takes over
  // (GiftBox.js's own _answerYes()) — that celebration is a full-screen
  // fixed overlay (z-index above this scene's own canvas), so by the
  // time it starts these particles are already 100% invisible to the
  // user. Without this, HeartField kept computing instance matrices for
  // all ~140 hearts/dots/sprites and the renderer kept issuing draw
  // calls for them, every frame, for the rest of the (potentially
  // indefinite) celebration — a second full-cost animation system
  // running purely for nobody to see. pauseDrift() alone stops the
  // matrix math but leaves the meshes/sprites visible (and thus still
  // costing a draw call each); this also hides them so the renderer has
  // nothing left to submit for this system at all.
  hide() {
    this.pauseDrift();
    [...this.heartMeshes, ...this.dotMeshes].forEach((mesh) => {
      mesh.visible = false;
    });
    this.yellowSprites.forEach((sprite) => {
      sprite.visible = false;
    });
  }

  update(delta) {
    if (!this._ignited || this._driftPaused) return;
    this._elapsed += delta;

    this._updateInstances(this._heartInstances, 0.01);
    this._updateInstances(this._dotInstances, 0.005);
    this._updateSprites();
    if (this._interiorFadeActive) this._maybeFadeInteriorParticles();

    [...this.heartMeshes, ...this.dotMeshes].forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true;
    });
  }

  // Part 4 (giftbox) — GiftBox.js calls this once, right as its own
  // camera rise begins, handing over the world-space X/Y box it
  // considers "inside the open box". Only stores the region; the actual
  // fading happens continuously afterward in _maybeFadeInteriorParticles()
  // below, so any particle still drifting toward the box mid-transition
  // gets caught too, not just whichever ones happened to already be
  // inside at the exact instant this was called.
  hideInteriorRegion(region) {
    this._interiorFadeRegion = region;
    this._interiorFadeActive = true;
    this._unresolvedFadeCount =
      this._heartInstances.length + this._dotInstances.length + this._yellowInstances.length;
  }

  // Runs every frame while a region is active and at least one instance
  // hasn't yet been resolved one way or the other. Any particle currently
  // inside it and not already fading gets a one-shot GSAP tween pulling
  // its own fadeMultiplier down to 0 — smooth, and synchronized with
  // the giftbox camera move since it's driven off the same elapsed
  // clock this class already ticks every frame. By the time this is ever
  // called (well after the burst's own spread has finished, see
  // GiftBoxConstants.js's own GIFTBOX_START_AT), every instance is
  // already sitting at its fixed target position plus at most
  // `driftAmplitude` of bounded oscillation — so an instance whose
  // entire oscillation range can never reach the region is permanently
  // resolved on first check instead of being recomputed forever. Once
  // every instance is resolved (fading or permanently out of reach),
  // update() stops calling this at all.
  _maybeFadeInteriorParticles() {
    const { minX, maxX, minY, maxY } = this._interiorFadeRegion;

    const fadeIfInside = (instance) => {
      if (instance._fadingOut || instance._fadeResolved) return;

      const margin = instance.driftAmplitude;
      const outOfReach =
        instance.targetX + margin < minX ||
        instance.targetX - margin > maxX ||
        instance.targetY + margin < minY ||
        instance.targetY - margin > maxY;
      if (outOfReach && this._progressFor(instance) >= 1) {
        instance._fadeResolved = true;
        this._unresolvedFadeCount--;
        return;
      }
      if (outOfReach) return;

      const { x, y } = this._currentPosition(instance);
      if (x < minX || x > maxX || y < minY || y > maxY) return;

      instance._fadingOut = true;
      this._unresolvedFadeCount--;
      gsap.to(instance, { fadeMultiplier: 0, duration: HEART_INTERIOR_FADE_DURATION, ease: "power1.out" });
    };

    this._heartInstances.forEach(fadeIfInside);
    this._dotInstances.forEach(fadeIfInside);
    this._yellowInstances.forEach(fadeIfInside);

    if (this._unresolvedFadeCount <= 0) this._interiorFadeActive = false;
  }

  _progressFor(instance) {
    if (instance.duration <= 0) return 1;
    return THREE.MathUtils.clamp((this._elapsed - instance.delay) / instance.duration, 0, 1);
  }

  // Once an instance's spread tween has permanently finished (`_elapsed`
  // only ever grows, so linear can never drop back below 1 afterward),
  // its own lerp/easing target collapses to a fixed point — lerp(a, b, 1)
  // is exactly `b`, and easeInOutSmooth(1) is exactly 1 — so recomputing
  // that lerp/easing every frame forever is pure wasted work. `_settled`
  // caches that fact once and skips straight to the same drift-around-
  // targetX/Y math the general path already converges to, producing the
  // identical numeric result every frame without redoing the arrival math.
  _currentPosition(instance) {
    if (instance._settled) {
      const driftT = this._elapsed * instance.driftSpeed + instance.driftPhase;
      const x = instance.targetX + Math.sin(driftT) * instance.driftAmplitude;
      const y = instance.targetY + Math.cos(driftT * 0.8) * instance.driftAmplitude;
      return { x, y, linear: 1 };
    }

    const linear = this._progressFor(instance);
    const eased = easeInOutSmooth(linear);

    let x = THREE.MathUtils.lerp(instance.startX, instance.targetX, eased);
    let y = THREE.MathUtils.lerp(instance.startY, instance.targetY, eased);

    // Once a heart has (mostly) arrived, it keeps a small continuous
    // organic drift rather than freezing dead still — the reference
    // keeps showing gentle independent motion well after the initial
    // burst has landed.
    if (linear >= 1) {
      instance._settled = true;
      const driftT = this._elapsed * instance.driftSpeed + instance.driftPhase;
      x = instance.targetX + Math.sin(driftT) * instance.driftAmplitude;
      y = instance.targetY + Math.cos(driftT * 0.8) * instance.driftAmplitude;
    }

    return { x, y, linear };
  }

  _updateInstances(instances, zOffset) {
    instances.forEach((instance) => {
      const { x, y, linear } = this._currentPosition(instance);
      const easedScale = linear >= 1 ? 1 : easeInOutSmooth(linear);
      const scale = instance.size * easedScale * instance.fadeMultiplier;

      this._dummy.position.set(x, y, zOffset);
      this._dummy.rotation.z = instance.initialRotation + instance.rotationSpeed * this._elapsed;
      this._dummy.scale.set(scale, scale, 1);
      this._dummy.updateMatrix();
      instance._mesh.setMatrixAt(instance._localIndex, this._dummy.matrix);
    });
  }

  _updateSprites() {
    this.yellowSprites.forEach((sprite, i) => {
      const instance = this._yellowInstances[i];
      const { x, y, linear } = this._currentPosition(instance);
      const easedScale = linear >= 1 ? 1 : easeInOutSmooth(linear);
      const scale = instance.size * easedScale * instance.fadeMultiplier;
      sprite.position.set(x, y, 0.015);
      sprite.scale.set(scale, scale, 1);
    });
  }

  // Hands back everything an external system (gather/Gather.js) needs
  // to take over animating these SAME physical particles — each one's
  // current live position/rotation/size, and a setTransform() closure
  // that writes straight into the correct InstancedMesh slot (or
  // sprite) — without exposing this class's own per-frame drift
  // bookkeeping (_heartInstances/_mesh/_localIndex etc.) as public API.
  // Also pauses the drift loop via pauseDrift(), since a caller asking
  // for hand-off control obviously intends to own these transforms
  // from here on.
  getGatherHandles() {
    this.pauseDrift();

    const buildHandles = (instances, zOffset) =>
      instances.map((instance) => {
        const { x, y } = this._currentPosition(instance);
        return {
          x,
          y,
          rotation: instance.initialRotation + instance.rotationSpeed * this._elapsed,
          size: instance.size,
          setTransform: (nx, ny, rotation, scale) => {
            this._dummy.position.set(nx, ny, zOffset);
            this._dummy.rotation.z = rotation;
            this._dummy.scale.set(scale, scale, 1);
            this._dummy.updateMatrix();
            instance._mesh.setMatrixAt(instance._localIndex, this._dummy.matrix);
            instance._mesh.instanceMatrix.needsUpdate = true;
          },
        };
      });

    const heartHandles = buildHandles(this._heartInstances, 0.01);
    const dotHandles = buildHandles(this._dotInstances, 0.005);
    const yellowHandles = this._yellowInstances.map((instance, i) => {
      const sprite = this.yellowSprites[i];
      return {
        x: sprite.position.x,
        y: sprite.position.y,
        rotation: 0,
        size: instance.size,
        setTransform: (nx, ny, _rotation, scale) => {
          sprite.position.set(nx, ny, 0.015);
          sprite.scale.set(scale, scale, 1);
        },
      };
    });

    return { heartHandles, dotHandles, yellowHandles };
  }

  destroy() {
    gsap.killTweensOf([...this._heartInstances, ...this._dotInstances, ...this._yellowInstances]);

    [...this.heartMeshes, ...this.dotMeshes].forEach((mesh) => {
      mesh.geometry.dispose();
      mesh.material.dispose();
      this.scene.remove(mesh);
    });

    this.yellowSprites.forEach((sprite) => {
      sprite.material.dispose();
      this.scene.remove(sprite);
    });
  }
}
