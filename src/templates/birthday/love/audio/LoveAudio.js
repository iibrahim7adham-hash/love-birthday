import { AudioCuePlayer } from "../../../../engine/audio";
import { LOVE_AUDIO_CUES } from "./LoveAudioCues";

// This template's entire audio surface: hand the shared engine's
// AudioCuePlayer this template's own event->sound map and it does the
// rest. Nothing here knows how to load, decode, fade, or route audio —
// that's the engine's job (src/engine/audio/).
export default class LoveAudio {
  constructor(audio) {
    this.cuePlayer = new AudioCuePlayer(audio, LOVE_AUDIO_CUES);
  }

  destroy() {
    this.cuePlayer.destroy();
  }
}
