import gsap from "gsap";
import * as THREE from "three";

import { DISK_INNER_RADIUS, DISK_OUTER_RADIUS, DISK_PARTICLE_COUNT } from "./Constants";
import ParticleCluster from "./ParticleCluster";
import { randomRed } from "./Utils";

// ===========================
// The accretion disk, built as ONE unified ParticleCluster — not several
// independent ones. This is the actual fix for "visible layers/stripes/
// wedges": there is nothing left to see a seam BETWEEN. Density, height
// and (via existing physics) angular speed all vary CONTINUOUSLY with
// each particle's own radius instead of jumping between a handful of
// hand-picked per-layer values:
//  - initOrbitBurst's `densityBias` skews radius sampling toward the
//    inner edge, so the disk is naturally densest near the core and
//    thins out toward the rim — a real gradient, not a step.
//  - stepOrbit() divides angular velocity by each particle's own radius
//    (`rSpeed`), so one shared `spin` target already makes inner
//    particles rotate faster than outer ones, continuously, with no
//    per-radius bands required.
//  - height tapers with radius inside initOrbitBurst itself (thin near
//    the core, gently flaring outward).
// Formation is a fast, energetic burst: shrink races from collapsed to
// full radius in well under a second on "expo.out" (nearly all the
// motion in the first few frames), with a brief spike of turbulence that
// settles away right as it finishes — dynamic while forming, perfectly
// smooth the instant it settles. Once the disk is fully formed AND
// stabilized (the `chaos` decay's onComplete, the last of the two tweens
// to finish), beginMemoriesReveal() takes over after a short pause; the
// camera's final permanent orbit only begins once every memory has
// finished emerging.
//
// Mixed onto BlackHole.prototype (see BlackHole.js), same `this` as
// before the file split.
// ===========================
export default {
  buildAccretionDisk() {
    const innerR = DISK_INNER_RADIUS;
    const outerR = DISK_OUTER_RADIUS;
    const count = DISK_PARTICLE_COUNT;
    const burstDuration = 0.9;

    const disk = new ParticleCluster(count);

    disk.initOrbitBurst(innerR, outerR, 0.55, 1.6);
    disk.points.rotation.x = THREE.MathUtils.degToRad(16);

    disk.spin = 0;
    disk.shrink = 0.0001; // collapsed inside the black hole
    disk.chaos = 0;

    // Brighter and slightly larger near the core, fading and shrinking
    // toward the rim — the "hot inner edge" an accretion disk reads by,
    // computed as one continuous gradient off each particle's own radius
    // rather than a per-layer brightness jump.
    disk.setStyle((i) => {
      const t = (disk.orbitRadiusBase[i] - innerR) / (outerR - innerR);

      return {
        color: randomRed(),
        size:
          THREE.MathUtils.lerp(3.8, 1.3, t) +
          THREE.MathUtils.randFloat(-0.25, 0.25),
        alpha:
          THREE.MathUtils.lerp(0.55, 0.18, t) +
          THREE.MathUtils.randFloat(-0.05, 0.05),
      };
    });

    this.group.add(disk.points);
    this.accretionDisk = disk;

    // A fast fade-in — the burst should read as suddenly THERE, not
    // materializing gradually.
    disk.fadeTo(0.55, 0.35, 0);

    // A quick spike of turbulence right as it erupts, settling back to
    // nothing as it finishes expanding — "dynamic, then stable" — using
    // ParticleCluster's existing wobble rather than new physics.
    gsap.to(disk, { chaos: 0.9, duration: 0.18, ease: "power2.out" });
    // `chaos` is the last thing to settle (it starts decaying 0.18s
    // after `shrink` begins, so it finishes 0.18s after `shrink` does) —
    // its onComplete is the true "fully formed AND stabilized" event,
    // which is what the memory reveal below is gated on.
    gsap.to(disk, {
      chaos: 0,
      duration: burstDuration,
      delay: 0.18,
      ease: "sine.out",
      onComplete: () => {
        gsap.delayedCall(THREE.MathUtils.randFloat(0.5, 0.8), () =>
          this.beginMemoriesReveal(),
        );
      },
    });

    gsap.to(disk, {
      shrink: 1,
      duration: burstDuration,
      ease: "expo.out",
    });

    gsap.to(disk, {
      spin: 0.3,
      duration: burstDuration,
      ease: "sine.out",
    });
  },
};
