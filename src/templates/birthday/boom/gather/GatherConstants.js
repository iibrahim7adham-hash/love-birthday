// ===========================
// Boom — hearts stay scattered after HeartBurst settles; they never
// gather into a shape. This file's only remaining purpose is the one
// constant below, which reveal/Reveal.js reads to scale the
// "hhheeeyyy"/"I love you" text responsively.
// ===========================

// A fixed world-space reference width (world units) used purely to
// convert to on-screen pixels for text sizing (see Reveal.js's own
// _syncHeartScale()) — the shared engine Camera holds horizontal FOV
// constant across every aspect ratio (see engine/camera/Camera.js), so
// a fixed world-space width reads at the same on-screen fraction on
// any device, the same principle bomb/BombConstants.js's own
// BOMB_RADIUS already relies on.
export const GATHER_HEART_WIDTH = 3.1;
