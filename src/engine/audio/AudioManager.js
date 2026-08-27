import {
  AUDIO_BUSES,
  DEFAULT_BUS,
  DEFAULT_FADE_DURATION,
  DEFAULT_CROSSFADE_DURATION,
  DEFAULT_DUCK_VOLUME,
  DEFAULT_DUCK_FADE_DURATION,
  DEFAULT_DUCK_HOLD_DURATION,
  DEFAULT_DUCK_RESTORE_DURATION,
} from "./AudioConstants";
import { resolveAudioContextClass } from "./AudioUtils";
import AudioBus from "./AudioBus";
import AudioLoader from "./AudioLoader";
import AudioPlayer from "./AudioPlayer";
import AudioTimeline from "./AudioTimeline";
import AudioSettings from "./AudioSettings";
import { SILENT_UNLOCK_AUDIO_DATA_URI } from "./SilentUnlockAsset";

let instance = null;

// The single coordinator every template talks to. It owns the
// AudioContext, the four buses, the loader, the settings, and the
// timeline, and composes them into one small public API (play/fade/
// stop/crossfade/preload/volumes/mute/on/off/trigger) — templates never
// see an AudioBuffer, GainNode, or AudioBufferSourceNode directly.
export default class AudioManager {
  constructor() {
    if (instance) return instance;
    instance = this;

    const ContextClass = resolveAudioContextClass();
    this.context = new ContextClass();

    const master = new AudioBus(this.context, this.context.destination);

    this.buses = {
      [AUDIO_BUSES.MASTER]: master,
      [AUDIO_BUSES.BGM]: new AudioBus(this.context, master.input),
      [AUDIO_BUSES.SFX]: new AudioBus(this.context, master.input),
      [AUDIO_BUSES.AMBIENT]: new AudioBus(this.context, master.input),
    };

    this.loader = new AudioLoader(this.context);
    this.timeline = new AudioTimeline();
    this.settings = new AudioSettings();

    this.players = new Map(); // id -> the current AudioPlayer for that id
    this.activePlayers = new Set(); // every live AudioPlayer, id or not
    this._duckTimers = new Map(); // id -> pending restore timer, see duck()

    this._syncFromSettings(this.settings.values);
    this._unsubscribeSettings = this.settings.onChange((values) =>
      this._syncFromSettings(values),
    );

    this._setupUnlock();

    // Lazily created by _unlockPlaybackCategory() the first time resume()
    // runs — see there.
    this._silentUnlockAudio = null;
  }

  // Public passthrough so a template can call resume() synchronously
  // from inside its own trusted gesture handler (e.g. a seal/button
  // click), rather than relying solely on the generic window-level
  // listeners in _setupUnlock — iOS Safari only reliably unlocks an
  // AudioContext when resume() is invoked as one of the very first
  // things a real user-gesture handler does, not a few ticks later
  // from a bubbled/delegated listener. Safe to call redundantly (a
  // running context just resolves immediately), and still funnels
  // through the same _attemptUnlock used by the generic listeners so
  // _unlockPromise resolves and those listeners tear down normally.
  resume() {
    this._unlockPlaybackCategory();
    return this._attemptUnlock ? this._attemptUnlock() : this.context.resume();
  }

  // A resumed/running AudioContext is not, by itself, enough to be heard
  // on iOS: Safari still routes pure-Web-Audio-API output through the
  // "ambient" AVAudioSession category, which the phone's hardware ring/
  // silent switch mutes. iOS only promotes the page to the "playback"
  // category (which ignores that switch) once some HTMLMediaElement has
  // actually been played — there's no way to request that category
  // directly from Web Audio itself. So this plays one real, looping,
  // silent <audio> element (an inline data-URI clip — see
  // SilentUnlockAsset.js — so there's no network request to fail) from
  // inside the exact same trusted gesture resume() itself must be called
  // from. It's kept looping and referenced on `this` for the rest of the
  // page's life (not fire-and-forget) since letting it stop or get
  // garbage-collected can drop the session category again. Safe to call
  // on every resume(): the element is created once, and re-calling
  // play() on an already-looping element is a harmless no-op.
  _unlockPlaybackCategory() {
    if (!this._silentUnlockAudio) {
      const audio = new Audio(SILENT_UNLOCK_AUDIO_DATA_URI);
      audio.loop = true;
      audio.volume = 0.02;
      audio.playsInline = true;
      audio.preload = "auto";
      this._silentUnlockAudio = audio;
    }

    // iOS requires this call itself to happen synchronously inside the
    // gesture — the promise it returns settling later (or rejecting) is
    // fine and deliberately ignored here.
    this._silentUnlockAudio.play().catch(() => {});
  }

  // ---- playback ----------------------------------------------------

  // Starts `url` on a bus and returns the AudioPlayer once it's actually
  // playing (after loading, decoding, and the autoplay unlock all
  // settle). Passing the same `id` as an already-playing sound replaces
  // it — the old voice is stopped once the new one starts, so callers
  // never end up with two overlapping instances under one id (e.g.
  // restarting background music).
  async play(url, options = {}) {
    const { id = null } = options;
    const previous = id ? this.players.get(id) : null;

    const player = await this._startPlayer(url, options);

    if (previous && previous !== player) {
      previous.stop();
    }

    return player;
  }

  // Fades `id`'s current sound out while fading `url` in on the same
  // bus/id — the standard "swap the background track" move. If nothing
  // is currently playing under `id`, this just behaves like play().
  async crossfade(id, url, options = {}) {
    const {
      bus = AUDIO_BUSES.BGM,
      volume = 1,
      loop = true,
      duration = DEFAULT_CROSSFADE_DURATION,
    } = options;

    const previous = id ? this.players.get(id) : null;

    const player = await this._startPlayer(url, {
      id,
      bus,
      volume,
      loop,
      fadeIn: duration,
    });

    if (previous && previous !== player) {
      previous.stop({ fadeOut: duration });
    }

    return player;
  }

  stop(id, options = {}) {
    const player = this.players.get(id);
    if (player) player.stop(options);
  }

  stopAll(options = {}) {
    for (const player of [...this.activePlayers]) {
      player.stop(options);
    }
  }

  fade(id, volume, duration = DEFAULT_FADE_DURATION) {
    const player = this.players.get(id);
    if (player) player.fadeTo(volume, duration);
  }

  // Briefly lowers `id`'s volume (e.g. an ambient bed) so something else
  // can be heard clearly over it, then restores it — "music dips while a
  // reveal sound plays, then comes back up". Calling duck() again for the
  // same id before it's restored replaces the pending restore rather than
  // racing it.
  duck(id, options = {}) {
    const player = this.players.get(id);
    if (!player) return;

    const {
      to = DEFAULT_DUCK_VOLUME,
      fadeDuration = DEFAULT_DUCK_FADE_DURATION,
      holdDuration = DEFAULT_DUCK_HOLD_DURATION,
      restoreDuration = DEFAULT_DUCK_RESTORE_DURATION,
    } = options;

    const original = player.baseVolume;

    player.fadeTo(to, fadeDuration);

    const existingTimer = this._duckTimers.get(id);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(
      () => {
        player.fadeTo(original, restoreDuration);
        this._duckTimers.delete(id);
      },
      (fadeDuration + holdDuration) * 1000,
    );

    this._duckTimers.set(id, timer);
  }

  preload(urls) {
    return this.loader.preload(urls);
  }

  // ---- volumes / mute (delegate to AudioSettings; buses resync via
  // its onChange subscription — see _syncFromSettings) ---------------

  setMasterVolume(value) {
    this.settings.setMasterVolume(value);
  }

  setMusicVolume(value) {
    this.settings.setMusicVolume(value);
  }

  setSfxVolume(value) {
    this.settings.setSfxVolume(value);
  }

  setAmbientVolume(value) {
    this.settings.setAmbientVolume(value);
  }

  mute() {
    this.settings.setMuted(true);
  }

  unmute() {
    this.settings.setMuted(false);
  }

  toggleMute() {
    this.settings.setMuted(!this.settings.muted);
  }

  // ---- timeline -------------------------------------------------

  on(event, handler) {
    return this.timeline.on(event, handler);
  }

  off(event, handler) {
    this.timeline.off(event, handler);
  }

  trigger(event, payload) {
    this.timeline.trigger(event, payload);
  }

  // ---- internals ------------------------------------------------

  async _startPlayer(
    url,
    { id = null, bus = DEFAULT_BUS, volume = 1, loop = false, delay = 0, when, fadeIn = 0 } = {},
  ) {
    const buffer = await this.loader.load(url);
    await this._unlockPromise;

    const targetBus = this.buses[bus] || this.buses[DEFAULT_BUS];

    const player = new AudioPlayer(this.context, buffer, targetBus, {
      loop,
      volume,
      onEnded: (endedPlayer) => this._untrack(id, endedPlayer),
    });

    this._track(id, player);
    player.play({ delay, when, fadeIn });

    return player;
  }

  _track(id, player) {
    this.activePlayers.add(player);
    if (id) this.players.set(id, player);
  }

  _untrack(id, player) {
    this.activePlayers.delete(player);

    // Only clear the id->player slot if it still points at *this*
    // player — a newer play()/crossfade() call for the same id may
    // already have replaced it while this one was fading out.
    if (id && this.players.get(id) === player) {
      this.players.delete(id);

      // Restoring volume on a voice that's gone is meaningless — drop
      // any pending duck() restore for this id along with it.
      const duckTimer = this._duckTimers.get(id);
      if (duckTimer) {
        clearTimeout(duckTimer);
        this._duckTimers.delete(id);
      }
    }
  }

  // Applies masterVolume/musicVolume/sfxVolume/ambientVolume to their
  // buses, and layers global mute on top via each bus's own mute/unmute
  // (rather than zeroing volume directly) so the underlying volume
  // values survive an unmute.
  _syncFromSettings(values) {
    this.buses[AUDIO_BUSES.MASTER].setVolume(values.masterVolume, 0.05);
    this.buses[AUDIO_BUSES.BGM].setVolume(values.musicVolume, 0.05);
    this.buses[AUDIO_BUSES.SFX].setVolume(values.sfxVolume, 0.05);
    this.buses[AUDIO_BUSES.AMBIENT].setVolume(values.ambientVolume, 0.05);

    if (values.muted) {
      this.buses[AUDIO_BUSES.MASTER].mute(0.05);
    } else {
      this.buses[AUDIO_BUSES.MASTER].unmute(0.05);
    }
  }

  // Most browsers create an AudioContext already suspended, and require
  // a user gesture before it can resume — this listens for the first
  // gesture on window, resumes, and self-removes. _startPlayer awaits
  // this before ever calling play() on a source, so callers never have
  // to think about it; they just call play() and it starts as soon as
  // both loading and unlock allow. A template can also call the public
  // resume() above directly from inside its own gesture handler for
  // stricter iOS compliance — both paths fund through _attemptUnlock so
  // there's exactly one place that resolves _unlockPromise and tears
  // down these listeners.
  //
  // iOS Safari can report a WebKit-only fourth state, "interrupted" —
  // outside the Web Audio spec's own suspended/running/closed set —
  // for a context whose audio session hasn't actually been granted yet
  // (observed on a cold, directly-opened Safari tab; never inside an
  // already-foregrounded in-app browser). Calling resume() on an
  // interrupted context is unspecified behavior there, and in practice
  // its returned promise can simply hang forever without resolving or
  // rejecting. So _unlockPromise's real source of truth is
  // `this.context.state === "running"`, checked three ways below —
  // synchronously on each attempt, via the context's own `statechange`
  // event (the one reliable signal WebKit gives for an interruption
  // clearing on its own), and as a resume().then() fast path when it
  // does resolve — not resume()'s promise alone. Each unlock attempt is
  // also safe to repeat (no one-shot latch): a running context resolves
  // resume() immediately anyway, and an interrupted one may only clear
  // after a fresh resume() call once the interruption actually ends.
  _setupUnlock() {
    if (this.context.state === "running") {
      this._unlockPromise = Promise.resolve();
      this._removeUnlockListeners = () => {};
      this._attemptUnlock = () => this._unlockPromise;
      return;
    }

    // "click" is listed alongside the raw pointer/touch/key events
    // because on some mobile browsers a resume() triggered by a bare
    // touchstart/pointerdown never actually settles (the promise just
    // hangs indefinitely) — only a full click carries enough "user
    // activation" for resume() to reliably resolve there. Listeners
    // stay attached until the context actually reaches "running", not
    // just until the first gesture fires, so a stalled attempt from an
    // early touchstart doesn't strip the fallback listeners (including
    // click) before they get a chance to unlock it properly.
    const events = ["pointerdown", "keydown", "touchstart", "click"];
    let resolveUnlock;
    let resolved = false;

    this._unlockPromise = new Promise((resolve) => {
      resolveUnlock = resolve;
    });

    // The single source of truth for "unlocked" — called from every
    // path below. Resolves _unlockPromise exactly once.
    const settleIfRunning = () => {
      if (resolved || this.context.state !== "running") return;
      resolved = true;
      this._removeUnlockListeners();
      resolveUnlock();
    };

    // Attached once, for the life of this unlock cycle — the one
    // reliable signal for an interrupted context clearing on its own.
    this.context.addEventListener("statechange", settleIfRunning);

    this._attemptUnlock = () => {
      // Always safe to (re-)issue — a running context resolves this
      // immediately, and this is also what nudges an interrupted one
      // once the interruption has actually cleared. Its own promise is
      // a fast path when it does resolve, never the only path.
      this.context.resume().then(settleIfRunning, () => {});
      settleIfRunning();
      return this._unlockPromise;
    };

    const unlock = () => this._attemptUnlock();

    this._removeUnlockListeners = () => {
      events.forEach((event) => window.removeEventListener(event, unlock));
      this.context.removeEventListener("statechange", settleIfRunning);
    };

    events.forEach((event) => window.addEventListener(event, unlock));
  }

  destroy() {
    this.stopAll();
    this.timeline.clear();
    this._unsubscribeSettings();
    this.settings.dispose();
    this.loader.dispose();
    this._removeUnlockListeners();

    this._duckTimers.forEach((timer) => clearTimeout(timer));
    this._duckTimers.clear();

    Object.values(this.buses).forEach((bus) => bus.dispose());

    this.context.close().catch(() => {});

    if (this._silentUnlockAudio) {
      this._silentUnlockAudio.pause();
      this._silentUnlockAudio.src = "";
      this._silentUnlockAudio = null;
    }

    instance = null;
  }
}
