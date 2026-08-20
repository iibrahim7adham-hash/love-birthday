import gsap from "gsap";

import { setPhase } from "../../../../engine/core/PerfPhase"; // TEMP PROFILING — remove with PerfPhase.js
import "./GiftBox.css";
import buildGiftBox, { disposeGiftBox } from "./GiftBoxGeometry";
import FinalHeartFall from "./FinalHeartFall";
import FinalMessage from "./FinalMessage";
import Letter from "../letter/Letter";
import PhotoPlaceholders from "../photos/PhotoPlaceholders";
import { LETTER_SHOW_DELAY } from "../letter/LetterConstants";
import { BOOM_CAMERA_Z } from "../Constants";
import {
  GIFTBOX_ENTRANCE_START_SCALE,
  GIFTBOX_BUTTON_LABEL,
  GIFTBOX_LIFT_HEIGHT,
  GIFTBOX_LIFT_DURATION,
  GIFTBOX_ROTATE_DURATION,
  GIFTBOX_ROTATE_OPEN_ANGLE,
  GIFTBOX_OPEN_EASE,
  GIFTBOX_GLOW_INTENSITY,
  GIFTBOX_GLOW_FADE_DURATION,
  GIFTBOX_CAMERA_MOVE_DELAY,
  GIFTBOX_CAMERA_MOVE_DURATION,
  GIFTBOX_CAMERA_MOVE_EASE,
  GIFTBOX_CAMERA_ELEVATED_Y,
  GIFTBOX_CAMERA_ELEVATED_Z,
  GIFTBOX_CAMERA_LOOKAT_Y,
  GIFTBOX_INTERIOR_FADE_HALF_WIDTH,
  GIFTBOX_INTERIOR_FADE_HALF_HEIGHT,
  GIFTBOX_CLOSE_RETRACT_DURATION,
  GIFTBOX_CLOSE_PAUSE_DURATION,
  GIFTBOX_CLOSE_GLOW_FADE_DURATION,
  GIFTBOX_CLOSE_CAMERA_DELAY,
  GIFTBOX_QUESTION_TEXT,
  GIFTBOX_QUESTION_EMOJI,
  GIFTBOX_QUESTION_YES_LABEL,
  GIFTBOX_QUESTION_NO_LABEL,
  GIFTBOX_QUESTION_HINT_TEXT,
  GIFTBOX_FINAL_FADE_DELAY,
  GIFTBOX_FINAL_FADE_DURATION,
  GIFTBOX_QUESTION_ENTRANCE_DURATION,
  GIFTBOX_QUESTION_EXIT_DURATION,
  GIFTBOX_PULL_HANDLE_LABEL,
  GIFTBOX_PULL_HIDDEN_MARGIN,
  GIFTBOX_PULL_MAX_DRAG_PX,
  GIFTBOX_PULL_MIN_DRAG_PX,
  GIFTBOX_PULL_RELEASE_DURATION,
  GIFTBOX_PULL_RELEASE_EASE,
  GIFTBOX_PULL_CANCEL_DURATION,
  GIFTBOX_PULL_CANCEL_EASE,
  GIFTBOX_PULL_HANDLE_RETRACT_DURATION,
} from "./GiftBoxConstants";

// Part 5's own closed-box appearance/entrance (building the 3D box/
// lid/ribbon/bow, see GiftBoxGeometry.js), the click-to-open
// interaction, and (Part 3) the camera move that plays alongside it.
// Anything that happens once the box is actually open is a later part.
export default class GiftBox {
  constructor({ scene, camera, canvas, heartField }) {
    this.scene = scene;
    this.camera = camera;
    this.heartField = heartField;
    this._shown = false;
    this._opened = false;
    this._closed = false;

    const { group, body, innerBottom, innerWalls, lid, lidHinge, bodyRibbons, lidRibbons, bow, glowLight, materials } = buildGiftBox();
    this.group = group;
    this.body = body;
    this.innerBottom = innerBottom;
    this.innerWalls = innerWalls;
    this.lid = lid;
    this.lidHinge = lidHinge;
    this.bodyRibbons = bodyRibbons;
    this.lidRibbons = lidRibbons;
    this.bow = bow;
    this.glowLight = glowLight;
    this._materials = materials;

    // Entrance starts from here — small scale, fully transparent —
    // rather than popping in at full size/opacity (see show() below).
    this.group.visible = false;
    this.group.scale.setScalar(GIFTBOX_ENTRANCE_START_SCALE);
    this._materials.forEach((material) => {
      material.transparent = true;
      material.opacity = 0;
    });
    this.scene.add(this.group);

    // Part 8.1/8.2 — three photo/memory placeholders on the same box
    // floor, parented as a sibling of the envelope (not under it).
    // Constructed before Letter below (Part 8.3) so it can be handed
    // straight into Letter's own constructor — the seal button lives on
    // Letter, and its post-letter clicks now drive this same instance's
    // revealSequential().
    this.photoPlaceholders = new PhotoPlaceholders({ parent: this.group, camera, canvas, sceneRoot: this.scene });

    // Parented under the box's own group so it sits correctly on the
    // body's own top face — see LetterConstants.js's own comment on
    // that resting position. Stays hidden until show() is called below,
    // a beat after the camera settles into its elevated view.
    this.letter = new Letter({
      camera,
      canvas,
      parent: this.group,
      sceneRoot: this.scene,
      photoPlaceholders: this.photoPlaceholders,
      onSequenceComplete: () => this._beginClose(),
    });

    this._finalMessage = new FinalMessage();
    this._heartFall = new FinalHeartFall({ onFull: () => this._finalMessage.show() });

    this._buildButton();
    this._buildFinalQuestion();
    this._buildPullHandle();
  }

  // The box's own entrance is a hanging cord+handle the user drags down
  // (see show()/_onPullDown()/_onPullMove()/_onPullUp() below) instead
  // of the previous scale/opacity tween — this DOM overlay is the only
  // new surface that introduces; the box's own geometry/materials/camera
  // are untouched.
  _buildPullHandle() {
    this.pullElement = document.createElement("div");
    this.pullElement.id = "boom-giftbox-pull";
    this.pullElement.innerHTML = `
      <div class="boom-pull-cord"></div>
      <button type="button" class="boom-pull-handle" dir="rtl">${GIFTBOX_PULL_HANDLE_LABEL}</button>
    `;
    document.body.appendChild(this.pullElement);

    this.pullCordEl = this.pullElement.querySelector(".boom-pull-cord");
    this.pullHandleEl = this.pullElement.querySelector(".boom-pull-handle");
    this._pullCordBaseHeight = this.pullCordEl.getBoundingClientRect().height || 40;
    this._pullDragPx = 0;
    this._pullDragging = false;
    this._pullHiddenY = 0;

    // Plain touch/mouse events rather than the Pointer Events API — most
    // visitors open this template inside Instagram/TikTok's own in-app
    // browser (see CLAUDE.md's own "أغلب الزيارات من انستغرام/تيك توك على
    // الموبايل"), and those embedded WebViews are known to handle
    // pointerdown/setPointerCapture unreliably, which is why the drag
    // didn't register on phones. touchmove/mouseup are bound on window
    // (not the handle) so the drag keeps tracking even once the finger/
    // cursor has moved off the shrinking handle itself.
    const clientYOf = (event) => (event.touches ? event.touches[0].clientY : event.clientY);

    this._onPullDown = (event) => {
      if (!this._shown || this._pullReleasing || this._pullDragging) return;
      event.preventDefault();
      this._pullDragging = true;
      this._pullStartClientY = clientYOf(event);
      this._pullDragPx = 0;
      gsap.killTweensOf(this.group.position);
    };
    this._onPullMove = (event) => {
      if (!this._pullDragging) return;
      event.preventDefault();
      const deltaY = Math.max(0, clientYOf(event) - this._pullStartClientY);
      this._pullDragPx = deltaY;
      this._applyPullProgress(Math.min(1, deltaY / GIFTBOX_PULL_MAX_DRAG_PX));
    };
    this._onPullUp = () => {
      if (!this._pullDragging) return;
      this._pullDragging = false;
      if (this._pullDragPx >= GIFTBOX_PULL_MIN_DRAG_PX) {
        this._completePull();
      } else {
        this._cancelPull();
      }
    };

    this.pullHandleEl.addEventListener("mousedown", this._onPullDown);
    this.pullHandleEl.addEventListener("touchstart", this._onPullDown, { passive: false });
    window.addEventListener("mousemove", this._onPullMove);
    window.addEventListener("touchmove", this._onPullMove, { passive: false });
    window.addEventListener("mouseup", this._onPullUp);
    window.addEventListener("touchend", this._onPullUp);
    window.addEventListener("touchcancel", this._onPullUp);
  }

  // Same "read the camera live" technique reveal/Reveal.js's own
  // _syncHeartScale() already established — the world-space Y that puts
  // the box's own top edge just above the camera's current visible
  // frustum, so the hidden start position clears the viewport on every
  // device/aspect instead of a guessed constant.
  _computePullHiddenY() {
    const distance = Math.abs(this.camera.position.z);
    const verticalHalfFovRad = (this.camera.fov / 2) * (Math.PI / 180);
    const visibleHalfHeight = Math.tan(verticalHalfFovRad) * distance;
    return visibleHalfHeight + GIFTBOX_PULL_HIDDEN_MARGIN;
  }

  // Drives the box's own group.y directly off drag progress (0 = fully
  // hidden above the frustum, 1 = resting position) — the "physically
  // connected to the handle" feel the brief asks for, not a fade. The
  // cord grows underneath the handle as it's pulled so the two visibly
  // stay attached.
  _applyPullProgress(progress) {
    this.group.position.y = this._pullHiddenY * (1 - progress);
    this.pullCordEl.style.height = `${this._pullCordBaseHeight + this._pullDragPx}px`;
  }

  // Drag cleared the minimum distance — hands off from manual dragging
  // to an automatic finish: the box eases the rest of the way home with
  // a small elastic overshoot/bounce, then the handle/cord retract.
  _completePull() {
    this._pullReleasing = true;
    const tl = gsap.timeline({
      onComplete: () => {
        this._pullReleasing = false;
      },
    });
    tl.to(
      this.group.position,
      { y: 0, duration: GIFTBOX_PULL_RELEASE_DURATION, ease: GIFTBOX_PULL_RELEASE_EASE },
      0,
    );
    tl.to(
      this.pullCordEl,
      { height: this._pullCordBaseHeight, duration: GIFTBOX_PULL_RELEASE_DURATION, ease: GIFTBOX_PULL_RELEASE_EASE },
      0,
    );
    tl.to(
      this.pullElement,
      { opacity: 0, duration: GIFTBOX_PULL_HANDLE_RETRACT_DURATION, ease: "power2.in" },
      GIFTBOX_PULL_RELEASE_DURATION * 0.6,
    );
    tl.call(() => {
      this.pullElement.classList.remove("is-visible");
      if (!this._opened) this.buttonElement.classList.add("is-visible");
    });
  }

  // Drag never cleared the minimum distance — treated as an accidental
  // tap/nudge, so the box simply retracts back up out of sight and the
  // handle/cord settle back to their own resting spot; the user can try
  // the pull again.
  _cancelPull() {
    gsap.to(this.group.position, { y: this._pullHiddenY, duration: GIFTBOX_PULL_CANCEL_DURATION, ease: GIFTBOX_PULL_CANCEL_EASE });
    gsap.to(this.pullCordEl, {
      height: this._pullCordBaseHeight,
      duration: GIFTBOX_PULL_CANCEL_DURATION,
      ease: GIFTBOX_PULL_CANCEL_EASE,
    });
  }

  _buildButton() {
    this.buttonElement = document.createElement("button");
    this.buttonElement.id = "boom-giftbox-button";
    this.buttonElement.type = "button";
    this.buttonElement.dir = "rtl";
    this.buttonElement.textContent = GIFTBOX_BUTTON_LABEL;
    this.buttonElement.addEventListener("click", () => this._open());
    document.body.appendChild(this.buttonElement);
  }

  // Part 14 — the experience's own closing interaction, sitting hidden/
  // faded-out until the box has fully closed and disappeared (see
  // _beginClose()'s own closing steps below). A playful "وهسه رضيتي؟؟"
  // question: "لا" dodges away from every attempt to press it (see
  // _dodgeNoButton()), so the only real path forward is "اي رضيت".
  _buildFinalQuestion() {
    this.questionElement = document.createElement("div");
    this.questionElement.id = "boom-giftbox-question";
    this.questionElement.dir = "rtl";
    this.questionElement.innerHTML = `
      <div class="boom-question-frame">
        <span class="boom-question-dot boom-question-dot--tl"></span>
        <span class="boom-question-dot boom-question-dot--tr"></span>
        <span class="boom-question-dot boom-question-dot--bl"></span>
        <span class="boom-question-dot boom-question-dot--br"></span>
        <span class="boom-question-ornament boom-question-ornament--top">♥</span>
        <p class="boom-question-text">${GIFTBOX_QUESTION_TEXT} <span class="boom-question-emoji">${GIFTBOX_QUESTION_EMOJI}</span></p>
        <span class="boom-question-ornament boom-question-ornament--bottom">·· ♥ ··</span>
      </div>
      <div class="boom-question-buttons">
        <button type="button" id="boom-question-yes" class="boom-question-btn boom-question-btn--yes">${GIFTBOX_QUESTION_YES_LABEL}</button>
        <button type="button" id="boom-question-no" class="boom-question-btn boom-question-btn--no">${GIFTBOX_QUESTION_NO_LABEL}</button>
      </div>
      <p class="boom-question-hint">${GIFTBOX_QUESTION_HINT_TEXT}</p>
    `;
    document.body.appendChild(this.questionElement);

    this._answered = false;
    this._noButtonFloating = false;
    this.yesButtonEl = this.questionElement.querySelector("#boom-question-yes");
    this.noButtonEl = this.questionElement.querySelector("#boom-question-no");
    this.questionFrameEl = this.questionElement.querySelector(".boom-question-frame");

    this.yesButtonEl.addEventListener("click", () => this._answerYes());
    this._noDodgeHandler = (event) => this._dodgeNoButton(event);
    this.noButtonEl.addEventListener("pointerdown", this._noDodgeHandler);
  }

  // The "لا" button never lets itself be pressed — every attempt (caught
  // on pointerdown, before a click can land, so it works for both mouse
  // and touch) hops it to a fresh random spot that stays fully inside the
  // viewport and clear of both the question frame and "اي رضيت". The
  // first dodge freezes its current on-screen spot into an inline
  // position: fixed (matching its flow position exactly, so there's no
  // jump) before animating away — CSS handles the actual glide via the
  // left/top transition on .boom-question-btn.
  _dodgeNoButton(event) {
    event.preventDefault();
    if (this._answered) return;

    const btn = this.noButtonEl;
    const rect = btn.getBoundingClientRect();

    if (!this._noButtonFloating) {
      btn.style.position = "fixed";
      btn.style.margin = "0";
      btn.style.left = `${rect.left}px`;
      btn.style.top = `${rect.top}px`;
      this._noButtonFloating = true;
      // Force layout so the frozen position above is committed before
      // the random target below starts the actual animated move.
      void btn.offsetWidth;
    }

    const margin = 16;
    const buffer = 20;
    const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
    const maxTop = Math.max(margin, window.innerHeight - rect.height - margin);

    const forbidden = [this.yesButtonEl.getBoundingClientRect(), this.questionFrameEl.getBoundingClientRect()];

    let left = rect.left;
    let top = rect.top;

    for (let attempt = 0; attempt < 20; attempt++) {
      const candidateLeft = margin + Math.random() * (maxLeft - margin);
      const candidateTop = margin + Math.random() * (maxTop - margin);
      const candidate = {
        left: candidateLeft - buffer,
        top: candidateTop - buffer,
        right: candidateLeft + rect.width + buffer,
        bottom: candidateTop + rect.height + buffer,
      };
      const overlaps = forbidden.some(
        (zone) => candidate.left < zone.right && candidate.right > zone.left && candidate.top < zone.bottom && candidate.bottom > zone.top,
      );
      left = candidateLeft;
      top = candidateTop;
      if (!overlaps) break;
    }

    btn.style.left = `${left}px`;
    btn.style.top = `${top}px`;
  }

  // The only real answer — locks the screen in its answered state, then
  // (Part 15) smoothly dismisses the whole question UI before handing
  // off to the finite heart-fall celebration (see FinalHeartFall.js).
  _answerYes() {
    if (this._answered) return;
    this._answered = true;

    this.noButtonEl.removeEventListener("pointerdown", this._noDodgeHandler);
    this.yesButtonEl.disabled = true;
    this.noButtonEl.disabled = true;
    this.questionElement.classList.add("is-answered");
    this.questionElement.style.pointerEvents = "none";

    gsap.to(this.questionElement, {
      opacity: 0,
      scale: 0.92,
      duration: GIFTBOX_QUESTION_EXIT_DURATION,
      ease: "power2.in",
      onComplete: () => {
        // Fully out of the layout/paint path, not just invisible — the
        // brief's own "no invisible elements blocking interaction".
        this.questionElement.classList.remove("is-visible");
        this.questionElement.style.display = "none";
        setPhase("final-heart-rain"); // TEMP PROFILING
        // The heart-rain overlay is a full-screen fixed layer above this
        // scene's own canvas, and by this point the box/letter/photos
        // are already hidden (see _beginClose() above) — nothing in the
        // 3D scene is visible anymore, EXCEPT HeartField's own ongoing
        // background particles, which otherwise keep animating/drawing
        // forever behind it for no visible reason. Freeze + hide them
        // now so the only real per-frame work left is the heart-rain's
        // own fixed pool.
        this.heartField.hide();
        this._heartFall.play();
      },
    });
  }

  // The box's own entrance: fully opaque and at its normal scale from
  // the very first frame (no fade/scale tween — see
  // GIFTBOX_ENTRANCE_* comment above, now only used as the closed
  // box's resting look, not an animation), just parked above the
  // camera's own visible frustum until the user pulls the handle down
  // (see _buildPullHandle()/_applyPullProgress() above). The "افتح"
  // button only appears once that pull actually completes (_completePull()).
  show() {
    if (this._shown) return;
    this._shown = true;

    this.group.visible = true;
    this.group.scale.setScalar(1);
    this._materials.forEach((material) => {
      material.opacity = 1;
    });

    this._pullHiddenY = this._computePullHiddenY();
    this.group.position.y = this._pullHiddenY;

    this.pullElement.classList.add("is-visible");
  }

  // Lifts the lid (+ its own ribbon segments + bow, all riding along as
  // lidHinge's children) a touch, then rotates lidHinge itself backward
  // around the lid's own rear edge — the body/its own ribbon segments
  // are never touched, so they stay completely stationary throughout.
  // The warm glow only starts ramping up once the ROTATE tween begins,
  // not during the lift.
  _open() {
    if (!this._shown || this._opened) return;
    this._opened = true;

    this.buttonElement.disabled = true;
    this.buttonElement.classList.remove("is-visible");

    setPhase("gift-box-opening"); // TEMP PROFILING

    const tl = gsap.timeline();
    this._openTimeline = tl;

    tl.to(
      [this.lid.position, ...this.lidRibbons.map((ribbon) => ribbon.position), this.bow.position],
      { y: `+=${GIFTBOX_LIFT_HEIGHT}`, duration: GIFTBOX_LIFT_DURATION, ease: GIFTBOX_OPEN_EASE },
    );
    tl.to(
      this.lidHinge.rotation,
      { x: GIFTBOX_ROTATE_OPEN_ANGLE, duration: GIFTBOX_ROTATE_DURATION, ease: GIFTBOX_OPEN_EASE },
    );
    tl.to(
      this.glowLight,
      { intensity: GIFTBOX_GLOW_INTENSITY, duration: GIFTBOX_GLOW_FADE_DURATION, ease: "sine.out" },
      "<",
    );

    // Part 3 — the cinematic rise ABOVE the box + tilt down into it,
    // timed off the lift tween's own start (index 0) rather than "<" off
    // the glow, so it begins a beat after the lid starts lifting
    // regardless of any later reordering above. camera.lookAt() has to
    // be re-run every tween frame (not just once at the end) since it's
    // a one-shot orientation call, not an animatable property itself.
    tl.to(
      this.camera.position,
      {
        y: GIFTBOX_CAMERA_ELEVATED_Y,
        z: GIFTBOX_CAMERA_ELEVATED_Z,
        duration: GIFTBOX_CAMERA_MOVE_DURATION,
        ease: GIFTBOX_CAMERA_MOVE_EASE,
        onStart: () => setPhase("camera-transition"), // TEMP PROFILING
        onUpdate: () => this.camera.lookAt(0, GIFTBOX_CAMERA_LOOKAT_Y, 0),
      },
      GIFTBOX_CAMERA_MOVE_DELAY,
    );

    // Part 4 — hands the box's own interior footprint to HeartField
    // right as the camera starts rising, so any heart/dot/yellow
    // particle drifting through it fades out over the same window
    // instead of staying visible through the open lid.
    tl.call(
      () =>
        this.heartField.hideInteriorRegion({
          minX: -GIFTBOX_INTERIOR_FADE_HALF_WIDTH,
          maxX: GIFTBOX_INTERIOR_FADE_HALF_WIDTH,
          minY: -GIFTBOX_INTERIOR_FADE_HALF_HEIGHT,
          maxY: GIFTBOX_INTERIOR_FADE_HALF_HEIGHT,
        }),
      null,
      GIFTBOX_CAMERA_MOVE_DELAY,
    );

    // The envelope only appears once the camera's own rise-and-tilt
    // tween (started above at GIFTBOX_CAMERA_MOVE_DELAY, taking
    // GIFTBOX_CAMERA_MOVE_DURATION) has actually finished settling —
    // plus a small buffer (see LetterConstants.js's own LETTER_SHOW_DELAY).
    tl.call(
      () => this.letter.show(),
      null,
      GIFTBOX_CAMERA_MOVE_DELAY + GIFTBOX_CAMERA_MOVE_DURATION + LETTER_SHOW_DELAY,
    );

    // Photo placeholders reveal alongside the envelope itself — same
    // moment, same trigger, no separate timing of their own yet.
    tl.call(
      () => this.photoPlaceholders.show(),
      null,
      GIFTBOX_CAMERA_MOVE_DELAY + GIFTBOX_CAMERA_MOVE_DURATION + LETTER_SHOW_DELAY,
    );
  }

  // Part 9 — the final close, triggered once letter/Letter.js's own
  // افتحي sequence reaches "complete" (PHOTO 3 fully returned, its own
  // seal button already faded/disabled at that same moment). Reuses the
  // existing lid/hinge/bow/ribbon objects and the same lift-height/
  // rotate-duration/ease the open sequence above already established —
  // just run in reverse — plus the camera easing back to the scene's own
  // original static shot (see ../Constants.js's own BOOM_CAMERA_Z, the
  // exact pose BoomScene.create() starts the camera at).
  _beginClose() {
    if (!this._opened || this._closed) return;
    this._closed = true;

    this.photoPlaceholders.lock();

    const tl = gsap.timeline();
    this._closeTimeline = tl;

    // Step 1 — envelope + photo cards settle deeper into the interior,
    // as if being tucked back inside, rather than fading/teleporting away.
    tl.call(() => {
      this.letter.retractIntoBox(GIFTBOX_CLOSE_RETRACT_DURATION);
      this.photoPlaceholders.retractIntoBox(GIFTBOX_CLOSE_RETRACT_DURATION);
    });

    const lidStartAt = GIFTBOX_CLOSE_RETRACT_DURATION + GIFTBOX_CLOSE_PAUSE_DURATION;

    // Step 2 — the warm interior glow fades out alongside the lid
    // closing, the exact reverse of _open()'s own ramp-up.
    tl.to(
      this.glowLight,
      { intensity: 0, duration: GIFTBOX_CLOSE_GLOW_FADE_DURATION, ease: "sine.in" },
      lidStartAt,
    );

    // Rotate the lid (+ its own ribbon segments + bow, riding along as
    // lidHinge's children) back down first, then lower it the same
    // GIFTBOX_LIFT_HEIGHT it was lifted by in _open() — mirroring that
    // same two-stage motion in reverse order so the lid visibly seats
    // itself onto the body at the very end, not before.
    tl.to(
      this.lidHinge.rotation,
      { x: 0, duration: GIFTBOX_ROTATE_DURATION, ease: GIFTBOX_OPEN_EASE },
      lidStartAt,
    );
    tl.to(
      [this.lid.position, ...this.lidRibbons.map((ribbon) => ribbon.position), this.bow.position],
      { y: `-=${GIFTBOX_LIFT_HEIGHT}`, duration: GIFTBOX_LIFT_DURATION, ease: GIFTBOX_OPEN_EASE },
      lidStartAt + GIFTBOX_ROTATE_DURATION,
    );

    // Step 3 — camera eases back to the scene's own original static shot
    // (BOOM_CAMERA_Z, looking at the origin) — never a hard cut.
    tl.to(
      this.camera.position,
      {
        x: 0,
        y: 0,
        z: BOOM_CAMERA_Z,
        duration: GIFTBOX_CAMERA_MOVE_DURATION,
        ease: GIFTBOX_CAMERA_MOVE_EASE,
        onUpdate: () => this.camera.lookAt(0, 0, 0),
      },
      lidStartAt + GIFTBOX_ROTATE_DURATION + GIFTBOX_LIFT_DURATION + GIFTBOX_CLOSE_CAMERA_DELAY,
    );

    // Step 4 — final CLOSED/COMPLETE state: nothing above can ever run
    // again (this._closed already guards _beginClose() itself; the
    // letter/photoPlaceholders locks above guard every other trigger).
    tl.call(() => {
      this._closedComplete = true;
    });

    // Step 5 — Part 10: the letter/photo groups are already retracted
    // deep inside the closed box and permanently locked (Step 1/above),
    // so they're hidden outright here rather than faded — by the time
    // the box itself becomes translucent enough to reveal its own
    // interior, they're already gone. Then the whole box (body, lid,
    // ribbons — this._materials, the exact set show()'s own entrance
    // fade already animates) fades away the same way it faded IN, and
    // once it's gone, the closing line takes its place.
    tl.call(() => {
      this.letter.group.visible = false;
      this.photoPlaceholders.group.visible = false;
    });
    tl.to(
      this._materials,
      { opacity: 0, duration: GIFTBOX_FINAL_FADE_DURATION, ease: "sine.inOut" },
      `+=${GIFTBOX_FINAL_FADE_DELAY}`,
    );
    tl.call(() => {
      this.group.visible = false;
      this.questionElement.classList.add("is-visible");
      // Entrance is driven by GSAP (not a CSS class transform) so the
      // inline transform gets cleared once it settles — leaving the
      // container permanently transform-free, which matters because a
      // lingering transform on an ancestor would hijack the "لا"
      // button's own position: fixed containing block away from the
      // viewport once it starts dodging.
      gsap.fromTo(
        this.questionElement,
        { opacity: 0, scale: 0.92 },
        { opacity: 1, scale: 1, duration: GIFTBOX_QUESTION_ENTRANCE_DURATION, ease: "power2.out", clearProps: "opacity,scale,transform" },
      );
    });
  }

  update(delta) {
    this.letter.update(delta);

    // TEMP PROFILING — logs once/sec while the final heart-rain is
    // active, to confirm: the active/DOM heart pool stays fixed, the
    // settled count grows without growing per-frame work, there's
    // exactly one accumulation canvas (never recreated), the GSAP tween
    // count isn't climbing, and HeartField is actually frozen+hidden
    // (not still silently drawing behind the overlay). Remove this
    // block (and the setPhase() call site in _answerYes() above) once
    // verified — see PerfPhase.js.
    if (this._heartFall.container) {
      this._debugAccum = (this._debugAccum || 0) + delta;
      if (this._debugAccum >= 1) {
        this._debugAccum = 0;
        console.log(
          `[PERF final-heart-rain]\n` +
            `active pool: ${this._heartFall._pool.length}\n` +
            `pile state: ${this._heartFall._state}\n` +
            `settled: ${this._heartFall._settledData.length}\n` +
            `canvases: ${document.querySelectorAll(".boom-heartfall-canvas").length}\n` +
            `gsap tweens: ${gsap.globalTimeline.getChildren(true, true, true).length}\n` +
            `heartField frozen: ${this.heartField._driftPaused}\n` +
            `heartField meshes visible: ${this.heartField.heartMeshes[0]?.visible}`,
        );
      }
    }
    // END TEMP PROFILING
  }

  destroy() {
    if (this._openTimeline) this._openTimeline.kill();
    if (this._closeTimeline) this._closeTimeline.kill();
    gsap.killTweensOf(this.group.scale);
    gsap.killTweensOf(this.group.position);
    gsap.killTweensOf(this._materials);
    gsap.killTweensOf(this.lidHinge.rotation);
    gsap.killTweensOf(this.glowLight);
    gsap.killTweensOf(this.camera.position);
    gsap.killTweensOf([this.lid.position, ...this.lidRibbons.map((ribbon) => ribbon.position), this.bow.position]);
    gsap.killTweensOf(this.pullCordEl);
    gsap.killTweensOf(this.pullElement);

    this.pullHandleEl.removeEventListener("mousedown", this._onPullDown);
    this.pullHandleEl.removeEventListener("touchstart", this._onPullDown);
    window.removeEventListener("mousemove", this._onPullMove);
    window.removeEventListener("touchmove", this._onPullMove);
    window.removeEventListener("mouseup", this._onPullUp);
    window.removeEventListener("touchend", this._onPullUp);
    window.removeEventListener("touchcancel", this._onPullUp);
    this.pullElement.remove();

    this.letter.destroy();
    this.photoPlaceholders.destroy();

    this.scene.remove(this.group);
    disposeGiftBox({
      body: this.body,
      innerBottom: this.innerBottom,
      innerWalls: this.innerWalls,
      lid: this.lid,
      bodyRibbons: this.bodyRibbons,
      lidRibbons: this.lidRibbons,
      bow: this.bow,
      materials: this._materials,
    });

    gsap.killTweensOf(this.questionElement);
    this._heartFall.destroy();
    this._finalMessage.destroy();
    this.buttonElement.remove();
    this.questionElement.remove();
  }
}
