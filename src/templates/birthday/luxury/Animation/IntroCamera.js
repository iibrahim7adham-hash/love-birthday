import gsap from "gsap";

export default class IntroCamera {
  constructor(camera) {
    this.camera = camera;
  }

  play() {
    this.camera.position.set(0, 6, 16);
    this.camera.lookAt(0, 2, 0);

    gsap.to(this.camera.position, {
      x: 0,
      y: 2.5,
      z: 6,
      duration: 5,
      ease: "power2.inOut",
      onUpdate: () => {
        this.camera.lookAt(0, 2, 0);
      },
    });
  }
}
