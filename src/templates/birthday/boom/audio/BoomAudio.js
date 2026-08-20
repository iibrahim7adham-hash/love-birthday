import { AudioCuePlayer } from "../../../../engine/audio";
import { BOOM_AUDIO_CUES } from "./BoomAudioCues";

// This template's entire audio surface: hand the shared engine's
// AudioCuePlayer this template's own event->sound map and it does the
// rest — same pattern every other template's own <Name>Audio.js
// follows (see ../../standard/audio/StandardAudio.js). Nothing here
// knows how to load, decode, fade, or route audio — that's the
// engine's job (src/engine/audio/). BOOM_AUDIO_CUES is empty for now
// (see BoomAudioCues.js); this class needs no changes when real cues
// are added there later.
export default class BoomAudio {
  constructor(audio) {
    this.cuePlayer = new AudioCuePlayer(audio, BOOM_AUDIO_CUES);
  }

  destroy() {
    this.cuePlayer.destroy();
  }
}
