// Cross-cutting pacing knobs not already owned by one feature's own
// config file (cake.js, celebration.js and candles.js each hold their
// own durations next to the values they animate). This is for the
// Memories scene's message cards, which don't have a dedicated file of
// their own.
const animation = {
  messageCard: {
    appearDuration: 0.8,
    stagger: 0.5,
    motion: { amplitude: 0.12, speed: 0.4, rotationSpeed: 0 },
  },
};

export default animation;
