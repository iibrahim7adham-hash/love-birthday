import { AUDIO_BUSES, AUDIO_CUE_ACTIONS } from "../../../../engine/audio";

// Declarative event -> sound mapping for the Standard template. Only
// the events this template's own systems actually emit belong here
// (see ../StartScreen.js, ../Countdown.js, ../BirthdayMessage.js,
// ../BirthdayReveal.js, ../StandardFireworks.js,
// ../StandardCandleBlowout.js, and ../cake/CakeReveal.js's own
// audio.trigger() call sites) — no unreachable entries. Each step adds
// its own cues as it's built, the same incremental way every other
// template's cue map grew.
//
// `url: null` means no asset has been chosen yet; AudioCuePlayer treats
// that as an inert placeholder rather than an error.
export const STANDARD_AUDIO_CUES = {
  // The START button itself being pressed.
  "standard:start-press": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.5,
  },

  // The START screen has finished dissolving and handed off to
  // whatever comes next.
  "standard:start-complete": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.4,
    fadeIn: 0.2,
  },

  // Each digit's own entrance beat — three separate events (not one
  // "countdown:tick" with a payload) so a future sound designer can
  // give "1" its own more anticipatory sound without any code change.
  "countdown:3": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.45,
  },

  "countdown:2": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.45,
  },

  "countdown:1": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.5,
  },

  // The whole countdown composition has finished dissolving and handed
  // off to the ready state.
  "countdown:complete": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.4,
    fadeIn: 0.2,
  },

  // The "Happy Birthday" moment begins — particles start drifting in.
  "birthday-message:appear": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.4,
    fadeIn: 0.3,
  },

  // The phrase has finished dispersing and handed off to the cake reveal.
  "birthday-message:complete": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.4,
    fadeIn: 0.2,
  },

  // The cake's very first part (the plate) begins forming.
  "cake:formation-start": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.4,
    fadeIn: 0.3,
  },

  // Fires once per part as it materializes (plate, tiers, cream,
  // frosting, sprinkles) — one shared cue rather than a separate event
  // per part name, since they're all the same kind of moment.
  "cake:layer-appear": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.35,
  },

  "cake:candles-appear": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.4,
  },

  "cake:flames-ignite": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.5,
  },

  // The cake is fully formed and lit — the actual "reveal complete"
  // narrative moment (see cake/CakeReveal.js's own _finish() comment on
  // why this fires only once, not again at the very end of the hold).
  "cake:reveal-complete": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.5,
    fadeIn: 0.3,
  },

  // The Birthday Reveal moment begins — particles start gathering above
  // the cake, right before "Happy Birthday" starts writing itself.
  "birthday-reveal:appear": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.4,
    fadeIn: 0.3,
  },

  // Both lines have finished writing and settled — the greeting is now
  // complete and stays visible for the rest of the scene.
  "birthday-reveal:complete": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.45,
    fadeIn: 0.2,
  },

  // Fires once per firework burst.
  "firework:burst": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.35,
  },

  // "انفخ الشموع" pressed — the exactly-once interaction that kicks off
  // the whole blow-out sequence.
  "candle-blowout:press": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.5,
  },

  // The dark pause has finished and StandardFireworks.js's own
  // playCinematicSequence() is starting — the emotional-climax beat.
  "candle-blowout:fireworks-begin": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.5,
    fadeIn: 0.2,
  },
};
