// ===========================
// Shared constants for the audio engine. Nothing here holds state or
// does work — just names and defaults every other module agrees on.
// ===========================

// The four mixing channels every bus-aware call (play/setVolume/mute)
// can target. AudioManager routes BGM/SFX/AMBIENT through MASTER, so
// muting/scaling MASTER affects everything while the others stay
// independent of each other.
export const AUDIO_BUSES = {
  MASTER: "master",
  BGM: "bgm",
  SFX: "sfx",
  AMBIENT: "ambient",
};

// A sound plays on SFX unless a call says otherwise — the most common
// case (one-shot UI/effect sounds) needs the least ceremony.
export const DEFAULT_BUS = AUDIO_BUSES.SFX;

// The vocabulary AudioCuePlayer's cue interpreter understands — every
// per-template cue map's `action` field must be one of these. Kept as
// constants so template cue maps and the interpreter never drift on a
// typo'd string.
export const AUDIO_CUE_ACTIONS = {
  PLAY: "play",
  STOP: "stop",
  FADE: "fade",
  CROSSFADE: "crossfade",
  DUCK: "duck",
};

export const DEFAULT_FADE_DURATION = 1;
export const DEFAULT_CROSSFADE_DURATION = 1.5;

// Defaults for AudioManager.duck() — briefly lowering one sound (e.g. an
// ambient bed) while something important plays over it, then restoring
// it. `holdDuration` is how long it stays ducked *after* the dip-down
// fade finishes, before the restore fade begins.
export const DEFAULT_DUCK_VOLUME = 0.2;
export const DEFAULT_DUCK_FADE_DURATION = 0.3;
export const DEFAULT_DUCK_HOLD_DURATION = 1;
export const DEFAULT_DUCK_RESTORE_DURATION = 0.6;

export const AUDIO_SETTINGS_STORAGE_KEY = "memora.audioSettings";

export const DEFAULT_AUDIO_SETTINGS = {
  masterVolume: 1,
  musicVolume: 0.8,
  sfxVolume: 1,
  ambientVolume: 0.7,
  muted: false,
};
