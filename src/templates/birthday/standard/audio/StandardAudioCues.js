import { AUDIO_BUSES, AUDIO_CUE_ACTIONS } from "../../../../engine/audio";

// Declarative event -> sound mapping for the Standard template. Only the
// events this template's own systems actually emit belong here — today
// that's "candles:blow" (see scenes/BlowCandlesScene.js), migrated
// straight over from the old bespoke managers/AudioManager.js's
// "blowCandles" entry: same bus role (a one-shot SFX), same volume.
//
// `url: null` means no asset has been chosen yet; AudioCuePlayer treats
// that as an inert placeholder rather than an error — the same "no
// asset supplied yet" convention the old config/audio.js used.
export const STANDARD_AUDIO_CUES = {
  "candles:blow": {
    action: AUDIO_CUE_ACTIONS.PLAY,
    url: null,
    bus: AUDIO_BUSES.SFX,
    volume: 0.8,
  },
};
