import gsap from "gsap";

export default class Transition {
  constructor(experience) {
    this.experience = experience;

    this.isRunning = false;

    this.timeline = gsap.timeline({
      paused: true,
    });
  }

  play(callback) {
    if (this.isRunning) return;

    this.isRunning = true;

    this.timeline.clear();

    this.timeline.call(() => {
      if (callback) {
        callback();
      }
    });

    this.timeline.call(() => {
      this.isRunning = false;
    });

    this.timeline.play(0);
  }

  lock() {
    this.isRunning = true;
  }

  unlock() {
    this.isRunning = false;
  }

  get running() {
    return this.isRunning;
  }
}
