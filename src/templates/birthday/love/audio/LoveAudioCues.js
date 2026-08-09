import { AUDIO_BUSES, AUDIO_CUE_ACTIONS } from "../../../../engine/audio";

// Declarative event -> sound mapping for the Love template. Only the
// events this template's own systems actually emit belong here (see
// LoveIntro/HeartFormation/HeartAnimation/LoveMessages for the
// audio.trigger() call sites) — no unreachable entries.
//
// `url: null` means no asset has been chosen yet; AudioCuePlayer treats
// that as an inert placeholder rather than an error. Every field here is
// just that action's AudioManager options — e.g. a "play" cue's fields
// are exactly play()'s (id/bus/volume/loop/fadeIn/...).
export const LOVE_AUDIO_CUES = {
  "intro:start": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    id: "ambient",
    url: null,
    bus: AUDIO_BUSES.AMBIENT,
    loop: true,
    volume: 0.5,
    fadeIn: 2.5,
  },

  "ui:dodge": {
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

  // Fires alongside "ui:click" for the specific "she said yes" moment —
  // a distinct narrative sting, not just a generic button blip.
  "intro:accept": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.6,
  },

  // LoveTransition's own glow expansion beginning — see LoveTransition.js.
  "transition:start": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.5,
    fadeIn: 0.2,
  },

  // Fires once the intro's world has been swapped for the real one,
  // hidden behind the glow — not the same moment as "transition:complete"
  // below, which is when the glow itself finishes fading out.
  // Two things happen at once here — the ambient bed dips briefly while
  // a transition sound plays over it, then the ambience returns on its
  // own (see AudioManager.duck()).
  "intro:complete": [
    {
      action: AUDIO_CUE_ACTIONS.DUCK,
      id: "ambient",
      to: 0.25,
      holdDuration: 1.5,
    },
    {
      action: AUDIO_CUE_ACTIONS.PLAY,
      url: null,
      bus: AUDIO_BUSES.SFX,
      volume: 0.6,
    },
  ],

  // The glow has fully faded and the transition is done playing.
  "transition:complete": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.4,
  },

  "heart:formation-start": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    id: "heartFormation",
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.4,
    fadeIn: 0.5,
  },

  "heart:formation-complete": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.6,
  },

  // Fires once, when the first message starts falling — never per
  // message, so it can't become an annoying repeating sound.
  "messages:start": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.35,
  },

  // The envelope rising into the foreground — see envelope/Envelope.js.
  "envelope:appear": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.4,
    fadeIn: 0.2,
  },

  // The wax seal breaking, right as the user presses it.
  "envelope:seal-crack": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.65,
  },

  // The flap opening / warm light spilling out.
  "envelope:open": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.5,
  },

  // The letter itself emerging from the envelope — see envelope/Letter.js.
  "letter:emerge": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.5,
    fadeIn: 0.3,
  },

  // The word-by-word message reveal beginning, once the letter has
  // settled — see envelope/Letter.js's emerge().
  "letter:revealStart": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.3,
  },

  // The last word (and signature) have finished fading in.
  "letter:revealComplete": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.4,
  },

  // Fires alongside "letter:revealComplete" — the reading pause itself
  // beginning, sized to the message's own length (see Letter.js's
  // LETTER_READING_DELAY). A distinct event so a future ambient cue
  // could react to "now the viewer is reading" independent of the
  // reveal's own finishing sound.
  "letter:readingStart": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.3,
  },

  // The reading pause is over and the letter is gliding back into the
  // envelope's opening — see Letter.js's returnToEnvelope().
  "letter:return": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.4,
    fadeIn: 0.2,
  },

  // The letter has fully returned inside and the envelope begins
  // closing — see envelope/Envelope.js's _handleEnvelopeClose().
  "envelope:close": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.5,
  },

  // The envelope's own short cinematic exit has finished and it's been
  // removed for good — see Envelope.js's _handleEnvelopeExit().
  "envelope:complete": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.35,
    fadeIn: 0.2,
  },

  // A sticker was clicked and is opening into its enlarged focused
  // view — see stickers/PhotoStickerOrbit.js's _openFocus().
  "sticker:focus-open": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.35,
  },

  // The enlarged photo is closing back into the orbit — see
  // stickers/PhotoStickerOrbit.js's _closeFocus().
  "sticker:focus-close": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.3,
  },
};
