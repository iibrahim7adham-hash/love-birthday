const celebration = {
  balloonCount: 10,
  balloonColors: ["#ff8fa8", "#ffd166", "#8ecae6", "#c8b6ff", "#95e1a3"],
  balloonAppearDuration: 0.8,
  balloonAppearStagger: 0.08,
  balloonMotion: { amplitude: 0.25, speed: 0.6, rotationSpeed: 0.05 },

  floatingTextMotion: { amplitude: 0.2, speed: 0.5, rotationSpeed: 0 },

  fireworks: {
    interval: 1.4, // seconds between bursts
    colors: ["#ff6b9d", "#ffd166", "#06d6a0", "#8ecae6", "#c8b6ff"],
    particleCount: 60,
    minForce: 1.5,
    maxForce: 2.5,
    duration: 1.2,
  },

  ambientDust: {
    count: 300,
    color: "#ffe8f0",
    size: 0.03,
    spread: 8,
  },

  advanceDelay: 2, // seconds of pure atmosphere before Blow Candles appears
};

export default celebration;
