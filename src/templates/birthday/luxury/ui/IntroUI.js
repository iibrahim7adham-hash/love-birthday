import "./IntroUI.css";
import gsap from "gsap";

export default class IntroUI {
  constructor() {
    this.create();
    this.animate();
    this.events();
  }

  create() {
    this.element = document.createElement("div");

    this.element.id = "intro-ui";

    this.element.innerHTML = `
        <div class="intro-card">

            <div class="sparkle">✨</div>

            <h1>Are you ready?</h1>

            <p class="subtitle">
                Take a deep breath...
                <br>
                Something beautiful is waiting for you.
            </p>

            <button class="yes-btn">
                YES ❤️
            </button>

            <button class="no-btn">
                NO 🙈
            </button>

        </div>
    `;

    document.body.appendChild(this.element);

    this.card = this.element.querySelector(".intro-card");
    this.yes = this.element.querySelector(".yes-btn");
    this.no = this.element.querySelector(".no-btn");
  }

  animate() {
    gsap.from(this.card, {
      opacity: 0,
      scale: 0.8,
      y: 40,
      duration: 1.2,
      ease: "power4.out",
    });

    gsap.to(this.yes, {
      scale: 1.05,
      duration: 1.2,
      repeat: -1,
      yoyo: true,
      ease: "power1.inOut",
    });

    gsap.to(".sparkle", {
      y: -10,
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
  }

  events() {
    this.no.style.position = "relative";

    const positions = [
      { x: 0, y: 0 },
      { x: 120, y: 0 },
      { x: -120, y: 0 },
      { x: 80, y: -60 },
      { x: -80, y: -60 },
      { x: 80, y: 60 },
      { x: -80, y: 60 },
      { x: 0, y: -70 },
      { x: 0, y: 70 },
    ];

    let current = 0;

    const moveNoButton = () => {
      let next;

      do {
        next = Math.floor(Math.random() * positions.length);
      } while (next === current);

      current = next;

      gsap.set(this.no, {
        x: positions[current].x,
        y: positions[current].y,
      });
    };

    this.no.addEventListener("pointerenter", moveNoButton);
    this.no.addEventListener("pointerdown", moveNoButton);

    this.yes.addEventListener("click", () => {
      this.yes.style.pointerEvents = "none";
      this.no.style.pointerEvents = "none";

      const tl = gsap.timeline();

      tl.to(this.yes, {
        scale: 1.18,
        duration: 0.12,
        ease: "power2.out",
      })

        .to(this.yes, {
          scale: 0.95,
          duration: 0.12,
          ease: "power2.in",
        })

        .to(
          this.card,
          {
            opacity: 0,
            scale: 1.08,
            filter: "blur(10px)",
            duration: 0.55,
            ease: "power3.inOut",
          },
          "<",
        )

        .to(
          "#intro-ui",
          {
            opacity: 0,
            duration: 0.25,
          },
          "-=0.15",
        )

        .call(() => {
          window.dispatchEvent(new CustomEvent("intro:boost"));
          window.dispatchEvent(new CustomEvent("intro:yes"));
        });
    });
  }
}
