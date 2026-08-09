import { AUDIO_CUE_ACTIONS } from "./AudioConstants";

// Interprets a per-template cue map — plain data of the shape
// { "semantic:event": cueDescriptor | cueDescriptor[] } — by subscribing
// to each event on an AudioManager and turning its cue(s) into the
// matching AudioManager call. This is the only place that knows how to
// read a cue descriptor; it has no idea which template it's serving or
// what any of the sounds are — that knowledge lives entirely in the cue
// map it's given (see <template>/audio/<Name>AudioCues.js).
//
// A cue descriptor's shape mirrors whichever AudioManager method its
// `action` maps to — e.g. a "play" cue's fields are exactly play()'s
// options (id/bus/volume/loop/delay/fadeIn/...), a "duck" cue's fields
// are duck()'s options. `url: null` (no asset supplied yet) is treated
// as an inert placeholder rather than an error, the same convention the
// rest of this project already uses for not-yet-supplied content.
export default class AudioCuePlayer {
  constructor(audio, cueMap = {}) {
    this.audio = audio;

    this.unsubscribers = Object.entries(cueMap).map(([event, cues]) =>
      audio.on(event, () => this._run(cues)),
    );
  }

  _run(cueOrCues) {
    const cues = Array.isArray(cueOrCues) ? cueOrCues : [cueOrCues];
    cues.forEach((cue) => this._runOne(cue));
  }

  _runOne(cue) {
    const needsUrl =
      cue.action === AUDIO_CUE_ACTIONS.PLAY ||
      cue.action === AUDIO_CUE_ACTIONS.CROSSFADE;

    if (needsUrl && !cue.url) return;

    switch (cue.action) {
      case AUDIO_CUE_ACTIONS.PLAY:
        this.audio.play(cue.url, cue);
        break;

      case AUDIO_CUE_ACTIONS.CROSSFADE:
        this.audio.crossfade(cue.id, cue.url, cue);
        break;

      case AUDIO_CUE_ACTIONS.STOP:
        this.audio.stop(cue.id, cue);
        break;

      case AUDIO_CUE_ACTIONS.FADE:
        this.audio.fade(cue.id, cue.volume, cue.duration);
        break;

      case AUDIO_CUE_ACTIONS.DUCK:
        this.audio.duck(cue.id, cue);
        break;

      default:
        console.warn(`AudioCuePlayer: unknown cue action "${cue.action}"`);
    }
  }

  destroy() {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers = [];
  }
}
