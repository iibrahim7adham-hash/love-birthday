// The order the 7 acts play in. SceneFlowManager.goToNext() reads this
// array to find "what comes after the current scene" — reordering,
// removing, or inserting an act is a change made here alone; no scene
// hardcodes the name of whichever one follows it.
const flow = {
  order: [
    "intro",
    "countdown",
    "cakeBuild",
    "celebration",
    "blowCandles",
    "transition",
    "memories",
  ],
};

export default flow;
