import * as THREE from "three";

const VERTEX_SHADER = `
  attribute float size;
  attribute float alpha;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = color;
    vAlpha = alpha;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

    gl_PointSize = size;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv);

    if (d > 0.5) discard;

    float edge = smoothstep(0.5, 0.15, d);

    gl_FragColor = vec4(vColor, vAlpha * edge);
  }
`;

const STAR_WHITE = new THREE.Color("#ffffff");
const STAR_BLUE = new THREE.Color("#bcd4ff");
const STAR_GOLD = new THREE.Color("#ffe3ad");

export default class Stars {
  constructor(scene) {
    this.scene = scene;

    this.create();
  }

  create() {
    const count = 12000;

    const pixelRatio = Math.min(window.devicePixelRatio, 2);

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = THREE.MathUtils.randFloatSpread(140);
      positions[i * 3 + 1] = THREE.MathUtils.randFloatSpread(90);
      positions[i * 3 + 2] = THREE.MathUtils.randFloatSpread(140);

      const roll = Math.random();

      let color;

      if (roll < 0.88) {
        color = STAR_WHITE;
      } else if (roll < 0.95) {
        color = STAR_BLUE;
      } else {
        color = STAR_GOLD;
      }

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = THREE.MathUtils.randFloat(1, 2) * pixelRatio;

      alphas[i] = THREE.MathUtils.randFloat(0.3, 0.95);
    }

    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    geometry.setAttribute("alpha", new THREE.BufferAttribute(alphas, 1));

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geometry, this.material);

    this.scene.add(this.points);
  }

  update(delta) {
    const time = performance.now() * 0.0001;

    this.points.rotation.y += delta * 0.02;
    this.points.rotation.x = Math.sin(time) * 0.06;
    this.points.rotation.z = Math.cos(time) * 0.045;
  }

  destroy() {
    this.scene.remove(this.points);

    this.points.geometry.dispose();

    this.material.dispose();
  }
}
