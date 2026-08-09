// The real customer-facing sticker photos — the actual images shown in
// the orbiting polaroid frames (see PhotoStickerOrbit.js/PhotoSticker.js
// for the frame/orbit mechanics themselves, which know nothing about
// where an image src came from; PhotoStickerTexture.js's cover-crop
// loader is what turns any of these into a properly-fitted, undistorted
// square texture). Kept as its own file, sibling to
// PhotoStickerPlaceholders.js, so LoveScene.js only ever imports a
// ready-made list rather than hard-coding asset paths itself.
//
// `?url` (same convention luxury/Environment/Hearts.js already uses for
// its heart.glb import) resolves each file to Vite's own bundled,
// hashed asset URL rather than inlining it — these are ordinary
// photos, not decorative textures, so they belong in this template's
// own asset folder rather than the shared src/assets/ tree.
import handHoldWoodFloor from "./photos/hand-hold-wood-floor.jpg?url";
import mirrorSelfie from "./photos/mirror-selfie.jpg?url";
import carHandKiss from "./photos/car-hand-kiss.jpg?url";
import tangledCampfire from "./photos/tangled-campfire.jpg?url";
import zootopiaScarf from "./photos/zootopia-scarf.jpg?url";
import gearShiftHands from "./photos/gear-shift-hands.jpg?url";

// Order here is just load/declaration order — PhotoStickerOrbit already
// distributes however many images it's given evenly around the ring
// with its own randomized-looking per-sticker tilt/phase, so nothing
// about this array's order is meaningful.
export const LOVE_STICKER_PHOTOS = [
  handHoldWoodFloor,
  mirrorSelfie,
  carHandKiss,
  tangledCampfire,
  zootopiaScarf,
  gearShiftHands,
];
