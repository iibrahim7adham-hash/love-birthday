import { AudioCuePlayer } from "../../../../engine/audio";
import { STANDARD_AUDIO_CUES } from "./StandardAudioCues";

// This template's entire audio surface: hand the shared engine's
// AudioCuePlayer this template's own event->sound map and it does the
// rest. Nothing here knows how to load, decode, fade, or route audio —
// that's the engine's job (src/engine/audio/).
export default class StandardAudio {
  constructor(audio) {
    this.cuePlayer = new AudioCuePlayer(audio, STANDARD_AUDIO_CUES);
  }

  destroy() {
    this.cuePlayer.destroy();
  }
}
