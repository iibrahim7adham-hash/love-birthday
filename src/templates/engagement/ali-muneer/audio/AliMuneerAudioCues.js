import { AUDIO_BUSES, AUDIO_CUE_ACTIONS } from "../../../../engine/audio";

// Declarative event -> sound mapping for the Ali Muneer template. Only
// event this template's own systems actually emit belongs here (see
// envelope/Envelope.js's audio.trigger() call site in _handleOpen) —
// no unreachable entries, same convention as every other template's
// own <Name>AudioCues.js (see love/audio/LoveAudioCues.js).
//
// There is deliberately no visible player UI for this track. It fires
// from inside the seal-tap gesture itself (see Envelope.js's
// _handleOpen, which also calls AudioManager.resume() synchronously
// right before this trigger) rather than on page load, so the actual
// unlock happens inside a trusted user gesture — the reliable path on
// iOS Safari, where a generic delayed/bubbled listener often fails to
// unlock at all.
export const ALI_MUNEER_AUDIO_CUES = {
  // Fires the instant the visitor taps the wax seal to open the
  // envelope — see Envelope.js's _handleOpen(). loop true + a short
  // fadeIn so the track eases in alongside the card's own opening
  // animation rather than cutting in abruptly.
  "card:open": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    id: "bgm",
    url: "/ali-muneer/audio/دخولية.mp3", // "إدخلي عمري"
    bus: AUDIO_BUSES.BGM,
    loop: true,
    volume: 0.45,
    fadeIn: 1,
  },
};
