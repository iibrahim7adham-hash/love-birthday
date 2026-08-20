import { AUDIO_BUSES, AUDIO_CUE_ACTIONS } from "../../../../engine/audio";

// Declarative event -> sound mapping for the Ali Muneer template. Only
// event this template's own systems actually emit belongs here (see
// AliMuneerScene.js's audio.trigger() call site in _beginEnvelope) —
// no unreachable entries, same convention as every other template's
// own <Name>AudioCues.js (see love/audio/LoveAudioCues.js).
//
// There is deliberately no visible player UI for this track — it
// starts on its own, and any autoplay-policy block is handled silently
// by AudioManager's own gesture-unlock (see engine/audio/AudioManager.js's
// _setupUnlock): play() just waits for the visitor's first tap/click/
// keypress anywhere on the page before actually starting.
export const ALI_MUNEER_AUDIO_CUES = {
  // Fires the instant the Basmala (Scene 1) has fully faded out and
  // Scene 2 (the envelope) begins — see AliMuneerScene.js's
  // _beginEnvelope(). loop true + a slow fadeIn so the track eases in
  // rather than cutting in abruptly.
  "opening:complete": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    id: "bgm",
    url: "/ali-muneer/audio/idkhili-omri.mp3",
    bus: AUDIO_BUSES.BGM,
    loop: true,
    volume: 0.45,
    fadeIn: 2.5,
  },
};
