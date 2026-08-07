import * as THREE from "three";

// ===========================
// Colors — one red family throughout, so it always reads as "the same
// particles" evolving, never a different system taking over.
// ===========================

export const RED_DEEP = new THREE.Color("#6b0f2a");
export const RED_CRIMSON = new THREE.Color("#c8203f");
export const RED_ROSE = new THREE.Color("#ff4d6d");
export const RED_BRIGHT = new THREE.Color("#ff8fa8");
export const SPARK_WHITE = new THREE.Color("#fff0f2");

// ===========================
// Overall band the accretion disk occupies. The black hole's core
// settles to well under 1 unit of radius (see stabilizeAfterAbsorption
// in Animations.js) — this band is still several times that, so the disk
// dwarfs the core, but kept compact so the camera can sit close and let
// the whole system dominate the frame instead of shrinking the core to a
// speck to fit a sprawling disk in.
// ===========================

export const DISK_INNER_RADIUS = 1.5;
export const DISK_OUTER_RADIUS = 6.8;

// Must match Config.camera.fov in src/engine/core/Config.js — that's the
// vertical fov engine/camera/Camera.js's responsive system treats as the
// baseline for a widescreen shot, and ResponsiveScene.getPointScale()
// needs the same reference point to know how far the CURRENT fov has
// been pushed from it. Not imported directly to keep this template
// self-contained from the engine layer (the same reason no other
// template file imports from engine/); if the engine's baseline fov ever
// changes, update this constant to match.
export const BASE_VERTICAL_FOV = 35;

// Particle counts for the two long-lived clusters this scene ever
// creates — the heart/text pool that lives for the whole journey, and
// the accretion disk built fresh in Scene 3.
export const MAIN_PARTICLE_COUNT = 50000;
export const DISK_PARTICLE_COUNT = 80000;

// The black hole core sphere and its Saturn-style ring.
export const CORE_RADIUS = 1.28;
export const RING_INNER_RADIUS = 2.0;
export const RING_OUTER_RADIUS = 2.5;
export const RING_TILT_DEG = -70;
export const RING_SPIN_SPEED = 0.25;
