import gsap from "gsap";
import * as THREE from "three";

import "./LoveIntro.css";

import {
  INTRO_HEART_ALPHA_RANGE,
  INTRO_HEART_COLOR,
  INTRO_HEART_COUNT,
  INTRO_HEART_FADE_IN_DURATION,
  INTRO_HEART_FADE_OUT_DURATION,
  INTRO_HEART_LIFETIME_RANGE,
  INTRO_HEART_ROTATION_SPEED_RANGE,
  INTRO_HEART_SIZE_RANGE,
  INTRO_HEART_SPAWN_BOUNDS,
  INTRO_HEART_VELOCITY,
  INTRO_HEART_WOBBLE_AMOUNT_RANGE,
  INTRO_HEART_WOBBLE_SPEED_RANGE,
  INTRO_NO_EXCLUSION_PADDING,
  INTRO_NO_VIEWPORT_MARGIN,
  INTRO_SUBTITLE,
  INTRO_TITLE,
} from "./Constants";
import FloatingSystem from "./FloatingSystem";
import LoveCamera from "./LoveCamera";
import LoveEnvironment from "./LoveEnvironment";
import Petals from "./Petals";

// A small glowing heart glyph — the intro's own decoration, independent
// of HeartFormation's particle-sampled heart (a completely different
// technique for a completely different purpose: one filled shape on a
// small texture, not a silhouette thousands of particles gather into).
function createHeartTexture() {
  const size = 128;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");

  const cx = size / 2;
  const top = size * 0.34;
  const half = size * 0.26;

  ctx.beginPath();
  ctx.moveTo(cx, top);
  ctx.bezierCurveTo(cx, top - half, cx - half * 2, top - half, cx - half * 2, top);
  ctx.bezierCurveTo(cx - half * 2, top + half * 1.3, cx, top + half * 2.2, cx, top + half * 3.2);
  ctx.bezierCurveTo(cx, top + half * 2.2, cx + half * 2, top + half * 1.3, cx + half * 2, top);
  ctx.bezierCurveTo(cx + half * 2, top - half, cx, top - half, cx, top);
  ctx.closePath();

  ctx.shadowColor = "rgba(255, 150, 190, 0.95)";
  ctx.shadowBlur = 16;
  ctx.fillStyle = "rgba(255, 214, 231, 0.95)";
  ctx.fill();
  ctx.fill();

  return new THREE.CanvasTexture(canvas);
}

function expandRect(rect, padding) {
  return {
    left: rect.left - padding,
    top: rect.top - padding,
    right: rect.right + padding,
    bottom: rect.bottom + padding,
  };
}

function rectsOverlap(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

// A random point for the No button, confined to the viewport (minus a
// safety margin) and guaranteed not to overlap the given exclusion
// rect — plain rejection sampling: cheap, and the exclusion rect is
// always much smaller than the viewport, so a handful of attempts is
// always enough in practice.
function pickSafePosition(buttonRect, exclusionRect) {
  const maxX = window.innerWidth - buttonRect.width - INTRO_NO_VIEWPORT_MARGIN;
  const maxY = window.innerHeight - buttonRect.height - INTRO_NO_VIEWPORT_MARGIN;
  const minX = INTRO_NO_VIEWPORT_MARGIN;
  const minY = INTRO_NO_VIEWPORT_MARGIN;

  for (let attempt = 0; attempt < 30; attempt++) {
    const x = minX + Math.random() * Math.max(maxX - minX, 0);
    const y = minY + Math.random() * Math.max(maxY - minY, 0);

    const candidate = { left: x, top: y, right: x + buttonRect.width, bottom: y + buttonRect.height };

    if (!rectsOverlap(candidate, exclusionRect)) return { x, y };
  }

  return { x: minX, y: minY };
}

// The cinematic "chapter zero" before the main experience begins.
// Owns its own background (reusing LoveEnvironment/Petals/LoveCamera
// exactly as they are, plus a small heart-themed FloatingSystem) and
// its own 2D question/button UI. Nothing about it touches
// HeartFormation, HeartAnimation, OrbitSystem, or LoveMessages — the
// main experience doesn't exist yet while this is showing. Calls
// `onComplete` once — after its own fade-out finishes, never before —
// and the caller decides what happens next.
export default class LoveIntro {
  constructor(scene, camera, onComplete) {
    this.scene = scene;
    this.camera = camera;
    this.onComplete = onComplete;

    this.noPinned = false;

    this.createBackground();
    this.createUI();
    this.animateEntrance();
    this.bindEvents();
  }

  createBackground() {
    this.environment = new LoveEnvironment(this.scene);
    this.petals = new Petals(this.scene);
    this.loveCamera = new LoveCamera(this.camera);

    this.heartTexture = createHeartTexture();

    this.hearts = new FloatingSystem(INTRO_HEART_COUNT, {
      texture: this.heartTexture,
      color: INTRO_HEART_COLOR,
      sizeRange: INTRO_HEART_SIZE_RANGE,
      spawnBounds: INTRO_HEART_SPAWN_BOUNDS,
      driftVelocity: INTRO_HEART_VELOCITY,
      wobbleAmountRange: INTRO_HEART_WOBBLE_AMOUNT_RANGE,
      wobbleSpeedRange: INTRO_HEART_WOBBLE_SPEED_RANGE,
      rotationSpeedRange: INTRO_HEART_ROTATION_SPEED_RANGE,
      lifetimeRange: INTRO_HEART_LIFETIME_RANGE,
      fadeInDuration: INTRO_HEART_FADE_IN_DURATION,
      fadeOutDuration: INTRO_HEART_FADE_OUT_DURATION,
      baseAlphaRange: INTRO_HEART_ALPHA_RANGE,
    });

    this.scene.add(this.hearts.group);
  }

  createUI() {
    this.element = document.createElement("div");
    this.element.id = "love-intro";

    this.element.innerHTML = `
      <div class="love-intro-content">
        <h1 class="love-intro-title">${INTRO_TITLE}</h1>
        <p class="love-intro-subtitle">${INTRO_SUBTITLE}</p>
        <div class="love-intro-buttons">
          <button class="love-intro-yes" type="button">♥ Yes</button>
          <button class="love-intro-no" type="button">No</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.element);

    this.content = this.element.querySelector(".love-intro-content");
    this.title = this.element.querySelector(".love-intro-title");
    this.subtitle = this.element.querySelector(".love-intro-subtitle");
    this.buttonsRow = this.element.querySelector(".love-intro-buttons");
    this.yes = this.element.querySelector(".love-intro-yes");
    this.no = this.element.querySelector(".love-intro-no");
  }

  // Title, then subtitle, then buttons — a gentle cascade (each
  // starting slightly before the last finishes) rather than everything
  // fading in as one block.
  animateEntrance() {
    gsap.timeline()
      .from(this.title, { opacity: 0, y: 24, duration: 1, ease: "power3.out" })
      .from(this.subtitle, { opacity: 0, y: 16, duration: 0.9, ease: "power3.out" }, "-=0.55")
      .from(this.buttonsRow, { opacity: 0, y: 16, duration: 0.9, ease: "power3.out" }, "-=0.5");
  }

  bindEvents() {
    const dodge = (event) => {
      event.preventDefault();

      if (!this.noPinned) {
        const rect = this.no.getBoundingClientRect();

        // Re-parented straight onto <body>, escaping
        // .love-intro-buttons (and everything else the entrance
        // animation puts a `transform` on) — a `position: fixed`
        // descendant of a transformed ancestor positions relative to
        // THAT ancestor, not the viewport, which is not what "move
        // anywhere on screen" means here.
        document.body.appendChild(this.no);

        this.no.style.position = "fixed";
        this.no.style.margin = "0";
        this.no.style.left = `${rect.left}px`;
        this.no.style.top = `${rect.top}px`;

        this.noPinned = true;
      }

      const buttonRect = this.no.getBoundingClientRect();
      const exclusionRect = expandRect(
        this.content.getBoundingClientRect(),
        INTRO_NO_EXCLUSION_PADDING,
      );

      const { x, y } = pickSafePosition(buttonRect, exclusionRect);

      gsap.to(this.no, {
        left: x,
        top: y,
        duration: 0.45,
        ease: "power3.out",
      });
    };

    // pointerdown covers mouse/touch — the button is already moving
    // before a click could ever land. click covers keyboard activation
    // (Enter/Space on a focused button), which fires with no preceding
    // pointerdown. Neither handler does anything except reposition —
    // there is no "No was clicked" outcome to reach.
    this.no.addEventListener("pointerdown", dodge);
    this.no.addEventListener("click", dodge);

    this.yes.addEventListener("click", () => this.handleYes());
  }

  handleYes() {
    this.yes.style.pointerEvents = "none";
    this.no.style.pointerEvents = "none";

    gsap
      .timeline()
      .to(this.yes, {
        scale: 1.12,
        boxShadow: "0 0 40px rgba(255, 173, 209, 1), 0 12px 32px rgba(255, 111, 145, 0.5)",
        duration: 0.2,
        ease: "power2.out",
      })
      .to(this.yes, {
        scale: 1,
        duration: 0.25,
        ease: "power2.inOut",
      })
      .to(
        this.element,
        {
          opacity: 0,
          duration: 0.8,
          ease: "power2.inOut",
        },
        "-=0.05",
      )
      .call(() => {
        this.destroy();
        this.onComplete();
      });
  }

  update(delta) {
    this.environment.update(delta);
    this.petals.update(delta);
    this.hearts.update(delta);
    this.loveCamera.update(delta);
  }

  destroy() {
    this.element.remove();

    // Only actually re-parented (see bindEvents' dodge()) if the user
    // tried to click it at least once — harmless no-op via remove()
    // either way if it's still inside this.element.
    if (this.noPinned) this.no.remove();

    this.environment.destroy();
    this.petals.destroy();
    this.hearts.destroy();
    this.heartTexture.dispose();
    this.scene.remove(this.hearts.group);
  }
}
