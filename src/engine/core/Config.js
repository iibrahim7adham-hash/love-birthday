const Config = {
  debug: false,

  camera: {
    fov: 35,
    near: 0.1,
    far: 1000,
  },

  renderer: {
    antialias: true,
    alpha: true,
    pixelRatio: Math.min(window.devicePixelRatio, 2),
  },

  scene: {
    background: "#000000",
  },
};

export default Config;
