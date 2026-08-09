import { clamp01, rampGain } from "./AudioUtils";

// One mixing channel — a thin wrapper around a single GainNode. Buses
// are chained by construction (see AudioManager): BGM/SFX/AMBIENT each
// connect into MASTER, which connects to the AudioContext's own
// destination, so scaling MASTER affects everything while scaling one
// bus only affects sounds routed through it. Nothing that plays a
// sound talks to a GainNode directly — it connects into a bus's
// `.input` and this is the only thing that ever touches that node's
// gain afterward.
export default class AudioBus {
  constructor(context, destinationNode) {
    this.context = context;

    this.gainNode = context.createGain();

    if (destinationNode) {
      this.gainNode.connect(destinationNode);
    }

    this.volume = 1;
    this.muted = false;
  }

  // Where things that play on this bus should connect to.
  get input() {
    return this.gainNode;
  }

  setVolume(value, rampDuration = 0) {
    this.volume = clamp01(value);
    this._applyGain(rampDuration);
  }

  mute(rampDuration = 0.05) {
    this.muted = true;
    this._applyGain(rampDuration);
  }

  unmute(rampDuration = 0.05) {
    this.muted = false;
    this._applyGain(rampDuration);
  }

  _applyGain(rampDuration) {
    const target = this.muted ? 0 : this.volume;
    rampGain(this.gainNode.gain, this.context, target, rampDuration);
  }

  dispose() {
    this.gainNode.disconnect();
  }
}
