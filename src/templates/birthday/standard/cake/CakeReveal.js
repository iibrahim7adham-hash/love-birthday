import * as THREE from "three";
import gsap from "gsap";

import buildCake, { disposeCake } from "./CakeGeometry";
import FormationSparkles from "./FormationSparkles";
import CakeCamera from "./CakeCamera";
import CakeLighting from "./CakeLighting";
import CakeAtmosphere from "./CakeAtmosphere";
import {
  REVEAL_BREATH_DELAY,
  CAKE_PART_ENTRANCE_DURATION,
  CAKE_PART_ENTRANCE_START_SCALE,
  CAKE_PART_STAGGER,
  CANDLE_ENTRANCE_DURATION,
  CANDLE_STAGGER,
  CANDLES_TO_FLAMES_PAUSE,
  FLAME_IGNITE_DURATION,
  FLAME_STAGGER,
  CAKE_REVEAL_HOLD_DURATION,
  CAKE_TIER_RADIUS_START_SCALE,
  CAMERA_PULLBACK_DURATION,
} from "./CakeConstants";

// The lifecycle this file drives, in order — the same lightweight
// plain-string-constants approach every other Standard stage already
// uses (StartScreen.js's START_STATE, Countdown.js's COUNTDOWN_STATE).
// Purely for clarity/observability here (nothing in this scene reacts
// to user input), the same role Countdown's own state serves.
const CAKE_STATE = {
  REVEAL_BREATH: "reveal-breath",
  CAKE_FORMING: "cake-forming",
  CAKE_DECORATING: "cake-decorating",
  CANDLES_APPEAR: "candles-appear",
  FLAMES_IGNITE: "flames-ignite",
  CAKE_REVEALED: "cake-revealed",
  READY_FOR_NEXT_STAGE: "ready-for-next-stage",
};

// Step 3's entire visual surface: builds the cake (see CakeGeometry.js
// for the "what it looks like"), then choreographs its own progressive
// materialization — a short dark breath, then each part scaling in
// with a small FormationSparkles burst, then candles, then flames,
// while CakeCamera dollies in and CakeLighting brings up two dedicated
// warm lights. One master GSAP timeline drives the whole sequence,
// mirroring Countdown.js's own single-timeline approach — no scattered
// setTimeout anywhere.
//
// Unlike StartScreen/Countdown, this does NOT remove itself once
// onComplete fires — the cake is meant to remain the scene's ongoing
// hero object for whatever celebration stage gets designed next to
// build around, so only update()/destroy() get called afterward, never
// a self dissolve. destroy() is still the one place that tears everything
// down, for when the whole experience is torn down instead.
export default class CakeReveal {
  constructor({ scene, camera, audio, onComplete }) {
    this.scene = scene;
    this.audio = audio;
    this.onComplete = onComplete;

    this.state = CAKE_STATE.REVEAL_BREATH;

    this.cake = buildCake();
    this.scene.add(this.cake.group);

    this.sparkles = new FormationSparkles(this.scene);
    this.cakeCamera = new CakeCamera(camera);
    this.lighting = new CakeLighting(this.scene);
    this.atmosphere = new CakeAtmosphere(this.scene, camera);

    this._scratchWorldPos = new THREE.Vector3();

    this.playSequence();
  }

  playSequence() {
    const tl = gsap.timeline({ onComplete: () => this._finish() });
    this._timeline = tl;

    let cursor = REVEAL_BREATH_DELAY;

    // Camera + warm light both begin easing in together, right as the
    // breath ends — "very subtle warm light appears -> cake formation
    // begins" from the brief, as one continuous motion rather than
    // separate discrete steps.
    tl.add(this.cakeCamera.dollyToHero(), cursor);
    tl.add(this.lighting.fadeInRevealLight(1.1), cursor);
    tl.add(this.atmosphere.fadeIn(), cursor);

    tl.call(() => {
      this.state = CAKE_STATE.CAKE_FORMING;
      this.audio.trigger("cake:formation-start");
    }, null, cursor);

    // ---- Forming: base, then the two cake tiers with their cream
    // ring between them. These are the wide structural/frosting parts,
    // so they rise into place (radiusStartScale) rather than shrinking
    // uniformly toward a point — see CAKE_TIER_RADIUS_START_SCALE.
    cursor = this._revealPart(tl, this.cake.plate, cursor, { radiusStartScale: CAKE_TIER_RADIUS_START_SCALE });
    cursor = this._revealPart(tl, this.cake.lowerLayer, cursor, { radiusStartScale: CAKE_TIER_RADIUS_START_SCALE });
    cursor = this._revealPart(tl, this.cake.creamRing, cursor, { radiusStartScale: CAKE_TIER_RADIUS_START_SCALE });
    cursor = this._revealPart(tl, this.cake.upperLayer, cursor, { radiusStartScale: CAKE_TIER_RADIUS_START_SCALE });

    // ---- Decorating: top frosting settles into place.
    tl.call(() => {
      this.state = CAKE_STATE.CAKE_DECORATING;
    }, null, cursor);

    cursor = this._revealPart(tl, this.cake.topFrosting, cursor, { radiusStartScale: CAKE_TIER_RADIUS_START_SCALE });

    // ---- Candles.
    tl.call(() => {
      this.state = CAKE_STATE.CANDLES_APPEAR;
      this.audio.trigger("cake:candles-appear");
    }, null, cursor);

    this.cake.candles.forEach((candleGroup, index) => {
      const startAt = cursor + index * CANDLE_STAGGER;

      tl.to(
        candleGroup.scale,
        { x: 1, y: 1, z: 1, duration: CANDLE_ENTRANCE_DURATION, ease: "back.out(1.5)" },
        startAt,
      );

      tl.call(
        () => {
          candleGroup.visible = true;
          this.sparkles.burst(candleGroup.getWorldPosition(new THREE.Vector3()), { count: 4 });
        },
        null,
        startAt,
      );
    });
    cursor = cursor + (this.cake.candles.length - 1) * CANDLE_STAGGER + CANDLE_ENTRANCE_DURATION;

    // ---- Flames — a short pause after the candles settle, per the
    // brief, before anything ignites.
    cursor += CANDLES_TO_FLAMES_PAUSE;

    tl.call(() => {
      this.state = CAKE_STATE.FLAMES_IGNITE;
      this.audio.trigger("cake:flames-ignite");
    }, null, cursor);

    tl.add(this.lighting.fadeInCandleLight(1.4), cursor);

    this.cake.flames.forEach(({ group: flameGroup, glow }, index) => {
      const startAt = cursor + index * FLAME_STAGGER;

      tl.call(() => {
        flameGroup.visible = true;
      }, null, startAt);

      tl.to(
        flameGroup.scale,
        { x: 1, y: 1, z: 1, duration: FLAME_IGNITE_DURATION, ease: "power2.out" },
        startAt,
      );
      tl.to(glow.material, { opacity: 0.85, duration: FLAME_IGNITE_DURATION, ease: "power2.out" }, startAt);
    });
    cursor = cursor + (this.cake.flames.length - 1) * FLAME_STAGGER + FLAME_IGNITE_DURATION;

    // ---- Revealed: hold on the finished cake before handing off.
    tl.call(() => {
      this.state = CAKE_STATE.CAKE_REVEALED;
      this.audio.trigger("cake:reveal-complete");
    }, null, cursor);

    cursor += CAKE_REVEAL_HOLD_DURATION;

    // ---- Pullback: after the brief hold, the camera eases slightly
    // farther back into a wider composition — breathing room for the
    // stages that follow, without touching the cake itself.
    tl.add(this.cakeCamera.pullBackToSettled(), cursor);
    cursor += CAMERA_PULLBACK_DURATION;

    tl.call(() => {}, null, cursor); // holds the timeline open through the settle period
  }

  // Scales `mesh` in from near-zero with a small FormationSparkles
  // burst at its own world position, and returns the timeline position
  // the next part should start at — reused for every cake part instead
  // of writing the same block six times (the same pattern
  // Countdown.js's own _appendNumberBeat already establishes).
  _revealPart(tl, mesh, startAt, { sparkleCount, radiusStartScale } = {}) {
    tl.call(() => {
      // The actual formation-start gate: mesh.visible flips to true only
      // once the timeline playhead reaches this part's own startAt, not
      // when the scale tween below is merely created (GSAP writes a
      // fromTo's target values as soon as the timeline is built, well
      // before playback reaches it — see buildCake()'s own comment).
      mesh.visible = true;

      this.audio.trigger("cake:layer-appear");

      mesh.getWorldPosition(this._scratchWorldPos);
      this.sparkles.burst(this._scratchWorldPos.clone(), sparkleCount ? { count: sparkleCount } : undefined);
    }, null, startAt);

    const radiusStart = radiusStartScale ?? CAKE_PART_ENTRANCE_START_SCALE;

    tl.fromTo(
      mesh.scale,
      { x: radiusStart, y: CAKE_PART_ENTRANCE_START_SCALE, z: radiusStart },
      { x: 1, y: 1, z: 1, duration: CAKE_PART_ENTRANCE_DURATION, ease: "back.out(1.4)" },
      startAt,
    );

    return startAt + CAKE_PART_STAGGER;
  }

  // "cake:reveal-complete" already fired when CAKE_REVEALED was
  // reached above, right as the flames finished igniting — that's the
  // actual narrative moment: the cake is done. This is just the
  // internal hand-off once the hold has also finished, so it doesn't
  // re-trigger the same cue a second time.
  _finish() {
    this.state = CAKE_STATE.READY_FOR_NEXT_STAGE;
    this.onComplete();
  }

  // Candle flicker only — everything else in this scene is GSAP-timeline
  // driven and needs no per-frame work. Camera idle sway is delegated
  // to CakeCamera's own update().
  update(delta) {
    this.cakeCamera.update(delta);
    this.atmosphere.update(delta);

    if (this.state !== CAKE_STATE.CAKE_REVEALED && this.state !== CAKE_STATE.READY_FOR_NEXT_STAGE) return;

    this.cake.flames.forEach(({ group: flameGroup, tip, glow }) => {
      // Set by StandardCandleBlowout.js once a flame has been blown out —
      // this loop would otherwise fight its own extinguish tween every
      // single frame forever (this runs unconditionally once revealed,
      // with no other gate). `userData.extinguished` is simply undefined
      // (falsy) for every flame until that moment, so this is a no-op
      // for the entire rest of the scene's normal lifetime.
      if (flameGroup.userData.extinguished) return;

      flameGroup.userData.flickerPhase += delta * flameGroup.userData.flickerSpeed;

      const flicker = 1 + Math.sin(flameGroup.userData.flickerPhase) * 0.08;
      tip.scale.set(flicker, flicker, flicker);
      glow.material.opacity = 0.85 * (1 + Math.sin(flameGroup.userData.flickerPhase * 1.3) * 0.12);
    });
  }

  // Kills the master timeline first (so no further tl.call can fire —
  // including the one that would call onComplete), then every
  // sub-system's own resources. Never calls onComplete itself.
  destroy() {
    if (this._timeline) this._timeline.kill();

    this.sparkles.destroy();
    this.cakeCamera.destroy();
    this.lighting.destroy();
    this.atmosphere.destroy();

    gsap.killTweensOf([
      this.cake.plate.scale,
      this.cake.lowerLayer.scale,
      this.cake.creamRing.scale,
      this.cake.upperLayer.scale,
      this.cake.topFrosting.scale,
    ]);
    this.cake.candles.forEach((c) => gsap.killTweensOf(c.scale));
    this.cake.flames.forEach(({ group, glow }) => {
      gsap.killTweensOf(group.scale);
      gsap.killTweensOf(glow.material);
    });

    disposeCake(this.cake);
    this.scene.remove(this.cake.group);
  }
}
