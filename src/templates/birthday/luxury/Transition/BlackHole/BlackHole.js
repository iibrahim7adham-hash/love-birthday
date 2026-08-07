import * as THREE from "three";

import AccretionDisk from "./AccretionDisk";
import Animations from "./Animations";
import BlackHoleCore from "./BlackHoleCore";
import CameraController from "./CameraController";
import { MAIN_PARTICLE_COUNT } from "./Constants";
import MemorySystem from "./MemorySystem";
import ParticleCluster from "./ParticleCluster";
import { getCameraLookTarget, getParticleScale } from "./ResponsiveScene";

// ===========================
// Composition root — owns construction, the per-frame update loop, and
// teardown. The actual choreography lives in the mixed-in modules below
// (Animations, CameraController, AccretionDisk, MemorySystem), each
// applied straight onto the prototype so their methods share `this`
// exactly the way one big class's methods used to. That's a deliberate
// choice for a scene this timing-sensitive: splitting into files is a
// reorganization, not a redesign, so nothing about how state is read or
// written should change — only where the code physically lives.
// ===========================
export default class BlackHole {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    this.isActive = false;

    this.time = 0;

    this.orbitMode = false;
    this.attractionMode = false;

    this.group = new THREE.Group();

    this.scene.add(this.group);

    this.group.position.copy(getCameraLookTarget());

    this.core = new BlackHoleCore(this.group);

    // one continuous pool of particles for the whole journey
    this.main = new ParticleCluster(MAIN_PARTICLE_COUNT);
    this.group.add(this.main.points);

    this.group.visible = false;
  }

  update(delta) {
    if (!this.isActive) return;

    this.time += delta;

    if (this.orbitMode) {
      this.main.stepOrbit(delta, this.time);
    } else if (this.attractionMode) {
      this.main.step(delta, this.time);
    }

    const pointScale = getParticleScale(this.camera);

    this.main.setPointScale(pointScale);

    if (this.accretionDisk) {
      this.accretionDisk.setPointScale(pointScale);
    }

    this.main.setTime(this.time);

    this.core.update(delta);

    if (this.accretionDisk) {
      this.accretionDisk.stepOrbit(delta, this.time);
      this.accretionDisk.setTime(this.time);
    }

    this.updateMemoryItems(delta);

    this.updateCamera(delta);
  }

  destroy() {
    this.main.dispose();

    this.core.dispose();

    if (this.accretionDisk) {
      this.accretionDisk.dispose();
    }

    if (this.memoryItems) {
      this.memoryItems.forEach((item) => {
        const [glow, photo] = item.wrapper.children;

        // The glow's texture is a small shared/cached one (see
        // createGlowTexture) — only its per-item material is disposed,
        // not the cached map, which stays alive for reuse.
        glow.material.dispose();

        photo.material.map?.dispose();
        photo.material.dispose();
      });
    }

    this.scene.remove(this.group);
  }
}

Object.assign(
  BlackHole.prototype,
  Animations,
  CameraController,
  AccretionDisk,
  MemorySystem,
);
