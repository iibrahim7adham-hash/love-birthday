// Registered into AudioManager once at startup (see Scene/StandardScene.js).
// `src: null` means no asset has been supplied yet — AudioManager
// registers it as an inert placeholder rather than erroring, the same
// "placeholder until real content exists" pattern content/config/media.js
// and the luxury template's photo list both use. Drop real files under
// src/assets/audio/ and fill in the path to wire each one up; no other
// code needs to change.
const audio = {
  sounds: [
    { key: "backgroundMusic", src: null, loop: true, volume: 0.5 },
    { key: "blowCandles", src: null, loop: false, volume: 0.8 },
    { key: "firework", src: null, loop: false, volume: 0.6 },
  ],
};

export default audio;
