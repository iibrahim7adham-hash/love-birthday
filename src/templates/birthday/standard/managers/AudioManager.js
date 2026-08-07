// Audio layer — registers named sound sources (from
// content/config/audio.js via registerAll()) and plays/stops them by
// key. Entries with `src: null` register as inert placeholders — same
// "not supplied yet" pattern as content/config/media.js's photos — so
// play() on an unfinished sound is a silent no-op instead of a broken
// network request. Every scene that needs sound goes through this
// manager instead of creating its own <audio> elements, so mute/volume
// stays centralized.
export default class AudioManager {
  constructor() {
    this.sounds = new Map();
    this.muted = false;
  }

  registerAll(entries = []) {
    entries.forEach(({ key, src, loop, volume }) =>
      this.register(key, src, { loop, volume }),
    );
  }

  register(key, src, { loop = false, volume = 1 } = {}) {
    if (!src) {
      this.sounds.set(key, null);
      return;
    }

    const audio = new Audio(src);

    audio.loop = loop;
    audio.volume = volume;

    this.sounds.set(key, audio);
  }

  play(key) {
    if (this.muted) return;

    if (!this.sounds.has(key)) {
      console.warn(`AudioManager: no sound registered as "${key}"`);
      return;
    }

    const audio = this.sounds.get(key);

    if (!audio) return; // registered but no asset supplied yet

    audio.currentTime = 0;

    // Autoplay can be blocked until the user interacts with the page —
    // safe to ignore here, since scenes only call play() after a click
    // (START, Blow the Candles), by which point that gesture exists.
    audio.play().catch(() => {});
  }

  stop(key) {
    const audio = this.sounds.get(key);

    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }

  setMuted(muted) {
    this.muted = muted;
  }

  destroy() {
    this.sounds.forEach((audio) => audio && audio.pause());
    this.sounds.clear();
  }
}
