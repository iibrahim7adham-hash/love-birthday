import { AUDIO_BUSES, AUDIO_CUE_ACTIONS } from "../../../../engine/audio";

// Declarative event -> sound mapping for the Boom template — same
// contract every other template's own cue map follows (see
// ../../standard/audio/StandardAudioCues.js). Only the events Part 1's
// own BombIntro.js actually emits belong here — no unreachable entries
// (same rule StandardAudioCues.js's own header comment states). Sound
// design hasn't happened yet, so every `url` stays null — AudioCuePlayer
// treats that as an inert placeholder, not an error.
export const BOOM_AUDIO_CUES = {
  // The bomb begins entering from the left edge.
  "boom:bomb-enter": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.4,
  },

  // The bomb has settled and the top cap appears.
  "boom:cap-appear": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.35,
  },

  // The fuse emerges from the cap.
  "boom:fuse-appear": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.35,
  },

  // The fuse ignites and the spark starts flickering.
  "boom:fuse-ignite": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.5,
  },

  // Part 2's own handoff moment — the instant the bomb becomes the
  // heart cluster (see heartburst/HeartBurst.js's own ignite()).
  "boom:explosion": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.6,
  },

  // Future entries (the romantic reveal) follow once that system
  // exists, e.g.:
  //   "boom:reveal": { action: AUDIO_CUE_ACTIONS.PLAY, url: null, bus: AUDIO_BUSES.SFX, volume: 0.5, fadeIn: 0.3 },
};
