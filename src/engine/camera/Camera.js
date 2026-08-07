import { PerspectiveCamera, MathUtils } from "three";

import Config from "../core/Config";

// `Config.camera.fov` is treated as the VERTICAL fov at this baseline
// aspect ratio (a typical widescreen shot) — every other aspect ratio's
// vertical fov is derived FROM this pair rather than reused as-is, so
// the same horizontal "slice" of the 3D world stays visible regardless
// of the viewport's shape. That's the actual fix for "composition
// breaks on phones": a plain PerspectiveCamera holds vertical fov fixed
// and lets horizontal fov shrink with a narrower aspect, which is
// exactly what crops a wide composition (like a wide accretion disk)
// down to a tight sliver on a portrait phone. Holding horizontal fov
// constant instead means every device sees the same amount of scene
// width — just with proportionally more or less vertical headroom.
const BASE_FOV = Config.camera.fov;
const BASE_ASPECT = 16 / 9;

// Past a point, compensating purely through fov starts to look
// fisheye-distorted (very narrow aspects) or telephoto-flat (very wide
// ones) rather than just "more/less of the same shot" — these bound how
// far the compensation is allowed to go.
const MIN_FOV = 25;
const MAX_FOV = 100;

function computeResponsiveFov(aspect) {
  const baseHalfFovRad = MathUtils.degToRad(BASE_FOV / 2);
  const horizontalHalfTan = Math.tan(baseHalfFovRad) * BASE_ASPECT;

  const verticalHalfFovRad = Math.atan(horizontalHalfTan / aspect);
  const fov = MathUtils.radToDeg(verticalHalfFovRad) * 2;

  return MathUtils.clamp(fov, MIN_FOV, MAX_FOV);
}

export default class Camera {
  constructor(sizes) {
    this.sizes = sizes;

    const aspect = this.sizes.width / this.sizes.height;

    this.instance = new PerspectiveCamera(
      computeResponsiveFov(aspect),
      aspect,
      Config.camera.near,
      Config.camera.far,
    );

    // Intro Position
    this.instance.position.set(0, 6, 16);

    // Look at center
    this.instance.lookAt(0, 2, 0);
  }

  resize() {
    const aspect = this.sizes.width / this.sizes.height;

    this.instance.aspect = aspect;
    this.instance.fov = computeResponsiveFov(aspect);
    this.instance.updateProjectionMatrix();
  }

  update() {}

  setPosition(x, y, z) {
    this.instance.position.set(x, y, z);
  }

  lookAt(x, y, z) {
    this.instance.lookAt(x, y, z);
  }
}
