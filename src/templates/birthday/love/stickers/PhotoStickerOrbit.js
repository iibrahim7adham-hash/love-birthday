import gsap from "gsap";
import * as THREE from "three";

import { getStickerScale } from "../Responsive";
import PhotoSticker from "./PhotoSticker";
import StickerFocusView from "./StickerFocusView";
import { acquireStickerTexture, releaseStickerTexture } from "./PhotoStickerTexture";
import {
  PHOTO_STICKER_MAX_COUNT,
  PHOTO_STICKER_MIN_COUNT,
  PHOTO_STICKER_RADIUS,
  PHOTO_STICKER_Y,
  PHOTO_STICKER_SIZE,
  PHOTO_STICKER_ORBIT_SPEED,
  PHOTO_STICKER_START_ANGLE,
  PHOTO_STICKER_BOB_AMOUNT,
  PHOTO_STICKER_BOB_SPEED,
  PHOTO_STICKER_TILT_RANGE,
  PHOTO_STICKER_ENTRANCE_DELAY,
  PHOTO_STICKER_ENTRANCE_STAGGER,
  PHOTO_STICKER_FADE_IN_DURATION,
  PHOTO_STICKER_FRONT_OPACITY,
  PHOTO_STICKER_BEHIND_OPACITY,
  PHOTO_STICKER_FOCUS_DIM_OPACITY,
  PHOTO_STICKER_FOCUS_ORBIT_SPEED_MULTIPLIER,
  PHOTO_STICKER_FOCUS_TRANSITION_DURATION,
  PHOTO_STICKER_OTHERS_DIM_OPACITY,
  PHOTO_STICKER_OTHERS_DIM_DURATION,
} from "./PhotoStickerConstants";

function randomTilt() {
  const [min, max] = PHOTO_STICKER_TILT_RANGE;
  return THREE.MathUtils.randFloat(min, max);
}

// The public API for the whole photo-orbit feature: hand it an array of
// image sources plus the shared scene/camera, and it does everything
// else — building each sticker, distributing them evenly around the
// EXISTING orbit ring's own path (PHOTO_STICKER_RADIUS/Y are derived
// from OrbitSystem's own PLATFORM_* constants — see
// PhotoStickerConstants.js), animating them in, orbiting them
// continuously, AND (once stickerInteractionEnabled — see below)
// letting the user click one open into StickerFocusView's own enlarged
// DOM overlay. LoveScene only ever constructs one, calls update(delta)
// every frame, and calls destroy() on teardown.
//
// THE EXISTING RING IS THE ORBIT — this never creates a second ring,
// never touches OrbitSystem's own mesh, and never runs its own
// animation loop; it's driven by the exact same update(delta) call
// everything else in the scene already gets.
export default class PhotoStickerOrbit {
  constructor({ scene, camera, audio, images = [], canvas }) {
    this.scene = scene;
    this.camera = camera;
    this.audio = audio;
    this.canvas = canvas;

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.time = 0;

    // Separate from `time` on purpose — reacting to "letter:focus" (see
    // below) gently slows the ORBIT specifically without disturbing the
    // independent bob motion's own natural rate.
    this.orbitTime = 0;

    this.entries = [];

    // Plain tweened numbers, not Three.js objects — nudged by
    // _reactToLetterFocus() below, read every frame in update().
    this._focusDim = { value: 1 };
    this._orbitSpeedMultiplier = { value: 1 };

    // The dim applied to every OTHER sticker while one is open in
    // StickerFocusView — independent of _focusDim above (that one is
    // one-time and permanent once the letter takes over; this one
    // reverses itself on close, see _openFocus/_closeFocus).
    this._othersDim = { value: 1 };

    // Click-to-focus interaction state. Explicit and state-driven
    // rather than "the stickers exist so they're clickable": stays
    // false for the entire heart/orbit/envelope/letter sequence and is
    // only ever flipped true by the "envelope:complete" subscription
    // below, once the envelope has fully closed and removed itself.
    this.stickerInteractionEnabled = false;
    this._focusedEntry = null;
    this._focusTransitioning = false;

    // Reused across every click — never recreated per interaction.
    this._raycaster = new THREE.Raycaster();
    this._pointerNDC = new THREE.Vector2();
    this._scratchVec3 = new THREE.Vector3();

    this.focusView = new StickerFocusView(this.audio, {
      onRequestClose: () => this._closeFocus(),
    });

    // The envelope (see envelope/Envelope.js) fires this once its
    // letter has taken over as the scene's focus — this is the only
    // thing that connects the two systems, and it's entirely one-way:
    // the sticker orbit reacts, the envelope has no idea this class
    // exists.
    this._unsubscribeLetterFocus = this.audio.on("letter:focus", () =>
      this._reactToLetterFocus(),
    );

    // Fired once, at the very end of Envelope.js's own exit animation
    // (see its _handleEnvelopeExit) — the single, explicit trigger for
    // turning sticker interaction on. Never enabled any earlier.
    this._unsubscribeEnvelopeComplete = this.audio.on("envelope:complete", () => {
      this.stickerInteractionEnabled = true;
    });

    this._onCanvasClick = (event) => this._handleCanvasClick(event);
    if (this.canvas) this.canvas.addEventListener("click", this._onCanvasClick);

    this.setImages(images);
  }

  _reactToLetterFocus() {
    gsap.to(this._focusDim, {
      value: PHOTO_STICKER_FOCUS_DIM_OPACITY,
      duration: PHOTO_STICKER_FOCUS_TRANSITION_DURATION,
      ease: "power2.out",
    });

    gsap.to(this._orbitSpeedMultiplier, {
      value: PHOTO_STICKER_FOCUS_ORBIT_SPEED_MULTIPLIER,
      duration: PHOTO_STICKER_FOCUS_TRANSITION_DURATION,
      ease: "power2.out",
    });
  }

  // Replaces the current image set. Existing stickers are torn down
  // (their textures released) and the new list is built fresh — the
  // PhotoStickerOrbit instance and its scene group persist, only its
  // contents change, so callers never need to reconstruct the whole
  // subsystem just to swap photos.
  setImages(images) {
    this._clearEntries();

    const clamped = this._validateImages(images);

    clamped.forEach((src, index) => {
      this._createEntry(src, index, clamped.length);
    });
  }

  _validateImages(images) {
    if (images.length > PHOTO_STICKER_MAX_COUNT) {
      console.warn(
        `PhotoStickerOrbit: ${images.length} images given, showing only the first ${PHOTO_STICKER_MAX_COUNT}.`,
      );
    } else if (images.length > 0 && images.length < PHOTO_STICKER_MIN_COUNT) {
      console.warn(
        `PhotoStickerOrbit: ${images.length} image(s) given, ${PHOTO_STICKER_MIN_COUNT} is the recommended minimum. Showing what was given.`,
      );
    }

    return images.slice(0, PHOTO_STICKER_MAX_COUNT);
  }

  _createEntry(src, index, count) {
    const entry = {
      src,
      sticker: null,
      destroyed: false,
      baseAngle: PHOTO_STICKER_START_ANGLE + (index / count) * Math.PI * 2,
      bobPhase: Math.random() * Math.PI * 2,
      tilt: randomTilt(),
      entranceScale: { value: 0 },
      entranceOpacity: { value: 0 },
    };

    this.entries.push(entry);

    acquireStickerTexture(src)
      .then((texture) => {
        if (entry.destroyed) {
          // setImages()/destroy() ran again before this resolved — the
          // caller no longer wants this sticker; just give back the
          // reference this acquire took.
          releaseStickerTexture(src);
          return;
        }

        entry.sticker = new PhotoSticker({ texture, tiltRadians: entry.tilt });
        this.group.add(entry.sticker.group);

        this._playEntrance(entry, index);
      })
      .catch((error) => {
        console.warn(`PhotoStickerOrbit: could not load "${src}"`, error);
      });
  }

  _playEntrance(entry, index) {
    const delay = PHOTO_STICKER_ENTRANCE_DELAY + index * PHOTO_STICKER_ENTRANCE_STAGGER;

    gsap.to(entry.entranceScale, {
      value: 1,
      duration: PHOTO_STICKER_FADE_IN_DURATION,
      delay,
      ease: "back.out(1.6)",
    });

    gsap.to(entry.entranceOpacity, {
      value: 1,
      duration: PHOTO_STICKER_FADE_IN_DURATION,
      delay,
      ease: "power2.out",
    });
  }

  // Converts client (event) coordinates into a raycaster hit against
  // whichever sticker sprites are currently loaded, and opens the one
  // that was hit — a no-op whenever interaction isn't enabled yet, a
  // focus transition is already mid-flight, or something is already
  // open (the focus view's own full-screen backdrop already intercepts
  // clicks before they'd ever reach the canvas in that last case; this
  // check is just defense in depth).
  _handleCanvasClick(event) {
    if (!this.stickerInteractionEnabled || this._focusTransitioning || this._focusedEntry) return;

    this._pointerNDC.x = (event.clientX / window.innerWidth) * 2 - 1;
    this._pointerNDC.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this._raycaster.setFromCamera(this._pointerNDC, this.camera);

    const sprites = this.entries.filter((e) => e.sticker).map((e) => e.sticker.photo);
    const hits = this._raycaster.intersectObjects(sprites, false);

    if (hits.length === 0) return;

    const entry = this.entries.find((e) => e.sticker && e.sticker.photo === hits[0].object);
    if (entry) this._openFocus(entry);
  }

  // The clicked sticker's own sprite is hidden for the duration (see
  // update()'s opacity line below, which forces 0 for
  // entry === this._focusedEntry) rather than a second copy being
  // created — StickerFocusView.open() is handed that SAME entry's src
  // and its current projected screen position, nothing duplicated.
  _openFocus(entry) {
    if (!this.stickerInteractionEnabled || this._focusTransitioning || this._focusedEntry) return;

    this._focusedEntry = entry;
    this._focusTransitioning = true;

    const origin = this._projectToScreen(entry.sticker.group);

    gsap.to(this._othersDim, {
      value: PHOTO_STICKER_OTHERS_DIM_OPACITY,
      duration: PHOTO_STICKER_OTHERS_DIM_DURATION,
      ease: "power2.out",
    });

    this.audio.trigger("sticker:focus-open");

    this.focusView.open({
      src: entry.src,
      originX: origin.x,
      originY: origin.y,
      onOpenComplete: () => {
        this._focusTransitioning = false;
      },
    });
  }

  // Re-projects the SAME entry's position now (not the position it was
  // at when opened) — the orbit kept moving the whole time the photo
  // was focused, so this is what makes the close animation land back
  // on wherever that sticker actually is rather than a stale spot.
  _closeFocus() {
    if (!this._focusedEntry || this._focusTransitioning) return;

    const entry = this._focusedEntry;
    this._focusTransitioning = true;

    const target = this._projectToScreen(entry.sticker.group);

    gsap.to(this._othersDim, {
      value: 1,
      duration: PHOTO_STICKER_OTHERS_DIM_DURATION,
      ease: "power2.out",
    });

    this.audio.trigger("sticker:focus-close");

    this.focusView.close({
      targetX: target.x,
      targetY: target.y,
      onCloseComplete: () => {
        this._focusedEntry = null;
        this._focusTransitioning = false;
      },
    });
  }

  _projectToScreen(object3D) {
    object3D.getWorldPosition(this._scratchVec3);
    this._scratchVec3.project(this.camera);

    return {
      x: (this._scratchVec3.x * 0.5 + 0.5) * window.innerWidth,
      y: (1 - (this._scratchVec3.y * 0.5 + 0.5)) * window.innerHeight,
    };
  }

  update(delta) {
    this.time += delta;
    this.orbitTime += delta * this._orbitSpeedMultiplier.value;

    // Both computed once per frame, not once per sticker — every entry
    // shares the same responsive factor and camera bearing this frame.
    // No allocation: plain numbers, not a vector object.
    const responsiveScale = getStickerScale(this.camera);
    const cameraDist = Math.hypot(this.camera.position.x, this.camera.position.z) || 1;
    const cameraDirX = this.camera.position.x / cameraDist;
    const cameraDirZ = this.camera.position.z / cameraDist;

    this.entries.forEach((entry) => {
      if (!entry.sticker) return;

      const angle = entry.baseAngle + this.orbitTime * PHOTO_STICKER_ORBIT_SPEED;
      const bob =
        Math.sin(this.time * PHOTO_STICKER_BOB_SPEED + entry.bobPhase) * PHOTO_STICKER_BOB_AMOUNT;

      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      entry.sticker.group.position.set(
        cos * PHOTO_STICKER_RADIUS,
        PHOTO_STICKER_Y + bob,
        sin * PHOTO_STICKER_RADIUS,
      );

      entry.sticker.setScale(PHOTO_STICKER_SIZE * responsiveScale * entry.entranceScale.value);

      // The heart sits at the orbit's own center (x=0, z=0 — see
      // HeartFormation), so (cos, sin) is already this sticker's unit
      // direction FROM the heart. Its dot product with the camera's own
      // direction from the heart is 1 when the sticker is on the same
      // side as the camera (unoccluded) and -1 when it's on the exact
      // opposite side (fully behind the heart's silhouette) — the same
      // "world angle relative to the viewer" idea OrbitSystem's own
      // ring shader already uses for its front/back fade, just read
      // from the live camera position each frame instead of a fixed
      // world axis.
      const facingCamera = cos * cameraDirX + sin * cameraDirZ;
      const frontness = THREE.MathUtils.smoothstep(facingCamera, -1, 1);
      const depthOpacity = THREE.MathUtils.lerp(
        PHOTO_STICKER_BEHIND_OPACITY,
        PHOTO_STICKER_FRONT_OPACITY,
        frontness,
      );

      // The focused sticker's own sprite is hidden outright while
      // StickerFocusView shows the same photo enlarged — everything
      // else keeps its normal depth-based fade, just multiplied by the
      // (usually 1, dipped while something's focused) _othersDim.
      const isFocused = entry === this._focusedEntry;

      entry.sticker.setOpacity(
        isFocused
          ? 0
          : entry.entranceOpacity.value * depthOpacity * this._focusDim.value * this._othersDim.value,
      );
    });
  }

  _clearEntries() {
    this.entries.forEach((entry) => this._removeEntry(entry));
    this.entries = [];
  }

  _removeEntry(entry) {
    entry.destroyed = true;

    gsap.killTweensOf(entry.entranceScale);
    gsap.killTweensOf(entry.entranceOpacity);

    if (entry.sticker) {
      this.group.remove(entry.sticker.group);
      entry.sticker.destroy();
      releaseStickerTexture(entry.src);
    }
    // If entry.sticker is still null, its texture load is still in
    // flight — the acquire's .then() above checks entry.destroyed and
    // releases the reference itself once it resolves.
  }

  destroy() {
    if (this._unsubscribeLetterFocus) this._unsubscribeLetterFocus();
    if (this._unsubscribeEnvelopeComplete) this._unsubscribeEnvelopeComplete();

    if (this.canvas) this.canvas.removeEventListener("click", this._onCanvasClick);

    gsap.killTweensOf(this._focusDim);
    gsap.killTweensOf(this._orbitSpeedMultiplier);
    gsap.killTweensOf(this._othersDim);

    this.focusView.destroy();

    this._clearEntries();
    this.scene.remove(this.group);
  }
}
