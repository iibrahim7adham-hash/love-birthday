// ===========================
// Small, pure helpers shared across the audio engine — nothing here
// touches an AudioContext or holds state.
// ===========================

export function clamp01(value) {
  return Math.min(Math.max(value, 0), 1);
}

// Ramps a GainNode's value smoothly using its own native scheduling
// (linearRampToValueAtTime) rather than driving it from JS on a timer —
// sample-accurate and glitch-free regardless of frame rate. Every fade
// in the engine (bus volume changes, player fade in/out, crossfade)
// goes through this one function.
export function rampGain(gainParam, context, targetValue, duration) {
  const now = context.currentTime;

  gainParam.cancelScheduledValues(now);
  gainParam.setValueAtTime(gainParam.value, now);

  if (duration > 0) {
    gainParam.linearRampToValueAtTime(targetValue, now + duration);
  } else {
    gainParam.setValueAtTime(targetValue, now);
  }
}

export function resolveAudioContextClass() {
  return window.AudioContext || window.webkitAudioContext;
}
