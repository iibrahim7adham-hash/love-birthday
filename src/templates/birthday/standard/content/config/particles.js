// Shared particle-effect presets — the two places a generic
// ParticleSystem burst is used outside of Celebration's own fireworks
// (config/celebration.js) and ambient dust.
const particles = {
  candleSmoke: {
    count: 12,
    color: "#cccccc",
    size: 0.03,
    spread: 0.05,
    force: 0.3,
    duration: 0.8,
  },

  cakeDissolve: {
    count: 400,
    color: "#ffd9e8",
    size: 0.05,
    spread: 0.1,
    force: 1.4,
    duration: 1.6,
  },
};

export default particles;
