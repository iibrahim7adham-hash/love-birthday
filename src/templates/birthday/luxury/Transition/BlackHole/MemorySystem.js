import gsap from "gsap";
import * as THREE from "three";

import { memoryPhotos } from "../../content/memories";
import { getGlowScale, getPhotoScale } from "./ResponsiveScene";
import { createGlowTexture, loadPhotoTexture } from "./Utils";

// ===========================
// MEMORIES — reconnected to the accretion disk, sharing its actual orbit
// mechanics rather than approximating them independently:
//  - PLANE: each photo's wrapper is parented directly to `disk.points`
//    (see emergeMemory), so it inherits the disk's own tilt via ordinary
//    transform inheritance — it physically sits in the same plane the
//    particles do, not a flat plane that merely looks similar.
//  - RADIUS/HEIGHT: sampled from an ACTUAL particle already living in
//    `disk.orbitRadiusBase`/`orbitHeightBase` (see emergeMemory), not a
//    hand-picked band — it settles exactly where real particles already
//    are.
//  - ANGULAR SPEED: computed every frame (see updateMemoryItems) with the
//    exact same formula stepOrbit() uses — spin * own speed variance /
//    radius — read fresh from the disk's live `spin` each frame, so it
//    always turns the same direction and stays in sync even if the
//    disk's spin ever changes later.
// A photo has no independent orbital physics of its own; it reads the
// disk's, at its own sampled radius/height/speed.
//
// Mixed onto BlackHole.prototype (see BlackHole.js), same `this` as
// before the file split.
// ===========================
export default {
  // Reveals memories one at a time with a short random gap between each
  // (never all at once). The permanent camera orbit only begins once the
  // very last one has actually finished emerging (counted via
  // `remaining`, not a guessed total duration).
  beginMemoriesReveal() {
    this.memoryItems = [];

    const emergeDuration = 2.0;

    let remaining = memoryPhotos.length;
    let cumulativeDelay = 0;

    memoryPhotos.forEach((entry) => {
      gsap.delayedCall(cumulativeDelay, () => {
        this.emergeMemory(entry, emergeDuration, () => {
          remaining -= 1;

          if (remaining === 0) {
            this.beginCameraOrbit(0.02);
          }
        });
      });

      cumulativeDelay += THREE.MathUtils.randFloat(0.3, 0.5);
    });
  },

  // One memory's journey out of the black hole. The path has two
  // distinct phases sharing the same `emergeDuration`, driven by
  // separate eases on a plain `item.emerge` data object (never touching
  // `wrapper.position` directly — updateMemoryItems() is the single
  // place that happens, same convention the particle clusters use):
  //  - RADIUS: "power4.out" — nearly all the distance covered in the
  //    first instants, reading as ejected with force.
  //  - ANGLE: starts `curveAmount` behind the photo's final resting
  //    angle and eases toward it on "power2.in" — almost no angular
  //    motion at first (a straight radial launch), which only picks up
  //    and accelerates as the radius finishes arriving — the "gravity
  //    catches it and curves it into the orbit" feel. The curve bends in
  //    the SAME direction the disk is already spinning.
  // Once both finish, `item.orbiting = true` hands off to
  // updateMemoryItems()'s orbit branch at the exact angle/radius the
  // emerge phase ended on — no pop, and the photo never stops or
  // hovers: it goes straight from "arriving" to "orbiting forever" in
  // the same frame.
  emergeMemory(entry, emergeDuration, onSettled) {
    const disk = this.accretionDisk;
    const sourceIndex = Math.floor(Math.random() * disk.count);

    const radius = disk.orbitRadiusBase[sourceIndex];
    const height = disk.orbitHeightBase[sourceIndex];
    const angle = Math.random() * Math.PI * 2;
    const speedVar = THREE.MathUtils.randFloat(0.85, 1.15);
    const bobPhase = Math.random() * Math.PI * 2;

    const curveDirection = Math.sign(disk.spin) || 1;
    const curveAmount = THREE.MathUtils.randFloat(0.9, 1.6) * curveDirection;

    const texture = loadPhotoTexture(entry);

    const photoMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      rotation: THREE.MathUtils.degToRad(
        THREE.MathUtils.randFloat(20, 40) * (Math.random() < 0.5 ? -1 : 1),
      ),
    });

    const photo = new THREE.Sprite(photoMaterial);

    // A soft glow behind the photo, so it reads as a glowing part of the
    // particle field rather than a flat card sitting on top of it.
    const glowMaterial = new THREE.SpriteMaterial({
      map: createGlowTexture("#ff7fa3"),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const glow = new THREE.Sprite(glowMaterial);
    glow.scale.setScalar(getGlowScale());
    glow.position.z = -0.01;

    // Parented to `disk.points` itself, NOT `this.group` — this is what
    // actually puts the photo in the disk's plane. `disk.points` carries
    // the disk's fixed tilt (`buildAccretionDisk`'s
    // `disk.points.rotation.x`), so every position we set on `wrapper`
    // from here on is automatically expressed in that same tilted plane
    // for free, via ordinary parent-child transform inheritance — the
    // same reason the particles themselves all land on that plane. Local
    // (0,0,0) in this parent is still exactly the black hole's center,
    // since `disk.points` carries no position offset of its own.
    const wrapper = new THREE.Object3D();
    wrapper.add(glow);
    wrapper.add(photo);
    wrapper.scale.setScalar(0.001);
    disk.points.add(wrapper);

    const item = {
      wrapper,
      radius,
      height,
      angle,
      speedVar,
      bobPhase,
      orbiting: false,
      emerge: { radius: 0, height: 0, angleOffset: -curveAmount },
    };

    this.memoryItems.push(item);

    gsap.to(item.emerge, {
      radius,
      duration: emergeDuration,
      ease: "power4.out",
    });

    gsap.to(item.emerge, {
      height,
      duration: emergeDuration,
      ease: "power2.out",
    });

    gsap.to(item.emerge, {
      angleOffset: 0,
      duration: emergeDuration,
      ease: "power2.in",
      onComplete: () => {
        item.orbiting = true;

        if (onSettled) onSettled();
      },
    });

    const photoScale = getPhotoScale();

    gsap.to(wrapper.scale, {
      x: photoScale,
      y: photoScale,
      z: photoScale,
      duration: emergeDuration,
      ease: "back.out(1.4)",
    });

    gsap.to(photoMaterial, {
      opacity: 1,
      rotation: 0,
      duration: emergeDuration,
      ease: "power2.out",
    });

    gsap.to(glowMaterial, {
      opacity: 0.6,
      duration: emergeDuration,
      ease: "power2.out",
    });
  },

  // Per-frame position update for every memory item, either still
  // emerging (driven by the gsap tweens in emergeMemory) or permanently
  // orbiting (driven by the disk's live spin, same formula stepOrbit()
  // uses).
  updateMemoryItems(delta) {
    if (!this.memoryItems) return;

    this.memoryItems.forEach((item) => {
      if (item.orbiting) {
        // The exact same angular-velocity formula stepOrbit() uses
        // (spin * own speed variance, divided by radius) — read fresh
        // from the disk every frame, so a photo turns the same direction
        // and stays in sync with it permanently, not just at the moment
        // it joined.
        const angularVel =
          (this.accretionDisk.spin * item.speedVar) /
          Math.max(item.radius, 0.7);

        item.angle += delta * angularVel;

        // A small independent bob on top of the orbit itself — "slight
        // floating motion" per the brief, not just an orbit path.
        const bob = Math.sin(this.time * 0.6 + item.bobPhase) * 0.08;

        item.wrapper.position.x = Math.cos(item.angle) * item.radius;
        item.wrapper.position.y = item.height + bob;
        item.wrapper.position.z = Math.sin(item.angle) * item.radius;
      } else {
        // Still emerging — position comes from item.emerge, which the
        // gsap tweens in emergeMemory() are mutating in the background
        // (see emergeMemory's comment for the two-phase radius/angle
        // shaping).
        const currentAngle = item.angle + item.emerge.angleOffset;

        item.wrapper.position.x = Math.cos(currentAngle) * item.emerge.radius;
        item.wrapper.position.y = item.emerge.height;
        item.wrapper.position.z = Math.sin(currentAngle) * item.emerge.radius;
      }
    });
  },
};
