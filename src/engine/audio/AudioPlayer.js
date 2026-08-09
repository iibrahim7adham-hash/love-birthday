import { rampGain } from "./AudioUtils";

// One playback "voice" — everything about a single sound instance:
// starting it (immediately, delayed, or at a precise scheduled time),
// stopping it, pausing/resuming it, and fading its own volume
// independently of the bus it's routed through. AudioManager creates
// one of these per play() call; the underlying AudioBuffer (owned by
// AudioLoader) is shared and read-only, so the same buffer can be
// played by any number of simultaneous AudioPlayers — e.g. overlapping
// UI click sounds — without re-decoding or re-fetching anything.
//
// Web Audio's AudioBufferSourceNode has no native pause: once started
// it can only be stopped, and a stopped source can never be restarted
// — a fresh one has to be created. pause()/resume() below hide that by
// tracking the offset into the buffer and creating a new source node
// under the hood; callers never need to know.
export default class AudioPlayer {
  constructor(context, buffer, bus, options = {}) {
    this.context = context;
    this.buffer = buffer;
    this.bus = bus;

    this.loop = options.loop || false;
    this.baseVolume = options.volume ?? 1;
    this.onEnded = options.onEnded || null;

    // A per-instance gain node, separate from the bus's own — this is
    // what lets one sound fade in/out or sit at a custom volume
    // without touching the bus (and therefore every other sound
    // sharing it).
    this.gainNode = context.createGain();
    this.gainNode.connect(bus.input);
    this.gainNode.gain.value = 0;

    this.source = null;
    this.playing = false;
    this.startedAt = 0; // AudioContext time playback last started at
    this.pausedOffset = 0; // seconds into the buffer, for pause/resume
  }

  // `delay`: seconds from now. `when`: an absolute AudioContext time —
  // takes precedence over `delay` when both are given, for precise
  // scheduling relative to some other known instant rather than "now".
  // `fadeIn`: seconds to ramp from silent up to baseVolume.
  play({ delay = 0, when, fadeIn = 0 } = {}) {
    const now = this.context.currentTime;
    const startTime = when ?? now + Math.max(delay, 0);

    this._createSource();
    this.source.start(startTime, this.pausedOffset);

    this.startedAt = startTime - this.pausedOffset;
    this.pausedOffset = 0;
    this.playing = true;

    if (fadeIn > 0) {
      this.gainNode.gain.setValueAtTime(0, startTime);
      this.gainNode.gain.linearRampToValueAtTime(
        this.baseVolume,
        startTime + fadeIn,
      );
    } else {
      this.gainNode.gain.setValueAtTime(this.baseVolume, startTime);
    }

    return this;
  }

  // Notifies onEnded synchronously, right here, instead of relying on the
  // source's native "ended" event: that event fires later (after any
  // fadeOut, and only once the scheduled stop() actually takes effect),
  // by which point _stopSourceAt has already nulled `this.source` — so the
  // handler's `this.source === source` guard (which exists to ignore
  // *this* case and only react to truly natural completion) would always
  // be false and onEnded would never fire. Calling it here instead means
  // AudioManager finds out immediately that this voice is done and can
  // drop it from its active-players tracking right away.
  stop({ fadeOut = 0 } = {}) {
    if (!this.source) return;

    if (fadeOut > 0) {
      const stopAt = this.context.currentTime + fadeOut;

      rampGain(this.gainNode.gain, this.context, 0, fadeOut);
      this._stopSourceAt(stopAt);
    } else {
      this._stopSourceAt(this.context.currentTime);
    }

    this.playing = false;

    if (this.onEnded) this.onEnded(this);
  }

  pause() {
    if (!this.playing || !this.source) return;

    const elapsed = this.context.currentTime - this.startedAt;

    this.pausedOffset = this.loop
      ? elapsed % this.buffer.duration
      : Math.min(elapsed, this.buffer.duration);

    // This is an internal state transition, not the sound actually
    // ending, so onEnded must not fire (it never does for any explicit
    // stop path — see _stopSourceAt).
    this._stopSourceAt(this.context.currentTime);
    this.playing = false;
  }

  resume() {
    if (this.playing) return this;

    return this.play({});
  }

  // Fades this instance's own volume to an arbitrary target — the
  // primitive setVolume/fadeIn/fadeOut and AudioManager's crossfade()
  // all build on this one method.
  fadeTo(volume, duration = 0) {
    rampGain(this.gainNode.gain, this.context, volume, duration);
    return this;
  }

  fadeIn(duration) {
    return this.fadeTo(this.baseVolume, duration);
  }

  fadeOut(duration) {
    return this.fadeTo(0, duration);
  }

  _createSource() {
    const source = this.context.createBufferSource();

    source.buffer = this.buffer;
    source.loop = this.loop;
    source.connect(this.gainNode);

    // Every explicit stop path (stop/pause/dispose, via _stopSourceAt)
    // detaches this handler before calling source.stop(), so this only
    // ever fires for a *natural* end of playback — a non-looping buffer
    // that simply ran out on its own, with nothing else touching it.
    source.onended = () => {
      this.playing = false;
      this.source = null;

      if (this.onEnded) this.onEnded(this);
    };

    this.source = source;
  }

  // Detaches the native "ended" handler before stopping, so this never
  // double-fires onEnded via that event — stop() notifies it directly
  // and synchronously instead (see above), and pause()/dispose() must
  // not notify it at all.
  _stopSourceAt(when) {
    if (!this.source) return;

    const source = this.source;

    this.source = null;
    source.onended = null;

    try {
      source.stop(when);
    } catch {
      // Already stopped/never started — nothing to do.
    }
  }

  dispose() {
    this._stopSourceAt(this.context.currentTime);
    this.gainNode.disconnect();
  }
}
