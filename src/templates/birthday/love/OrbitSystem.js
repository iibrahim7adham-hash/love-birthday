import * as THREE from "three";

import {
  PLATFORM_BACK_ALPHA,
  PLATFORM_COLOR,
  PLATFORM_FRONT_ALPHA,
  PLATFORM_RADIUS,
  PLATFORM_RING_WIDTH,
  PLATFORM_ROTATION_SPEED,
  PLATFORM_Y,
} from "./Constants";

// A vertical gradient mapped onto the ring's V coordinate (RingGeometry's
// default UVs put the inner edge at v=0, the outer edge at v=1), so the
// ring glows brightest at its inner edge and fades outward instead of
// reading as a flat, hard-edged band. A scatter of soft light speckles
// is blended on top — without it, the ring is perfectly rotationally
// symmetric, so its slow spin (see update()) would be completely
// invisible; the speckles are what make that motion actually readable.
function createRingTexture() {
  const size = 256;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, "rgba(255, 255, 255, 0.9)");
  gradient.addColorStop(0.4, "rgba(255, 182, 201, 0.45)");
  gradient.addColorStop(1, "rgba(255, 182, 201, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 260; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = Math.random() * 1.4 + 0.3;
    const alpha = Math.random() * 0.4 + 0.15;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;

  return texture;
}

// The same texture-repeat count the old MeshBasicMaterial's
// `map.repeat` used — reapplied manually in the shader below since a
// raw ShaderMaterial doesn't auto-apply a texture's .repeat the way
// the built-in materials do.
const TEXTURE_REPEAT = new THREE.Vector2(5, 1);

const RING_VERTEX_SHADER = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Reproduces exactly what the previous MeshBasicMaterial produced
// (texture sampled and tinted by uColor, same as `color` + `map` on any
// standard material) and multiplies in one more factor: a smooth
// cosine falloff by world-space angle around the ring's own vertical
// axis, dimmest at the far side (away from the camera — behind the
// heart) and brightest at the near side. Using the vertex's actual
// WORLD position (not the ring's local/pre-spin angle) is what keeps
// this fade anchored to the camera's side of the scene regardless of
// the ring's own texture spin (see OrbitSystem.update()) — the
// speckles keep rotating underneath while the fade stays put, exactly
// like something passing behind a fixed foreground object would.
const RING_FRAGMENT_SHADER = `
  uniform sampler2D uMap;
  uniform vec3 uColor;
  uniform vec2 uRepeat;
  uniform float uBackAlpha;
  uniform float uFrontAlpha;

  varying vec2 vUv;
  varying vec3 vWorldPosition;

  void main() {
    vec4 texColor = texture2D(uMap, vUv * uRepeat);

    float worldAngle = atan(vWorldPosition.x, -vWorldPosition.z);
    float frontness = (1.0 - cos(worldAngle)) * 0.5;
    float fade = mix(uBackAlpha, uFrontAlpha, frontness);

    gl_FragColor = vec4(uColor * texColor.rgb, texColor.a * fade);
  }
`;

// The orbit platform — a soft glowing ring beneath the heart, spinning
// slowly around its own vertical axis, fading smoothly on the side
// that passes behind the heart.
export default class OrbitSystem {
  constructor(scene) {
    this.scene = scene;

    const geometry = new THREE.RingGeometry(
      PLATFORM_RADIUS,
      PLATFORM_RADIUS + PLATFORM_RING_WIDTH,
      96,
    );

    const material = new THREE.ShaderMaterial({
      vertexShader: RING_VERTEX_SHADER,
      fragmentShader: RING_FRAGMENT_SHADER,
      uniforms: {
        uMap: { value: createRingTexture() },
        uColor: { value: new THREE.Color(PLATFORM_COLOR) },
        uRepeat: { value: TEXTURE_REPEAT },
        uBackAlpha: { value: PLATFORM_BACK_ALPHA },
        uFrontAlpha: { value: PLATFORM_FRONT_ALPHA },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = PLATFORM_Y;

    this.scene.add(this.mesh);
  }

  // The ring lies exactly flat (rotation.x is a plain -90°), so
  // continuing to spin it on its own local Z axis is already a clean
  // rotation around the vertical — no separate tilt/spin pivot needed,
  // unlike a ring tilted at an arbitrary angle would.
  update(delta) {
    this.mesh.rotation.z += delta * PLATFORM_ROTATION_SPEED;
  }

  destroy() {
    this.mesh.geometry.dispose();
    this.mesh.material.uniforms.uMap.value.dispose();
    this.mesh.material.dispose();
    this.scene.remove(this.mesh);
  }
}
