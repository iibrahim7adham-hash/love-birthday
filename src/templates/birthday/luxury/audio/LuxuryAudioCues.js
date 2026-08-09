import { AUDIO_BUSES, AUDIO_CUE_ACTIONS } from "../../../../engine/audio";

// Declarative event -> sound mapping for the Luxury template. Only the
// events this template's own systems actually emit belong here (see
// ui/IntroUI.js and Scene/LuxuryScene.js for the audio.trigger() call
// sites) — no unreachable entries.
//
// `url: null` means no asset has been chosen yet; AudioCuePlayer treats
// that as an inert placeholder rather than an error.
export const LUXURY_AUDIO_CUES = {
  "ui:hover": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.25,
  },

  "ui:click": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.5,
  },

  "transition:start": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.7,
    fadeIn: 0.3,
  },
};
