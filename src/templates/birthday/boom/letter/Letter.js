import gsap from "gsap";
import * as THREE from "three";

import { setPhase } from "../../../../engine/core/PerfPhase"; // TEMP PROFILING — remove with PerfPhase.js
import "./Letter.css";
import buildLetter, { disposeLetter } from "./LetterGeometry";
import {
  LETTER_POSITION_X,
  LETTER_POSITION_Y,
  LETTER_POSITION_Z,
  LETTER_TILT_X_EXTRA,
  LETTER_TILT_Z,
  LETTER_TILT_Y,
  LETTER_SEAL_BUTTON_LABEL,
  LETTER_SEAL_LABELS,
  LETTER_SHADOW_OPACITY,
  LETTER_ENTRANCE_DURATION,
  LETTER_ENTRANCE_START_SCALE,
  LETTER_ENTRANCE_EASE,
  LETTER_IDLE_BOB_AMOUNT,
  LETTER_IDLE_BOB_SPEED,
  LETTER_IDLE_SWAY_AMOUNT,
  LETTER_IDLE_SWAY_SPEED,
  LETTER_GLOW_MAX,
  LETTER_GLOW_DURATION,
  LETTER_HOVER_SCALE,
  LETTER_HOVER_LERP,
  LETTER_CUE_PULSE_MIN,
  LETTER_CUE_PULSE_MAX,
  LETTER_CUE_PULSE_DURATION,
  LETTER_CAMERA_FOCUS_AMOUNT,
  LETTER_CAMERA_FOCUS_DURATION,
  LETTER_CAMERA_FOCUS_EASE,
  LETTER_SEAL_REACT_SCALE,
  LETTER_SEAL_REACT_DURATION,
  LETTER_SEAL_FADE_DURATION,
  LETTER_FLAP_OPEN_ANGLE,
  LETTER_FLAP_OPEN_DURATION,
  LETTER_FLAP_OPEN_DELAY,
  LETTER_FLAP_OPEN_EASE,
  LETTER_DISPLAY_HOLD_DURATION,
  MESSAGE_CARD_START_Z,
  MESSAGE_CARD_START_SCALE,
  MESSAGE_CARD_RISE_DELAY,
  MESSAGE_CARD_LOCAL_RISE_Z,
  MESSAGE_CARD_LOCAL_RISE_DURATION,
  MESSAGE_CARD_LOCAL_RISE_EASE,
  MESSAGE_CARD_FOCUS_DISTANCE,
  MESSAGE_CARD_FOCUS_SCALE,
  MESSAGE_CARD_FOCUS_DURATION,
  MESSAGE_CARD_FOCUS_EASE,
  MESSAGE_CARD_SETTLED_BOB_AMOUNT,
  MESSAGE_CARD_SETTLED_BOB_SPEED,
  MESSAGE_TEXT_FADE_DELAY,
  MESSAGE_TEXT_FADE_DURATION,
  MESSAGE_TEXT_RISE_DISTANCE,
  MESSAGE_DECOR_FADE_DELAY,
  MESSAGE_DECOR_FADE_DURATION,
  MESSAGE_PARTICLE_RISE,
  MESSAGE_PARTICLE_DURATION,
  MESSAGE_PARTICLE_SPAWN_DELAY,
  DECOR_STICKER_POP_SCALE,
  DECOR_STICKER_POP_DURATION,
  PHOTO_FOCUS_DISTANCE,
  PHOTO_FOCUS_SCALE,
  PHOTO_FOCUS_DURATION,
  PHOTO_CLOSE_DURATION,
  LETTER_RETRACT_X_FACTOR,
  LETTER_RETRACT_DROP,
  LETTER_RETRACT_BACK,
} from "./LetterConstants";

// Part 5's own physical letter + its decorative surroundings, sitting
// inside the now-open, now-empty gift box (see GiftBox.js's own _open()
// call site — this is constructed alongside the box but only shown once
// the camera's rise has actually settled). Click-to-open detection only
// — the opening animation and message text are later parts, so a click
// here just fires onOpenRequested() once and disables further clicks.
export default class Letter {
  constructor({ camera, canvas, parent, sceneRoot, onOpenRequested, photoPlaceholders, onSequenceComplete }) {
    this.camera = camera;
    this.canvas = canvas;
    this.sceneRoot = sceneRoot;
    this.onOpenRequested = onOpenRequested;
    this.photoPlaceholders = photoPlaceholders;
    this.onSequenceComplete = onSequenceComplete;

    this._shown = false;
    this._openRequested = false;
    this._letterReturned = false;
    this._locked = false;
    this._photoIndex = 0;
    // Part 8.5 — the one state the افتحي seal's whole life cycles
    // through: "letter" (still on the envelope) -> "photo1"/"photo2"/
    // "photo3" (which reveal is next) -> "complete" (all three shown,
    // future features attach here). _advancePhotoReveal() below is the
    // only place that writes it.
    this._sequenceState = "letter";
    this._cardSettled = false;
    this._hoverTarget = 1;
    this._time = 0;
    this._particleTweens = [];
    this._activeStickerTweens = new Map();
    this._focusedPhoto = null;

    const built = buildLetter();
    this.group = built.group;
    this.paper = built.paper;
    this.paperMaterial = built.paperMaterial;
    this.flap = built.flap;
    this.flapHinge = built.flapHinge;
    this.flapMaterial = built.flapMaterial;
    this.seal = built.seal;
    this.sealMaterial = built.sealMaterial;
    this.cue = built.cue;
    this.cueMaterial = built.cueMaterial;
    this.shadow = built.shadow;
    this.shadowMaterial = built.shadowMaterial;
    this.decorGroup = built.decorGroup;
    this.decorMaterials = built.decorMaterials;
    this._heroMaterials = [this.paperMaterial, this.flapMaterial, this.sealMaterial];
    this._raycastTargets = [this.paper, this.flap, this.seal];
    this._decorRaycastTargets = this.decorGroup.children;

    this._messageCard = built.messageCard;
    this.messageGroup = built.messageCard.group;
    this.cardMaterial = built.messageCard.cardMaterial;
    this.cardBackMaterial = built.messageCard.cardBackMaterial;
    this.textPlane = built.messageCard.textPlane;
    this.textMaterial = built.messageCard.textMaterial;
    this.messageDecorMaterials = built.messageCard.decorMaterials;

    this._particles = built.particles;
    this.particleGroup = built.particles.group;
    this.particleMaterials = built.particles.materials;

    // Lie face-up on the box's own interior floor, then apply the small
    // extra tilts so it reads as a letter dropped in by hand, not a
    // grid-aligned card (see LetterConstants.js's own comment).
    this.group.rotation.set(-Math.PI / 2 + LETTER_TILT_X_EXTRA, LETTER_TILT_Y, LETTER_TILT_Z);
    this.group.position.set(LETTER_POSITION_X, LETTER_POSITION_Y, LETTER_POSITION_Z);
    this.group.visible = false;
    this.group.scale.setScalar(LETTER_ENTRANCE_START_SCALE);

    parent.add(this.group);

    // All materials above start at opacity 0 (transparent, nothing
    // actually visible), but Three.js skips invisible objects entirely
    // during traversal — so their ~20 CanvasTextures/shader programs
    // wouldn't be uploaded/compiled to the GPU until show() first flips
    // group.visible, which GiftBox times to land right as its camera
    // move settles. That turns a one-time GPU upload cost into a visible
    // mid-animation hitch. Paying it here instead, once, during idle
    // time before the user has even opened the box, is invisible (still
    // opacity 0) and keeps the real show() moment cheap.
    this._schedulePrewarm();

    this._raycaster = new THREE.Raycaster();
    this._pointerNDC = new THREE.Vector2();

    // Native pointermove fires far more often than the render loop on
    // laptop trackpads/mice (hundreds of events/sec) — a raycast on every
    // single one was hitching the main thread. Instead the handler below
    // just records the latest coordinates into this reused object, and
    // update() (already called once per rendered frame) does the actual
    // raycast at most once per frame.
    this._pendingPointer = { clientX: 0, clientY: 0 };
    this._pointerDirty = false;

    this._onPointerMove = (event) => this._handlePointerMove(event);
    this._onClick = (event) => this._handleClick(event);
    if (this.canvas) {
      this.canvas.addEventListener("pointermove", this._onPointerMove);
      this.canvas.addEventListener("click", this._onClick);
    }

    this._buildPhotoOverlay();
    this._buildSealButton();
  }

  // The dedicated "افتحي" wax-seal button sitting outside the box (see
  // Letter.css) — a second, clearly-clickable trigger for the exact same
  // open sequence the envelope's own direct click already plays (see
  // _beginOpen() below), shown/hidden alongside the envelope itself.
  _buildSealButton() {
    this.sealButton = document.createElement("button");
    this.sealButton.id = "boom-letter-seal-button";
    this.sealButton.type = "button";
    this.sealButton.dir = "rtl";
    this.sealButton.textContent = LETTER_SEAL_BUTTON_LABEL;

    this._onSealClick = () => this._handleSealClick();
    this.sealButton.addEventListener("click", this._onSealClick);
    document.body.appendChild(this.sealButton);
  }

  // A simple DOM scrim + close button for the focused photo viewer (see
  // _focusPhoto()/_closePhoto() below) — the same "plain HTML overlay"
  // pattern the rest of this template already uses for text (Reveal.js),
  // not a second in-scene UI system.
  _buildPhotoOverlay() {
    this.photoOverlay = document.createElement("div");
    this.photoOverlay.id = "boom-letter-photo-overlay";
    this.photoOverlay.innerHTML = `<button type="button" id="boom-letter-photo-close" aria-label="Close">&times;</button>`;
    document.body.appendChild(this.photoOverlay);

    this.photoCloseButton = this.photoOverlay.querySelector("#boom-letter-photo-close");
    this._onPhotoClose = () => this._closePhoto();
    this.photoCloseButton.addEventListener("click", this._onPhotoClose);
  }

  // Makes the (still fully transparent) subtree visible for exactly one
  // rendered frame so the engine's own render() call actually uploads
  // its textures/compiles its shaders, then hides it again — a single
  // GPU frame, not an ongoing cost, and imperceptible since opacity is
  // still 0 throughout.
  _schedulePrewarm() {
    requestAnimationFrame(() => {
      this.group.visible = true;
      requestAnimationFrame(() => {
        if (!this._shown) this.group.visible = false;
      });
    });
  }

  show() {
    if (this._shown) return;
    this._shown = true;

    this.group.visible = true;
    this.sealButton.classList.add("is-visible");

    const tl = gsap.timeline();
    this._entranceTimeline = tl;

    tl.to(this.group.scale, { x: 1, y: 1, z: 1, duration: LETTER_ENTRANCE_DURATION, ease: LETTER_ENTRANCE_EASE }, 0);
    tl.to(this._heroMaterials, { opacity: 1, duration: LETTER_ENTRANCE_DURATION, ease: "power2.out" }, 0);
    tl.to(this.shadowMaterial, { opacity: LETTER_SHADOW_OPACITY, duration: LETTER_ENTRANCE_DURATION, ease: "power2.out" }, 0);
    tl.to(this.decorMaterials, { opacity: 1, duration: LETTER_ENTRANCE_DURATION, ease: "power2.out", stagger: 0.06 }, 0.1);

    this._glowTween = gsap.to(this.paperMaterial, {
      emissiveIntensity: LETTER_GLOW_MAX,
      duration: LETTER_GLOW_DURATION,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
      delay: LETTER_ENTRANCE_DURATION,
    });

    tl.to(this.cueMaterial, { opacity: LETTER_CUE_PULSE_MIN, duration: LETTER_ENTRANCE_DURATION, ease: "power2.out" }, 0);
    this._cuePulseTween = gsap.to(this.cueMaterial, {
      opacity: LETTER_CUE_PULSE_MAX,
      duration: LETTER_CUE_PULSE_DURATION,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
      delay: LETTER_ENTRANCE_DURATION,
    });
  }

  _handlePointerMove(event) {
    if (!this._shown || this._openRequested) return;
    // Cheap: just stash the coordinates. The actual raycast happens at
    // most once per rendered frame, in update() below.
    this._pendingPointer.clientX = event.clientX;
    this._pendingPointer.clientY = event.clientY;
    this._pointerDirty = true;
  }

  _handleClick(event) {
    if (!this._shown || this._locked) return;

    if (!this._openRequested && this._raycastHitsPaper(event)) {
      this._beginOpen();
      return;
    }

    const decorHit = this._raycastFirstHit(this._decorRaycastTargets, event);
    if (decorHit) this._handleDecorClick(decorHit);
  }

  // Part 8.3 — the seal button's own two-stage life. First click opens
  // the envelope (unchanged _beginOpen() below). Once the letter has
  // fully returned (_letterReturned, set by _beginFlapClose() below),
  // every further click instead advances the افتحي -> photo1 -> photo2
  // -> photo3 sequence one step via the shared PhotoPlaceholders
  // instance, disabling the button for the duration of each reveal so
  // spam-clicking can't trigger overlapping animations.
  _handleSealClick() {
    if (this._locked) return;
    if (!this._openRequested) {
      this._beginOpen();
      return;
    }
    if (this._letterReturned) this._advancePhotoReveal();
  }

  _advancePhotoReveal() {
    if (!this.photoPlaceholders) return;
    if (this._sequenceState === "complete") return;
    if (this._photoIndex >= this.photoPlaceholders.cards.length) return;

    this.sealButton.disabled = true;
    const index = this._photoIndex;
    const started = this.photoPlaceholders.revealSequential(index, () => {
      this._photoIndex += 1;
      this._sequenceState =
        this._photoIndex >= this.photoPlaceholders.cards.length ? "complete" : `photo${this._photoIndex + 1}`;

      // Part 9 — the moment PHOTO 3 has fully returned, the افتحي seal's
      // job is done for good: lock out every further click on the
      // envelope/decor (this._locked) and fade+disable the DOM seal
      // button itself (its own .is-visible/:disabled CSS already handles
      // both the fade and removing its clickable area), then hand off to
      // GiftBox for the rest of the closing sequence.
      if (this._sequenceState === "complete") {
        this._locked = true;
        this.sealButton.classList.remove("is-visible");
        this.sealButton.disabled = true;
        if (this.onSequenceComplete) this.onSequenceComplete();
      } else {
        this._updateSealButtonLabel();
        this.sealButton.disabled = false;
      }
    });
    if (!started) this.sealButton.disabled = false;
  }

  // Shared by both open triggers — the envelope's own direct click (see
  // _handleClick() above) and the dedicated seal button (see
  // _buildSealButton()) — so either one plays the exact same 3D open
  // sequence exactly once. This guard is what actually keeps it a
  // one-shot trigger; the seal button itself is left enabled throughout
  // (see _playOpenSequence()'s own is-visible toggle) since its fade
  // out/in is purely visual, tracking the envelope's own open/closed
  // state rather than the button's clickability.
  _beginOpen() {
    if (this._openRequested) return;
    this._openRequested = true;
    this._hoverTarget = 1;
    // Part 13 — the same single seal button stays disabled for the
    // ENTIRE open -> read -> return round trip, not just the photo
    // stages (see _advancePhotoReveal()'s own disable/re-enable) — it's
    // already hidden by CSS the instant _playOpenSequence() below fades
    // it out (see its own MESSAGE_CARD_RISE_DELAY call), but this closes
    // the gap between the click that fires _beginOpen() and that fade,
    // and covers any non-pointer activation path.
    this.sealButton.disabled = true;

    setPhase("envelope-opening"); // TEMP PROFILING

    this._playOpenSequence();
    if (this.onOpenRequested) this.onOpenRequested();
  }

  // Part 13 — the ONE seal button (#boom-letter-seal-button) relabels
  // itself to match `_sequenceState` rather than a second/third/fourth
  // button ever being created — called only after each stage's own
  // return animation has fully completed (see _beginFlapClose()'s own
  // onComplete and _advancePhotoReveal()'s own callback), so the label
  // never changes mid-animation.
  _updateSealButtonLabel() {
    const label = LETTER_SEAL_LABELS[this._sequenceState];
    if (!label) return;
    this.sealButton.textContent = label;
    // The wax seal's own size/shape never changes (see Letter.css) — the
    // later stage labels are longer multi-word phrases than "افتحي", so
    // this only toggles a smaller font-size for those via CSS, purely to
    // keep the longer text readable inside the exact same disc rather
    // than spilling far past its edges.
    this.sealButton.classList.toggle("is-compact-label", label !== LETTER_SEAL_BUTTON_LABEL);
  }

  // The envelope's own open-tap and the decorative props' own taps share
  // one raycaster/pointer — only the target list differs.
  _handleDecorClick(mesh) {
    if (mesh.userData.type === "polaroid") {
      this._focusPhoto(mesh);
    } else {
      this._popSticker(mesh);
    }
  }

  // A quick scale-up-then-settle bounce — deliberately just a bounce,
  // per the brief's own "do not open a huge separate screen unless
  // needed" for stickers/decorations.
  _popSticker(mesh) {
    const existing = this._activeStickerTweens.get(mesh);
    if (existing) existing.kill();

    const tl = gsap.timeline({ onComplete: () => this._activeStickerTweens.delete(mesh) });
    tl.to(mesh.scale, {
      x: DECOR_STICKER_POP_SCALE,
      y: DECOR_STICKER_POP_SCALE,
      z: DECOR_STICKER_POP_SCALE,
      duration: DECOR_STICKER_POP_DURATION * 0.4,
      ease: "back.out(3)",
    });
    tl.to(mesh.scale, { x: 1, y: 1, z: 1, duration: DECOR_STICKER_POP_DURATION * 0.6, ease: "power2.out" });
    this._activeStickerTweens.set(mesh, tl);
  }

  // Lifts the clicked polaroid placeholder out of the envelope group's
  // own tilted local frame (reparented to the scene root, world
  // transform preserved — the same technique _beginCardFaceTransition()
  // below uses for the letter itself) and flies it to a fixed pose
  // directly in front of the live camera, darkening the rest of the
  // scene behind it via a plain DOM scrim.
  _focusPhoto(mesh) {
    if (this._focusedPhoto) return;
    this._focusedPhoto = mesh;

    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    const worldScale = new THREE.Vector3();
    mesh.getWorldPosition(worldPos);
    mesh.getWorldQuaternion(worldQuat);
    mesh.getWorldScale(worldScale);
    this._photoReturnState = { pos: worldPos, quat: worldQuat, scale: worldScale.x };

    this.sceneRoot.attach(mesh);

    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    const targetPos = this.camera.position.clone().add(forward.multiplyScalar(PHOTO_FOCUS_DISTANCE));
    const targetQuat = this.camera.quaternion.clone();

    this.photoOverlay.classList.add("is-visible");

    if (this._photoTween) this._photoTween.kill();
    this._photoTween = this._tweenWorldTransform(
      mesh,
      { pos: targetPos, quat: targetQuat, scale: PHOTO_FOCUS_SCALE },
      PHOTO_FOCUS_DURATION,
      "power3.out",
    );
  }

  _closePhoto() {
    const mesh = this._focusedPhoto;
    if (!mesh) return;

    this.photoOverlay.classList.remove("is-visible");

    if (this._photoTween) this._photoTween.kill();
    this._photoTween = this._tweenWorldTransform(mesh, this._photoReturnState, PHOTO_CLOSE_DURATION, "power2.inOut", () => {
      this.decorGroup.attach(mesh);
      this._focusedPhoto = null;
    });
  }

  // Shared world-space fly-to-pose helper — used both for the letter
  // itself (_beginCardFaceTransition()) and the focused photo viewer
  // above. gsap can't tween a THREE.Quaternion directly, so a plain
  // {t: 0->1} proxy drives a manual lerp/slerp each frame instead.
  _tweenWorldTransform(object, target, duration, ease, onComplete) {
    const startPos = object.position.clone();
    const startQuat = object.quaternion.clone();
    const startScale = object.scale.x;
    const progress = { t: 0 };

    return gsap.to(progress, {
      t: 1,
      duration,
      ease,
      onUpdate: () => {
        object.position.lerpVectors(startPos, target.pos, progress.t);
        object.quaternion.slerpQuaternions(startQuat, target.quat, progress.t);
        const scale = startScale + (target.scale - startScale) * progress.t;
        object.scale.setScalar(scale);
      },
      onComplete,
    });
  }

  _raycastFirstHit(targets, event) {
    this._pointerNDC.x = (event.clientX / window.innerWidth) * 2 - 1;
    this._pointerNDC.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this._raycaster.setFromCamera(this._pointerNDC, this.camera);
    const hits = this._raycaster.intersectObjects(targets, false);
    return hits.length > 0 ? hits[0].object : null;
  }

  // A) camera focus, B) seal reaction, C) flap opens around its own
  // hinge, D) the message card rises + settles + its text/decor fade
  // in, plus a small burst of soft particles partway through the rise
  // — one controlled timeline rather than several competing systems.
  _playOpenSequence() {
    if (this._cuePulseTween) this._cuePulseTween.kill();
    gsap.killTweensOf(this.camera.position);

    const worldPos = new THREE.Vector3();
    this.group.getWorldPosition(worldPos);
    const focusTarget = this.camera.position.clone().lerp(worldPos, LETTER_CAMERA_FOCUS_AMOUNT);

    const tl = gsap.timeline();
    this._openTimeline = tl;

    tl.to(this.cueMaterial, { opacity: 0, duration: 0.3, ease: "power1.out" }, 0);

    // The DOM wax seal (with its own "افتحي" label) sits outside the box
    // and fades fully away right as the message card begins rising, so
    // it never lingers on-screen beside the letter.
    tl.call(() => this.sealButton.classList.remove("is-visible"), null, MESSAGE_CARD_RISE_DELAY);

    tl.to(
      this.camera.position,
      {
        x: focusTarget.x,
        y: focusTarget.y,
        z: focusTarget.z,
        duration: LETTER_CAMERA_FOCUS_DURATION,
        ease: LETTER_CAMERA_FOCUS_EASE,
        onUpdate: () => this.camera.lookAt(worldPos),
      },
      0,
    );

    tl.to(
      this.seal.scale,
      { x: LETTER_SEAL_REACT_SCALE, y: LETTER_SEAL_REACT_SCALE, z: LETTER_SEAL_REACT_SCALE, duration: LETTER_SEAL_REACT_DURATION, ease: "back.out(2)" },
      0.1,
    );
    tl.to(this.sealMaterial, { opacity: 0, duration: LETTER_SEAL_FADE_DURATION, ease: "power1.in" }, LETTER_FLAP_OPEN_DELAY);

    tl.to(
      this.flapHinge.rotation,
      { x: LETTER_FLAP_OPEN_ANGLE, duration: LETTER_FLAP_OPEN_DURATION, ease: LETTER_FLAP_OPEN_EASE },
      LETTER_FLAP_OPEN_DELAY,
    );

    // Stage 1 — a small local lift/scale-in still tucked inside the
    // envelope's own tilted local frame, reading as "coming out of the
    // envelope" before it goes anywhere near the camera.
    tl.to(
      this.messageGroup.position,
      { z: MESSAGE_CARD_LOCAL_RISE_Z, duration: MESSAGE_CARD_LOCAL_RISE_DURATION, ease: MESSAGE_CARD_LOCAL_RISE_EASE },
      MESSAGE_CARD_RISE_DELAY,
    );
    tl.to(
      this.messageGroup.scale,
      { x: 1, y: 1, z: 1, duration: MESSAGE_CARD_LOCAL_RISE_DURATION, ease: MESSAGE_CARD_LOCAL_RISE_EASE },
      MESSAGE_CARD_RISE_DELAY,
    );
    tl.to(
      [this.cardMaterial, this.cardBackMaterial],
      { opacity: 1, duration: MESSAGE_CARD_LOCAL_RISE_DURATION * 0.8, ease: "power2.out" },
      MESSAGE_CARD_RISE_DELAY + 0.1,
    );
    tl.to(
      this.messageDecorMaterials,
      { opacity: 1, duration: MESSAGE_DECOR_FADE_DURATION, ease: "power2.out", stagger: 0.08 },
      MESSAGE_CARD_RISE_DELAY + MESSAGE_DECOR_FADE_DELAY,
    );

    tl.call(() => this._spawnParticles(), null, MESSAGE_PARTICLE_SPAWN_DELAY);

    // Stage 2 — leaves the envelope's own local frame entirely and flies
    // to a fixed pose directly in front of the live camera (see
    // _beginCardFaceTransition() below), so it ends up centered and
    // facing the viewer regardless of the envelope's own resting tilt.
    const localRiseSettledAt = MESSAGE_CARD_RISE_DELAY + MESSAGE_CARD_LOCAL_RISE_DURATION;
    tl.call(() => this._beginCardFaceTransition(), null, localRiseSettledAt);

    const cardSettledAt = localRiseSettledAt + MESSAGE_CARD_FOCUS_DURATION;
    tl.call(() => { this._cardSettled = true; }, null, cardSettledAt);

    const textStartAt = cardSettledAt + MESSAGE_TEXT_FADE_DELAY;
    tl.fromTo(
      this.textPlane.position,
      { y: -MESSAGE_TEXT_RISE_DISTANCE },
      { y: 0, duration: MESSAGE_TEXT_FADE_DURATION, ease: "power2.out" },
      textStartAt,
    );
    tl.to(this.textMaterial, { opacity: 1, duration: MESSAGE_TEXT_FADE_DURATION, ease: "power2.out" }, textStartAt);

    // Once the letter has been fully readable for a while, it returns
    // into the envelope on its own and the seal fades back in (see
    // _beginReturnSequence() below) — the reverse of everything above.
    const displayedAt = textStartAt + MESSAGE_TEXT_FADE_DURATION;
    tl.call(() => this._beginReturnSequence(), null, displayedAt + LETTER_DISPLAY_HOLD_DURATION);
  }

  // Mirrors _playOpenSequence() in reverse: the text fades, the message
  // card flies back from its camera-facing pose into the envelope's own
  // local frame (reusing _tweenWorldTransform(), the same helper the
  // outward flight and the photo viewer already use), settles back down
  // to its hidden starting scale, the flap swings shut, the in-scene
  // seal fades back in, and finally the DOM seal outside the box does
  // too — the exact reverse order of the opening sequence.
  _beginReturnSequence() {
    this._cardSettled = false;

    const tl = gsap.timeline();
    this._returnTimeline = tl;

    tl.to(this.textMaterial, { opacity: 0, duration: MESSAGE_TEXT_FADE_DURATION, ease: "power2.in" }, 0);
    tl.to(
      this.textPlane.position,
      { y: -MESSAGE_TEXT_RISE_DISTANCE, duration: MESSAGE_TEXT_FADE_DURATION, ease: "power2.in" },
      0,
    );
    tl.to(
      this.messageDecorMaterials,
      { opacity: 0, duration: MESSAGE_DECOR_FADE_DURATION, ease: "power2.in", stagger: 0.05 },
      0,
    );

    tl.call(() => this._beginCardEnvelopeFlight(), null, MESSAGE_TEXT_FADE_DURATION);
  }

  // Stage 1 of the return flight — flies the message card (still parented
  // to the scene root from the outward trip) to the world pose it would
  // have at the end of its own local rise inside the envelope, computed
  // via a throwaway helper Object3D rather than manual matrix math.
  _beginCardEnvelopeFlight() {
    const target = this._worldTransformFromEnvelopeLocal(
      new THREE.Vector3(0, 0, MESSAGE_CARD_LOCAL_RISE_Z),
      1,
    );

    if (this._cardFaceTween) this._cardFaceTween.kill();
    this._cardFaceTween = this._tweenWorldTransform(
      this.messageGroup,
      target,
      MESSAGE_CARD_FOCUS_DURATION,
      MESSAGE_CARD_FOCUS_EASE,
      () => this._beginCardLocalDescent(),
    );
  }

  // Stage 2 — back in the envelope's own local frame (reparented via
  // attach(), preserving the world transform stage 1 just flew it to),
  // sinks back down to its original hidden position/scale, mirroring
  // the local rise from _playOpenSequence() exactly in reverse.
  _beginCardLocalDescent() {
    this.group.attach(this.messageGroup);

    const localTl = gsap.timeline({ onComplete: () => this._beginFlapClose() });
    this._cardDescentTimeline = localTl;

    localTl.to(
      this.messageGroup.position,
      { z: MESSAGE_CARD_START_Z, duration: MESSAGE_CARD_LOCAL_RISE_DURATION, ease: "power2.in" },
      0,
    );
    localTl.to(
      this.messageGroup.scale,
      {
        x: MESSAGE_CARD_START_SCALE,
        y: MESSAGE_CARD_START_SCALE,
        z: MESSAGE_CARD_START_SCALE,
        duration: MESSAGE_CARD_LOCAL_RISE_DURATION,
        ease: "power2.in",
      },
      0,
    );
    localTl.to(
      [this.cardMaterial, this.cardBackMaterial],
      { opacity: 0, duration: MESSAGE_CARD_LOCAL_RISE_DURATION * 0.8, ease: "power2.in" },
      0,
    );
  }

  // Stage 3 — the flap swings back down over the (now hidden) card, the
  // in-scene seal reappears on top of it, and only once the envelope is
  // fully resting shut does the DOM seal outside the box fade back in.
  _beginFlapClose() {
    const closeTl = gsap.timeline({
      onComplete: () => {
        this.sealButton.classList.add("is-visible");
        this._letterReturned = true;
        this._sequenceState = "photo1";
        this._updateSealButtonLabel();
        this.sealButton.disabled = false;
      },
    });
    this._flapCloseTimeline = closeTl;

    closeTl.to(this.flapHinge.rotation, { x: 0, duration: LETTER_FLAP_OPEN_DURATION, ease: LETTER_FLAP_OPEN_EASE }, 0);
    closeTl.to(this.sealMaterial, { opacity: 1, duration: LETTER_SEAL_FADE_DURATION, ease: "power1.out" }, LETTER_FLAP_OPEN_DELAY);
    closeTl.to(
      this.seal.scale,
      { x: 1, y: 1, z: 1, duration: LETTER_SEAL_REACT_DURATION, ease: "back.out(2)" },
      LETTER_FLAP_OPEN_DURATION - LETTER_SEAL_REACT_DURATION,
    );
  }

  // Shared with _beginCardEnvelopeFlight() above — computes the world
  // pose a given local offset inside the envelope's own tilted frame
  // currently corresponds to, via a throwaway child Object3D rather than
  // manual matrix composition (the envelope keeps bobbing/swaying via
  // update(), so this has to be read fresh each call, not cached).
  _worldTransformFromEnvelopeLocal(localPosition, localScale) {
    const helper = new THREE.Object3D();
    helper.position.copy(localPosition);
    helper.scale.setScalar(localScale);
    this.group.add(helper);
    helper.updateWorldMatrix(true, false);

    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    helper.matrixWorld.decompose(pos, quat, scale);

    this.group.remove(helper);
    return { pos, quat, scale: scale.x };
  }

  // Reparents the message card straight onto the scene root (world
  // transform preserved, see _tweenWorldTransform()) and flies it to a
  // pose sitting MESSAGE_CARD_FOCUS_DISTANCE directly in front of the
  // live camera, quaternion matched to the camera's own — the standard
  // "billboard facing the viewer" orientation — so the final read is
  // "centered on screen, front face toward the viewer" on any aspect
  // ratio, independent of the envelope's own resting tilt.
  _beginCardFaceTransition() {
    setPhase("letter-reveal"); // TEMP PROFILING

    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    const targetPos = this.camera.position.clone().add(forward.multiplyScalar(MESSAGE_CARD_FOCUS_DISTANCE));
    const targetQuat = this.camera.quaternion.clone();

    this.sceneRoot.attach(this.messageGroup);

    this._cardFaceTween = this._tweenWorldTransform(
      this.messageGroup,
      { pos: targetPos, quat: targetQuat, scale: MESSAGE_CARD_FOCUS_SCALE },
      MESSAGE_CARD_FOCUS_DURATION,
      MESSAGE_CARD_FOCUS_EASE,
      () => { this._settledWorldPos = targetPos.clone(); },
    );
  }

  // A one-shot rise-and-fade per particle rather than a continuous
  // emitter — matches the brief's own "very small amount... slowly
  // float upward and fade", not a repeating system.
  _spawnParticles() {
    this.particleGroup.children.forEach((sprite, i) => {
      const material = this.particleMaterials[i];
      const baseY = sprite.position.y;

      const tween = gsap.timeline();
      tween.to(material, { opacity: 0.85, duration: 0.4, ease: "sine.out" }, 0);
      tween.to(sprite.position, { y: baseY + MESSAGE_PARTICLE_RISE, duration: MESSAGE_PARTICLE_DURATION, ease: "sine.out" }, 0);
      tween.to(material, { opacity: 0, duration: 0.6, ease: "sine.in" }, MESSAGE_PARTICLE_DURATION - 0.6);
      this._particleTweens.push(tween);
    });
  }

  _raycastHitsPaper(event) {
    return this._raycastFirstHit(this._raycastTargets, event) !== null;
  }

  // Part 9 — moves the envelope (and its decor children, riding along as
  // part of the same group) deeper into the box interior once the افتحي
  // sequence is complete, right before GiftBox closes the lid over it —
  // a gentle reposition, not a fade/scale/teleport (see GiftBoxConstants'
  // own GIFTBOX_CLOSE_* comment for the full closing timeline).
  retractIntoBox(duration) {
    gsap.killTweensOf(this.group.position);
    this._retractTween = gsap.to(this.group.position, {
      x: LETTER_POSITION_X * LETTER_RETRACT_X_FACTOR,
      y: LETTER_POSITION_Y - LETTER_RETRACT_DROP,
      z: LETTER_POSITION_Z - LETTER_RETRACT_BACK,
      duration,
      ease: "power2.inOut",
    });
    return this._retractTween;
  }

  update(delta) {
    if (!this._shown || this._locked) return;

    if (this._pointerDirty) {
      this._pointerDirty = false;
      if (!this._openRequested) {
        this._hoverTarget = this._raycastHitsPaper(this._pendingPointer) ? LETTER_HOVER_SCALE : 1;
      }
    }

    this._time += delta;

    const bob = Math.sin(this._time * LETTER_IDLE_BOB_SPEED) * LETTER_IDLE_BOB_AMOUNT;
    const sway = Math.sin(this._time * LETTER_IDLE_SWAY_SPEED) * LETTER_IDLE_SWAY_AMOUNT;
    this.group.position.y = LETTER_POSITION_Y + bob;
    this.group.rotation.z = LETTER_TILT_Z + sway;

    const currentScale = this.group.scale.x;
    const eased = currentScale + (this._hoverTarget - currentScale) * LETTER_HOVER_LERP;
    // Idle entrance scale-in tween already drives .scale before
    // _shown-gated hover lerp kicks in meaningfully — multiplying by the
    // entrance's own end value (1) keeps this a no-op until it's done.
    if (!this._entranceTimeline || this._entranceTimeline.progress() >= 1) {
      this.group.scale.setScalar(eased);
    }

    // The card now lives in world space (reparented onto the scene root
    // by _beginCardFaceTransition()), so its idle bob nudges its own
    // settled WORLD position directly rather than a local offset.
    if (this._cardSettled && this._settledWorldPos) {
      const cardBob = Math.sin(this._time * MESSAGE_CARD_SETTLED_BOB_SPEED) * MESSAGE_CARD_SETTLED_BOB_AMOUNT;
      this.messageGroup.position.y = this._settledWorldPos.y + cardBob;
    }
  }

  destroy() {
    if (this.canvas) {
      this.canvas.removeEventListener("pointermove", this._onPointerMove);
      this.canvas.removeEventListener("click", this._onClick);
    }
    if (this.photoCloseButton) this.photoCloseButton.removeEventListener("click", this._onPhotoClose);
    if (this.sealButton) this.sealButton.removeEventListener("click", this._onSealClick);

    if (this._entranceTimeline) this._entranceTimeline.kill();
    if (this._glowTween) this._glowTween.kill();
    if (this._cuePulseTween) this._cuePulseTween.kill();
    if (this._openTimeline) this._openTimeline.kill();
    if (this._returnTimeline) this._returnTimeline.kill();
    if (this._cardDescentTimeline) this._cardDescentTimeline.kill();
    if (this._flapCloseTimeline) this._flapCloseTimeline.kill();
    if (this._cardFaceTween) this._cardFaceTween.kill();
    if (this._photoTween) this._photoTween.kill();
    if (this._retractTween) this._retractTween.kill();
    this._particleTweens.forEach((tween) => tween.kill());
    this._activeStickerTweens.forEach((tween) => tween.kill());
    gsap.killTweensOf(this.group.scale);
    gsap.killTweensOf(this.group.position);
    gsap.killTweensOf(this._heroMaterials);
    gsap.killTweensOf(this.shadowMaterial);
    gsap.killTweensOf(this.decorMaterials);
    gsap.killTweensOf(this.cueMaterial);
    gsap.killTweensOf(this.camera.position);
    gsap.killTweensOf(this.seal.scale);
    gsap.killTweensOf(this.sealMaterial);
    gsap.killTweensOf(this.flapHinge.rotation);
    gsap.killTweensOf(this.messageGroup.position);
    gsap.killTweensOf(this.messageGroup.scale);
    gsap.killTweensOf(this.messageGroup.rotation);
    gsap.killTweensOf([this.cardMaterial, this.cardBackMaterial]);
    gsap.killTweensOf(this.messageDecorMaterials);
    gsap.killTweensOf(this.textPlane.position);
    gsap.killTweensOf(this.textMaterial);

    // The message card and/or a focused photo may have been reparented
    // onto the scene root by the time this fires (see
    // _beginCardFaceTransition()/_focusPhoto() above) — remove them from
    // wherever they actually ended up, not just this.group's own subtree.
    this.group.parent?.remove(this.group);
    this.messageGroup.parent?.remove(this.messageGroup);
    // A focused photo has left decorGroup entirely (see _focusPhoto()
    // above), so disposeLetter()'s own decorGroup.children walk below
    // would otherwise skip its geometry.
    if (this._focusedPhoto) {
      this._focusedPhoto.parent?.remove(this._focusedPhoto);
      this._focusedPhoto.geometry.dispose();
    }
    this.photoOverlay?.remove();
    this.sealButton?.remove();

    disposeLetter({
      paper: this.paper,
      paperMaterial: this.paperMaterial,
      flap: this.flap,
      flapMaterial: this.flapMaterial,
      seal: this.seal,
      sealMaterial: this.sealMaterial,
      cueMaterial: this.cueMaterial,
      shadow: this.shadow,
      shadowMaterial: this.shadowMaterial,
      decorGroup: this.decorGroup,
      decorMaterials: this.decorMaterials,
      messageCard: this._messageCard,
      particles: this._particles,
    });
  }
}
