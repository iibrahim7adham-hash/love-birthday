import {
  AUDIO_SETTINGS_STORAGE_KEY,
  DEFAULT_AUDIO_SETTINGS,
} from "./AudioConstants";
import { clamp01 } from "./AudioUtils";

// Persisted user preferences (master/music/sfx/ambient volume + mute),
// independent of any live AudioContext or bus. AudioManager reads these
// at startup and resubscribes via onChange() to resync its bus gains
// whenever a setting changes — this module knows nothing about Web Audio.
export default class AudioSettings {
  constructor() {
    this.values = this._load();
    this.listeners = new Set();
  }

  _load() {
    try {
      const raw = window.localStorage.getItem(AUDIO_SETTINGS_STORAGE_KEY);
      if (!raw) return { ...DEFAULT_AUDIO_SETTINGS };

      return { ...DEFAULT_AUDIO_SETTINGS, ...JSON.parse(raw) };
    } catch {
      // Storage unavailable or corrupt — fall back to defaults rather
      // than throwing during construction.
      return { ...DEFAULT_AUDIO_SETTINGS };
    }
  }

  _save() {
    try {
      window.localStorage.setItem(
        AUDIO_SETTINGS_STORAGE_KEY,
        JSON.stringify(this.values),
      );
    } catch {
      // Private browsing / quota exceeded — settings still work for this
      // session, they just won't persist across reloads.
    }
  }

  _set(patch) {
    this.values = { ...this.values, ...patch };
    this._save();
    this._notify();
  }

  _notify() {
    for (const listener of [...this.listeners]) {
      listener(this.values);
    }
  }

  onChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  get masterVolume() {
    return this.values.masterVolume;
  }

  get musicVolume() {
    return this.values.musicVolume;
  }

  get sfxVolume() {
    return this.values.sfxVolume;
  }

  get ambientVolume() {
    return this.values.ambientVolume;
  }

  get muted() {
    return this.values.muted;
  }

  setMasterVolume(value) {
    this._set({ masterVolume: clamp01(value) });
  }

  setMusicVolume(value) {
    this._set({ musicVolume: clamp01(value) });
  }

  setSfxVolume(value) {
    this._set({ sfxVolume: clamp01(value) });
  }

  setAmbientVolume(value) {
    this._set({ ambientVolume: clamp01(value) });
  }

  setMuted(muted) {
    this._set({ muted: !!muted });
  }

  dispose() {
    this.listeners.clear();
  }
}
