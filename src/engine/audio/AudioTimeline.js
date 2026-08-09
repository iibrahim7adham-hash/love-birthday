// A small generic pub/sub emitter — deliberately NOT audio-specific.
// Templates trigger named events ("heart:complete", "ui:click", ...) as
// their scenes reach those moments, and each template's own <Name>Audio.js
// is the only thing that knows which sound (if any) a given event name
// maps to. AudioManager owns one instance of this and exposes it as
// on/off/trigger, but the mapping logic never lives in here.
export default class AudioTimeline {
  constructor() {
    this.listeners = new Map(); // event -> Set<handler>
  }

  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event).add(handler);

    return () => this.off(event, handler);
  }

  off(event, handler) {
    const handlers = this.listeners.get(event);
    if (!handlers) return;

    handlers.delete(handler);

    if (handlers.size === 0) {
      this.listeners.delete(event);
    }
  }

  trigger(event, payload) {
    const handlers = this.listeners.get(event);
    if (!handlers) return;

    // Snapshot before iterating — a handler unsubscribing itself (or
    // another handler for the same event) mid-trigger must not affect
    // this dispatch pass.
    for (const handler of [...handlers]) {
      handler(payload);
    }
  }

  clear() {
    this.listeners.clear();
  }
}
