import { AudioCuePlayer } from "../../../../engine/audio";
import { ALI_MUNEER_AUDIO_CUES } from "./AliMuneerAudioCues";

// This template's entire audio surface: hand the shared engine's
// AudioCuePlayer this template's own event->sound map and it does the
// rest. Nothing here knows how to load, decode, fade, or route audio —
// that's the engine's job (src/engine/audio/).
export default class AliMuneerAudio {
  constructor(audio) {
    this.cuePlayer = new AudioCuePlayer(audio, ALI_MUNEER_AUDIO_CUES);

    // Kick off fetch+decode for every cue's asset right away, this early
    // in the scene's lifecycle (constructed before Opening even plays —
    // see AliMuneerScene.create()) rather than leaving it to happen
    // reactively the moment the envelope is tapped. On standalone iOS
    // Safari, the gap between the seal-tap gesture and the first audible
    // source.start() has to stay short for playback to actually be
    // audible — a network fetch sitting in between that gap is too much
    // async distance from the gesture there. Preloading here means the
    // buffer is normally already decoded and cached by the time the cue
    // fires, so AudioManager._startPlayer's own loader.load() call
    // resolves immediately instead of waiting on the network.
    this._preloadCueAssets(audio);
  }

  // Fire-and-forget by design — this is a reliability optimization, not
  // a requirement. A failure (offline, blocked request, slow network)
  // must not break the page or block the envelope; the existing
  // card:open -> play() path already fetches+decodes on its own if the
  // buffer isn't cached yet, exactly as it did before this existed.
  _preloadCueAssets(audio) {
    const urls = Object.values(ALI_MUNEER_AUDIO_CUES)
      .flatMap((cue) => (Array.isArray(cue) ? cue : [cue]))
      .map((cue) => cue.url)
      .filter(Boolean);

    if (urls.length === 0) return;

    audio.preload(urls).catch(() => {});
  }

  destroy() {
    this.cuePlayer.destroy();
  }
}
