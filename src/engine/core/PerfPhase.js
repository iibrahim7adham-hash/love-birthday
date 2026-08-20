// TEMP PROFILING — delete this whole file when done.
// Shared mutable marker so GiftBox.js/Letter.js can tag which animation
// phase is currently playing, and Experience.js's temporary frame logger
// can print it alongside the measured timings. See BoomScene/GiftBox/
// Letter for the matching "TEMP PROFILING" setPhase() call sites, and
// Experience.js for the logger itself — all removable independently of
// real code once profiling is done.
export const PerfPhase = { current: "idle" };

export function setPhase(phase) {
  PerfPhase.current = phase;
}
