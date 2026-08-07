const cake = {
  layerCount: 3,
  layerStagger: 0.4, // seconds between each layer starting to build
  layerBuildDuration: 0.9, // seconds for one layer's build-in animation
  frostingBuildDuration: 0.6,
  frostingDelay: 0.2, // seconds after the last layer before frosting builds in

  baseRadius: 1.6,
  layerHeight: 0.7,
  layerTaper: 0.35, // how much narrower each layer up is than the one below

  layerColors: ["#f4c9d8", "#f0a8c0", "#e888a8", "#dd6a95"],
  frostingColor: "#fff6f9",
};

export default cake;
