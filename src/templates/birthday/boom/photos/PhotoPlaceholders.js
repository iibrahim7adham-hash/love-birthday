import gsap from "gsap";
import * as THREE from "three";

import "./PhotoPlaceholders.css";
import buildPhotoPlaceholders, { disposePhotoPlaceholders } from "./PhotoPlaceholderGeometry";
import {
  PHOTO_ENTRANCE_DURATION,
  PHOTO_ENTRANCE_START_SCALE,
  PHOTO_ENTRANCE_EASE,
  PHOTO_ENTRANCE_STAGGER,
  PHOTO_FOCUS_DISTANCE,
  PHOTO_FOCUS_SCALE,
  PHOTO_FOCUS_DURATION,
  PHOTO_FOCUS_EASE,
  PHOTO_CLOSE_DURATION,
  PHOTO_CLOSE_EASE,
  PHOTO_AUTO_DISPLAY_DURATION,
  PHOTO_FOCUS_TILT_Z,
  PHOTO_RETRACT_X_FACTOR,
  PHOTO_RETRACT_DROP,
  PHOTO_RETRACT_BACK,
} from "./PhotoPlaceholderConstants";

// Part 8.1 — appearance + placement. Part 8.2 — click-to-focus (see
// _focusCard()/_closeCard() below), the same "reparent onto the scene
// root preserving world transform, fly to a fixed pose in front of the
// live camera, DOM scrim darkens behind it" technique letter/Letter.js's
// own _focusPhoto()/_closePhoto()/_tweenWorldTransform() already
// establishes for its own polaroid decor item — duplicated here rather
// than imported so this file stays fully independent of Letter.js (per
// the brief's own "do not change the letter"). Deliberately NOT built
// yet: the sequential افتحي -> photo1 -> photo2 -> photo3 gating — every
// card is independently clickable at any time once shown, purely to
// test this interaction in isolation.
export default class PhotoPlaceholders {
  constructor({ parent, camera, canvas, sceneRoot }) {
    this.camera = camera;
    this.canvas = canvas;
    this.sceneRoot = sceneRoot;
    this.originalParent = parent;

    this._shown = false;
    this._focusedCard = null;
    this._locked = false;

    const built = buildPhotoPlaceholders();
    this.group = built.group;
    this.cards = built.cards;
    this._built = built;

    parent.add(this.group);

    // Both the base card and the inset "photo" swatch are valid click
    // targets for the same card — mapped back to its own entry in
    // `this.cards` so the raycast hit doesn't need a second lookup.
    this._meshToCard = new Map();
    this.cards.forEach((entry) => {
      this._meshToCard.set(entry.card, entry);
      this._meshToCard.set(entry.inset, entry);
    });
    this._raycastTargets = this.cards.flatMap((entry) => [entry.card, entry.inset]);

    this._raycaster = new THREE.Raycaster();
    this._pointerNDC = new THREE.Vector2();

    this._onClick = (event) => this._handleClick(event);
    if (this.canvas) this.canvas.addEventListener("click", this._onClick);

    this._buildOverlay();
  }

  _buildOverlay() {
    this.overlay = document.createElement("div");
    this.overlay.id = "boom-photo-overlay";
    this.overlay.innerHTML = `<button type="button" id="boom-photo-close" aria-label="Close">&times;</button>`;
    document.body.appendChild(this.overlay);

    this.closeButton = this.overlay.querySelector("#boom-photo-close");
    this._onCloseClick = () => this._closeCard();
    this.closeButton.addEventListener("click", this._onCloseClick);
  }

  show() {
    if (this._shown) return;
    this._shown = true;

    const tl = gsap.timeline();
    this._timeline = tl;

    // The card base material and the shadow material are each shared
    // across all three cards (see PhotoPlaceholderGeometry.js), so each
    // is tweened exactly ONCE here rather than once per card — tweening
    // a shared target three times with staggered start times would just
    // have the later tweens overwrite the earlier ones on the same
    // property for no visual benefit.
    tl.to(this._built.cardMaterial, { opacity: 1, duration: PHOTO_ENTRANCE_DURATION, ease: "power2.out" }, 0);
    tl.to(this._built.shadowMaterial, { opacity: 1, duration: PHOTO_ENTRANCE_DURATION, ease: "power2.out" }, 0);

    this.cards.forEach(({ group, insetMaterial }, i) => {
      const at = i * PHOTO_ENTRANCE_STAGGER;
      group.visible = true;
      group.scale.setScalar(PHOTO_ENTRANCE_START_SCALE);

      tl.to(group.scale, { x: 1, y: 1, z: 1, duration: PHOTO_ENTRANCE_DURATION, ease: PHOTO_ENTRANCE_EASE }, at);
      tl.to(insetMaterial, { opacity: 1, duration: PHOTO_ENTRANCE_DURATION, ease: "power2.out" }, at);
    });
  }

  // Part 9 — once the افتحي sequence is complete and GiftBox begins its
  // closing sequence, every card must stop responding to clicks for
  // good (no manual re-focus while the box is packing itself away/
  // closed) — checked in _handleClick() below.
  lock() {
    this._locked = true;
  }

  // Part 9 — each card retracts a small, natural amount deeper into the
  // box interior (toward the center, a touch lower, a touch further
  // back) alongside the envelope's own retractIntoBox() — called by
  // GiftBox.js's own _beginClose() once the seal has faded out.
  retractIntoBox(duration) {
    this.cards.forEach(({ group }) => {
      gsap.killTweensOf(group.position);
      gsap.to(group.position, {
        x: group.position.x * PHOTO_RETRACT_X_FACTOR,
        y: group.position.y - PHOTO_RETRACT_DROP,
        z: group.position.z - PHOTO_RETRACT_BACK,
        duration,
        ease: "power2.inOut",
      });
    });
  }

  _handleClick(event) {
    if (!this._shown || this._focusedCard || this._locked) return;

    this._pointerNDC.x = (event.clientX / window.innerWidth) * 2 - 1;
    this._pointerNDC.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this._raycaster.setFromCamera(this._pointerNDC, this.camera);
    const hits = this._raycaster.intersectObjects(this._raycastTargets, false);
    if (hits.length === 0) return;

    const card = this._meshToCard.get(hits[0].object);
    if (card) this._focusCard(card);
  }

  // Lifts the clicked card's own group out of the box's local tilted
  // frame (reparented to the scene root, world transform preserved) and
  // flies it to a fixed pose directly in front of the live camera,
  // quaternion-matched to the camera's own — reads as "centered, facing
  // the viewer" on any aspect ratio, independent of the card's own
  // resting tilt. The card's ORIGINAL local transform is left completely
  // untouched on the object itself (only its parent changes, via
  // attach()), so re-parenting it back in _closeCard() restores it
  // exactly with no separately-tracked "original state" needed.
  _focusCard(cardEntry) {
    this._focusedCard = cardEntry;

    const group = cardEntry.group;
    this.sceneRoot.attach(group);

    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    const targetPos = this.camera.position.clone().add(forward.multiplyScalar(PHOTO_FOCUS_DISTANCE));
    const targetQuat = this._focusQuatFor(cardEntry);

    this.overlay.classList.add("is-visible");

    if (this._focusTween) this._focusTween.kill();
    this._focusTween = this._tweenWorldTransform(group, { pos: targetPos, quat: targetQuat, scale: PHOTO_FOCUS_SCALE }, PHOTO_FOCUS_DURATION, PHOTO_FOCUS_EASE);
  }

  _closeCard() {
    const cardEntry = this._focusedCard;
    if (!cardEntry) return;

    this.overlay.classList.remove("is-visible");

    this._returnCardToRest(cardEntry, PHOTO_CLOSE_DURATION, PHOTO_CLOSE_EASE, () => {
      this.group.attach(cardEntry.group);
      this._focusedCard = null;
    });
  }

  // Part 8.3 — the افتحي seal's own sequential reveal (see
  // letter/Letter.js's own _advancePhotoReveal()): flies card `index` to
  // the exact same camera-facing pose the manual click-to-focus above
  // uses, holds it for PHOTO_AUTO_DISPLAY_DURATION, then flies it back on
  // its own — no scrim/close button, since the whole point is an
  // automatic, ungated return (the caller re-enables the seal once
  // onComplete fires). Reuses the same _focusedCard guard as the manual
  // path, so a manual click and a sequential reveal can never overlap.
  revealSequential(index, onComplete) {
    if (!this._shown || this._focusedCard) return false;
    const cardEntry = this.cards[index];
    if (!cardEntry) return false;

    this._focusedCard = cardEntry;
    const group = cardEntry.group;
    this.sceneRoot.attach(group);

    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    const targetPos = this.camera.position.clone().add(forward.multiplyScalar(PHOTO_FOCUS_DISTANCE));
    const targetQuat = this._focusQuatFor(cardEntry);

    if (this._focusTween) this._focusTween.kill();
    if (this._autoReturnTimer) this._autoReturnTimer.kill();

    // Same DOM scrim the manual click-to-focus uses (see _focusCard()),
    // just non-interactive here — "is-auto" hides its close button and
    // disables pointer-events so the automatic sequence can't be
    // dismissed early, since control only returns to the افتحي seal once
    // onComplete fires below.
    this.overlay.classList.add("is-visible", "is-auto");

    this._focusTween = this._tweenWorldTransform(
      group,
      { pos: targetPos, quat: targetQuat, scale: PHOTO_FOCUS_SCALE },
      PHOTO_FOCUS_DURATION,
      PHOTO_FOCUS_EASE,
      () => {
        this._autoReturnTimer = gsap.delayedCall(PHOTO_AUTO_DISPLAY_DURATION, () => {
          this._returnCardToRest(cardEntry, PHOTO_CLOSE_DURATION, PHOTO_CLOSE_EASE, () => {
            this.overlay.classList.remove("is-visible", "is-auto");
            this.group.attach(group);
            this._focusedCard = null;
            if (onComplete) onComplete();
          });
        });
      },
    );

    return true;
  }

  // A tiny, alternating-sign roll layered onto the camera's own
  // quaternion — flat/dead-on into camera reads as a scanned document,
  // a hair of tilt reads as a physical print someone is holding up.
  _focusQuatFor(cardEntry) {
    const index = this.cards.indexOf(cardEntry);
    const sign = index % 2 === 0 ? 1 : -1;
    const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), PHOTO_FOCUS_TILT_Z * sign);
    return this.camera.quaternion.clone().multiply(tilt);
  }

  // Shared by the manual close (_closeCard()) and the sequential auto-
  // return (revealSequential()) — computes where the card's ORIGINAL
  // local pose (saved at construction, see PhotoPlaceholderGeometry.js)
  // now sits in world space, since the card is currently parented to the
  // scene root, then tweens it back there.
  _returnCardToRest(cardEntry, duration, ease, onComplete) {
    const group = cardEntry.group;
    const restorePos = cardEntry.originalLocalPosition;
    const restoreQuat = cardEntry.originalLocalQuaternion;
    const restoreScale = 1;

    const helper = new THREE.Object3D();
    helper.position.copy(restorePos);
    helper.quaternion.copy(restoreQuat);
    helper.scale.setScalar(restoreScale);
    this.group.add(helper);
    helper.updateWorldMatrix(true, false);
    const targetPos = new THREE.Vector3();
    const targetQuat = new THREE.Quaternion();
    const targetScale = new THREE.Vector3();
    helper.matrixWorld.decompose(targetPos, targetQuat, targetScale);
    this.group.remove(helper);

    if (this._focusTween) this._focusTween.kill();
    this._focusTween = this._tweenWorldTransform(
      group,
      { pos: targetPos, quat: targetQuat, scale: targetScale.x },
      duration,
      ease,
      onComplete,
    );
  }

  // Shared world-space fly-to-pose helper — gsap can't tween a
  // THREE.Quaternion directly, so a plain {t: 0->1} proxy drives a
  // manual lerp/slerp each frame instead (same technique letter/Letter.js's
  // own _tweenWorldTransform() uses, duplicated here to keep this file
  // independent of Letter.js).
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

  destroy() {
    if (this._timeline) this._timeline.kill();
    if (this._focusTween) this._focusTween.kill();
    if (this._autoReturnTimer) this._autoReturnTimer.kill();
    gsap.killTweensOf(this._built.cardMaterial);
    gsap.killTweensOf(this._built.shadowMaterial);
    this.cards.forEach(({ group, insetMaterial }) => {
      gsap.killTweensOf(group.scale);
      gsap.killTweensOf(group.position);
      gsap.killTweensOf(group.rotation);
      gsap.killTweensOf(insetMaterial);
    });

    if (this.canvas) this.canvas.removeEventListener("click", this._onClick);
    if (this.closeButton) this.closeButton.removeEventListener("click", this._onCloseClick);
    this.overlay?.remove();

    // A focused card may currently be parented onto the scene root
    // rather than this.group (see _focusCard()) — remove it from
    // wherever it actually ended up.
    this.cards.forEach(({ group }) => group.parent?.remove(group));
    this.group.parent?.remove(this.group);
    disposePhotoPlaceholders(this._built);
  }
}
