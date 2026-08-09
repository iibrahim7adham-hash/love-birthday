import * as THREE from "three";

import { createGlowTexture } from "../Utils";
import {
  PHOTO_STICKER_GLOW_COLOR,
  PHOTO_STICKER_GLOW_OPACITY,
  PHOTO_STICKER_GLOW_SCALE,
} from "./PhotoStickerConstants";

// One sticker's own visual object — a small wrapper Group holding a
// soft glow sprite behind a polaroid-photo sprite in front (the same
// glow-behind-photo layering the luxury template's own memory-photo
// system already uses — see
// luxury/Transition/BlackHole/MemorySystem.js). Both are THREE.Sprite,
// so both always face the camera by construction; nothing here (or in
// PhotoStickerOrbit) ever computes or applies a manual billboard
// rotation.
//
// This class only knows about ITS OWN look: its sprite pair, its fixed
// individual tilt, and its current scale/opacity. It has no idea what
// an orbit, an angle, or another sticker is — PhotoStickerOrbit owns
// this instance's `group.position` entirely.
export default class PhotoSticker {
  constructor({ texture, tiltRadians }) {
    this.group = new THREE.Group();

    this.glowMaterial = new THREE.SpriteMaterial({
      map: createGlowTexture(PHOTO_STICKER_GLOW_COLOR),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.glow = new THREE.Sprite(this.glowMaterial);
    this.glow.scale.setScalar(PHOTO_STICKER_GLOW_SCALE);
    this.glow.position.z = -0.01;

    // SpriteMaterial's own `rotation` is an in-plane (camera-facing)
    // roll — exactly "tilt without ever going edge-on", since it never
    // touches the sprite's actual billboard orientation, just how its
    // texture sits within that always-camera-facing plane.
    this.photoMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      rotation: tiltRadians,
    });

    this.photo = new THREE.Sprite(this.photoMaterial);

    this.group.add(this.glow);
    this.group.add(this.photo);

    // Starts at (near) zero — PhotoStickerOrbit's entrance animation
    // tweens this up to its final size.
    this.group.scale.setScalar(0.001);
  }

  setScale(value) {
    this.group.scale.setScalar(value);
  }

  setOpacity(value) {
    this.photoMaterial.opacity = value;
    this.glowMaterial.opacity = value * PHOTO_STICKER_GLOW_OPACITY;
  }

  destroy() {
    this.photoMaterial.dispose();
    this.glowMaterial.dispose();
    // Neither the photo texture (owned/reference-counted by
    // PhotoStickerTexture, released by whoever acquired it) nor the
    // glow texture (Utils.createGlowTexture's own shared, cached-by-
    // color map) belongs to this instance to dispose.
  }
}
