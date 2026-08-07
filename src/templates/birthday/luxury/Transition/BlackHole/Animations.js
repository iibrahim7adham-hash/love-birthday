import gsap from "gsap";
import * as THREE from "three";

import { sampleHeartXY, sampleTextPositions, randomRed } from "./Utils";

// ===========================
// The full GSAP choreography for BlackHole: heart formation, "I LOVE
// YOU" text, and the Scene 3 memory-galaxy hand-off sequence. Mixed onto
// BlackHole.prototype (see BlackHole.js) rather than instantiated
// separately, so every method here reads/writes the controller's own
// shared state (`this.main`, `this.core`, `this.orbitMode`,
// `this.attractionMode`, ...) exactly the way it did before the file
// split — this is a straight relocation, not a redesign.
// ===========================
export default {
  play() {
    if (this.isActive) return;

    this.isActive = true;
    this.group.visible = true;

    const cam = this.camera;

    this.cameraBase = cam.position.clone();
    this.lookTarget = this.group.position.clone();

    const camStart = this.cameraBase.clone();
    const totalDist = camStart.distanceTo(this.lookTarget);
    const dir = this.lookTarget.clone().sub(camStart).normalize();

    const waypoint = (frac) =>
      camStart.clone().addScaledVector(dir, totalDist * frac);

    const up = new THREE.Vector3(0, 1, 0);
    const perp = new THREE.Vector3().crossVectors(dir, up).normalize();

    // `arc` bows the path sideways off the straight dolly line — a real
    // curve through space instead of a locked track, so the camera reads
    // as looking around the scene rather than sliding on a rail.
    const dolly = (frac, duration, delay, arc = 0) => {
      const p = waypoint(frac).addScaledVector(perp, arc);

      gsap.to(this.cameraBase, {
        x: p.x,
        y: p.y,
        z: p.z,
        duration,
        delay,
        ease: "sine.inOut",
      });
    };

    // ===========================
    // Stillness, then gravity awakens and gathers into a spiral ring.
    // The opening holds almost no motion at all — the ramp only truly
    // begins after a real pause, so there is something to contrast
    // against. (roughly 0.4s -> 3.2s)
    // ===========================

    this.main.setStyle(() => ({
      color: randomRed(),
      size: THREE.MathUtils.randFloat(2.4, 4.8),
      alpha: THREE.MathUtils.randFloat(0.8, 1),
    }));

    this.main.initOrbit(2.8, 11.5, 0.9);
    this.main.spin = 0.05;
    this.main.shrink = 2.6;
    this.main.chaos = 0;
    this.orbitMode = true;

    this.main.fadeTo(0.85, 2.6, 0.4);

    gsap.to(this.main, {
      shrink: 1,
      duration: 2.4,
      delay: 0.8,
      ease: "sine.inOut",
    });

    gsap.to(this.main, {
      spin: 2.3,
      duration: 2.4,
      delay: 0.8,
      ease: "sine.inOut",
    });

    gsap.to(this.core.mesh.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 2.1,
      delay: 1.1,
      ease: "back.out(1.15)",
    });

    dolly(0.24, 3.4, 0.4, 0.55);

    // A quick surge toward the black hole right as it fully forms — the
    // reveal beat. Overrides the tail of the gather dolly above.
    dolly(0.34, 0.9, 2.9);

    // A brief hesitation right before the plunge — held breath, not a
    // ramp that never stops.
    gsap.to(this.main, {
      spin: 1.9,
      duration: 0.25,
      delay: 2.95,
      ease: "sine.inOut",
    });

    // ===========================
    // Collapse — the ring spirals in violently, spinning much faster and
    // turning turbulent as it funnels into the core. (roughly 3.2s -> 6.0s)
    // ===========================

    gsap.to(this.main, {
      shrink: 0.016,
      duration: 2.8,
      delay: 3.2,
      ease: "power2.in",
    });

    gsap.to(this.main, {
      spin: 4.6,
      duration: 2.8,
      delay: 3.2,
      ease: "power1.in",
    });

    gsap.to(this.main, {
      chaos: 1,
      duration: 1.4,
      delay: 4.6,
      ease: "power1.in",
    });

    this.main.fadeTo(0.15, 1.6, 4.4);

    dolly(0.44, 2.6, 3.4, -0.35);

    // ===========================
    // Silence — a held breath, not a hard cut. Positions are simply left
    // wherever the collapse brought them (already tight around the
    // center) — nothing is reset or snapped, so the heart formation that
    // follows picks up from exactly where this left off.
    // ===========================

    gsap.delayedCall(6.0, () => {
      this.orbitMode = false;

      this.main.fadeTo(0.1, 0.5);

      gsap.to(this.core.mesh.scale, {
        x: 0.001,
        y: 0.001,
        z: 0.001,
        duration: 1.0,
        delay: 0.2,
        ease: "power2.in",
      });
    });

    // ===========================
    // Birth of the heart — slow, organic, staggered emergence, continuing
    // directly from the collapsed position with no reset. (roughly
    // 6.35s -> 9.0s)
    // ===========================

    const heartScale = 2.0;

    gsap.delayedCall(6.35, () => {
      this.attractionMode = true;

      this.main.morphTo(
        () => {
          const { x, y } = sampleHeartXY();

          return {
            x: x * heartScale,
            y: y * heartScale,
            z: THREE.MathUtils.randFloatSpread(0.14),
          };
        },
        () => ({
          color: randomRed(),
          size: THREE.MathUtils.randFloat(1.6, 3.1),
          alpha: THREE.MathUtils.randFloat(0.75, 1),
        }),
      );

      this.heartTargets = this.main.targets.slice();

      // Grows outward from a point low in the heart, rather than every
      // particle converging from wherever it happens to be — this is
      // what makes it read as being *born*, not assembled.
      this.main.setGrowthStagger(0, -1.2, 0, 2.9);

      this.main.attract = 0;
      this.main.flow = 1.2;
      this.main.fadeTo(1, 2.2, 0);

      gsap.to(this.main, {
        attract: 1.15,
        duration: 1.8,
        ease: "sine.out",
      });
      gsap.to(this.main, {
        flow: 0.25,
        duration: 2.0,
        ease: "sine.out",
      });

      gsap.delayedCall(8.2, () => {
        this.heartFormed = true;
      });
    });

    dolly(0.56, 3.4, 6.35);

    // ===========================
    // Heartbeat, then "I LOVE YOU" — some particles leave the heart to
    // spell it out, the rest remain behind as the heart. (~10.0s onward)
    // ===========================

    gsap.delayedCall(11.0, () => {
      gsap.to(this.main.points.scale, {
        x: 1.07,
        y: 1.07,
        z: 1.07,
        duration: 0.35,
        yoyo: true,
        repeat: 1,
        ease: "sine.inOut",
        onComplete: () => gsap.delayedCall(1.0, () => this.formText()),
      });
    });

    dolly(0.63, 2.6, 10.0);
  },

  formText() {
    const textCount = Math.floor(this.main.count * 0.1);
    const textPoints = sampleTextPositions("I LOVE YOU", textCount, 3.2);

    textPoints.forEach((p) => {
      p.y += 1.55;
    });

    const chosen = new Set();

    while (chosen.size < textCount) {
      chosen.add(Math.floor(Math.random() * this.main.count));
    }

    const chosenArr = Array.from(chosen);
    const textFor = new Map();

    chosenArr.forEach((particleIndex, ti) => {
      textFor.set(particleIndex, textPoints[ti]);
    });

    this.main.morphTo(
      (i) => {
        if (textFor.has(i)) return textFor.get(i);

        return {
          x: this.heartTargets[i * 3],
          y: this.heartTargets[i * 3 + 1],
          z: this.heartTargets[i * 3 + 2],
        };
      },
      (i) => {
        if (textFor.has(i)) {
          return {
            color: randomRed(),
            size: THREE.MathUtils.randFloat(2.1, 3.4),
            alpha: THREE.MathUtils.randFloat(0.85, 1),
          };
        }

        return {
          color: randomRed(),
          size: THREE.MathUtils.randFloat(1.4, 2.3),
          alpha: THREE.MathUtils.randFloat(0.4, 0.75),
        };
      },
    );

    this.main.setStagger(1.2);

    this.main.attract = 0;
    this.main.flow = 1.1;

    gsap.to(this.main, { attract: 2.5, duration: 2.6, ease: "power2.out" });
    gsap.to(this.main, { flow: 0.06, duration: 2.6, ease: "power2.out" });

    gsap.delayedCall(1.7, () => {
      this.textFormed = true;

      gsap.delayedCall(2.5, () => this.startMemoryGalaxy());
    });
  },

  // ===========================
  // SCENE 3 — The Memory Galaxy. Calmer than Scene 2 on purpose: this is
  // the emotional journey, not the climax. Reuses the same ParticleCluster,
  // shader and orbital mechanics Scene 2 established throughout.
  // ===========================

  startMemoryGalaxy() {
    // ---- Phase 1: The Last Heartbeat — calm, one final slow pulse ----

    gsap.to(this.main.points.scale, {
      x: 1.05,
      y: 1.05,
      z: 1.05,
      duration: 1.0,
      yoyo: true,
      repeat: 1,
      ease: "sine.inOut",
    });

    this.approachTarget(0.12, 3.5, 0.3);

    // ---- Phase 2: Love Returns to the Universe — the heart/text loosen
    // and drift gently apart. They stay fully visible the whole time;
    // nothing fades out and nothing pops. ----

    gsap.delayedCall(2.3, () => {
      this.main.morphTo(
        (i) => {
          const cx = this.main.targets[i * 3];
          const cy = this.main.targets[i * 3 + 1];
          const cz = this.main.targets[i * 3 + 2];

          const dist = Math.sqrt(cx * cx + cy * cy + cz * cz) || 0.01;
          const extra = THREE.MathUtils.randFloat(1.5, 3.5);

          return {
            x: cx + (cx / dist) * extra,
            y: cy + (cy / dist) * extra,
            z: cz + (cz / dist) * extra,
          };
        },
        () => ({
          color: randomRed(),
          size: THREE.MathUtils.randFloat(1.3, 2.4),
          alpha: THREE.MathUtils.randFloat(0.6, 0.95),
        }),
      );

      this.main.setStagger(1.2);

      this.main.attract = 0;
      this.main.flow = 0.4;

      gsap.to(this.main, { attract: 1.1, duration: 2.6, ease: "power2.out" });
      gsap.to(this.main, { flow: 0.15, duration: 2.8, ease: "power2.out" });
    });

    // ---- Phase 3: Return to the Black Hole — elegant, not violent.
    // Picks up orbital motion from wherever Phase 2 left the particles,
    // so there is no snap. ----

    gsap.delayedCall(5.1, () => {
      this.attractionMode = false;

      this.main.initOrbitFromCurrentPositions();
      this.main.spin = 0;
      this.main.shrink = 1;
      this.main.chaos = 0;
      this.orbitMode = true;

      gsap.to(this.core.mesh.scale, {
        x: 0.6,
        y: 0.6,
        z: 0.6,
        duration: 2,
        ease: "sine.inOut",
      });

      gsap.to(this.main, { spin: 1.2, duration: 3.2, ease: "sine.inOut" });
      gsap.to(this.main, {
        shrink: 0.02,
        duration: 3.2,
        ease: "sine.inOut",
        onComplete: () => {
          this.orbitMode = false;

          // The last particle has just been absorbed — hand off to the
          // black hole's own scene below.
          this.beginMemoryEmergence();
        },
      });

      this.main.fadeTo(0, 2.4, 1.2);
    });

    this.approachTarget(0.22, 5, 5.1);
  },

  // ===========================
  // From Destruction to Creation — picks up the instant the heart's
  // absorption into the black hole finishes (see the onComplete hook at
  // the end of Phase 3 above) and carries the black hole from "just
  // consumed the heart" into "now generating an orbit of memories":
  // stabilize -> new camera angle -> particles emerge into an irregular
  // ring -> memories emerge one by one and join that ring.
  // ===========================

  // Step 1: a held breath before the black hole visibly reacts to what
  // it just absorbed.
  beginMemoryEmergence() {
    gsap.delayedCall(0.4, () => this.stabilizeAfterAbsorption());
  },

  // Steps 2 & 3: the core settles to ~70-80% of its current size — never
  // vanishing, just stabilizing — while the camera glides to a new,
  // elevated 3/4 angle built for viewing an orbit rather than a single
  // point. Both run in parallel. The burst itself is gated on the CORE
  // finishing its settle (plus a brief 0.2-0.3s beat), not on the camera
  // arriving — the eruption should feel immediate, and the camera is
  // still free to still be gliding into place when it happens, which
  // reads as more alive than everything waiting for a static frame.
  stabilizeAfterAbsorption() {
    const settleScale =
      this.core.mesh.scale.x * THREE.MathUtils.randFloat(0.7, 0.8);

    gsap.to(this.core.mesh.scale, {
      x: settleScale,
      y: settleScale,
      z: settleScale,
      duration: 1.8,
      ease: "sine.inOut",
      onComplete: () => {
        gsap.delayedCall(THREE.MathUtils.randFloat(0.2, 0.3), () =>
          this.buildAccretionDisk(),
        );
      },
    });

    this.transitionToMemoryCameraAngle(2.6);
  },
};
