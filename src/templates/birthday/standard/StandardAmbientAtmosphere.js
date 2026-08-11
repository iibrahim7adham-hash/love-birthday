import gsap from "gsap";

import "./StandardAmbientAtmosphere.css";

// The persistent night-sky background (nebula glow + tiered stars/
// hearts/dust) that used to live entirely inside StartScreen.js/.css —
// moved out into its own always-alive module so it survives every stage
// of the experience instead of being torn down along with the Start
// Screen. Constructed once by StandardScene.js (before StartScreen, so
// StartScreen can drive this SAME instance's own entrance fade-in/press
// bloom rather than owning a copy of it), and only ever destroyed when
// StandardScene itself tears down.
//
// Deliberately still a DOM+CSS overlay, not Three.js geometry — the
// brief's own "reuse the existing implementation, do not rebuild it"
// instruction, and converting ~90 tiny CSS-animated elements into
// camera-projected 3D sprites would be a real rewrite, not a quick
// change. It sits at a low z-index (see its own CSS) — above the
// canvas, which has none, so it reads over the 3D scene, but well below
// every other DOM overlay (title/buttons/floating text all sit at
// z-index 850+), so it never competes with them.
export default class StandardAmbientAtmosphere {
  constructor() {
    this.element = document.createElement("div");
    this.element.id = "standard-ambient-atmosphere";
    this.element.innerHTML = `<div class="standard-ambient-particles" aria-hidden="true"></div>`;
    document.body.appendChild(this.element);

    this._particlesContainer = this.element.querySelector(".standard-ambient-particles");
    this._buildParticles();
  }

  // Rerolls up to a few times if `avoidCenter` lands inside the loose
  // protected box around wherever this stage's own central content
  // sits — the cake/title occupy roughly the same central region the
  // Start Screen's own title/button do, so one fixed box serves the
  // whole persistent lifetime rather than needing per-stage tuning.
  _randomPosition({ avoidCenter = false, leftRange = [3, 97], topRange = [4, 94] } = {}) {
    let left = 50;
    let top = 50;

    for (let attempt = 0; attempt < 4; attempt++) {
      left = gsap.utils.random(leftRange[0], leftRange[1]);
      top = gsap.utils.random(topRange[0], topRange[1]);
      const inCenter = avoidCenter && left > 26 && left < 74 && top > 26 && top < 76;
      if (!inCenter) break;
    }

    return { left, top };
  }

  // Several depth/brightness tiers (tiny/small/medium/cross-sparkle),
  // plus hearts and drifting dust. Counts are lower on mobile but the
  // same tier mix, so the composition reads the same everywhere.
  _buildParticles() {
    const container = this._particlesContainer;
    const isMobile = window.innerWidth < 560;

    const tinyCount = isMobile ? 22 : 40;
    for (let i = 0; i < tinyCount; i++) {
      const { left, top } = this._randomPosition();
      const star = document.createElement("span");
      star.className = "standard-ambient-star";
      const size = gsap.utils.random(1, 1.8);
      star.style.left = `${left}%`;
      star.style.top = `${top}%`;
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.setProperty("--peak-opacity", gsap.utils.random(0.12, 0.32).toFixed(2));
      star.style.animationDuration = `${gsap.utils.random(4, 10).toFixed(1)}s`;
      star.style.animationDelay = `${gsap.utils.random(0, 8).toFixed(1)}s`;
      container.appendChild(star);
    }

    const smallCount = isMobile ? 9 : 16;
    for (let i = 0; i < smallCount; i++) {
      const { left, top } = this._randomPosition({ avoidCenter: i % 2 === 0 });
      const star = document.createElement("span");
      star.className = "standard-ambient-star";
      const size = gsap.utils.random(1.8, 2.8);
      star.style.left = `${left}%`;
      star.style.top = `${top}%`;
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.setProperty("--peak-opacity", gsap.utils.random(0.3, 0.55).toFixed(2));
      star.style.animationDuration = `${gsap.utils.random(4, 8).toFixed(1)}s`;
      star.style.animationDelay = `${gsap.utils.random(0, 7).toFixed(1)}s`;
      container.appendChild(star);
    }

    const mediumColors = ["rgba(255, 248, 245, 0.6)", "rgba(246, 182, 204, 0.55)", "rgba(232, 201, 138, 0.5)"];
    const mediumCount = isMobile ? 4 : 7;
    for (let i = 0; i < mediumCount; i++) {
      const { left, top } = this._randomPosition({ avoidCenter: true });
      const star = document.createElement("span");
      star.className = "standard-ambient-star standard-ambient-star--glow";
      const size = gsap.utils.random(2.8, 4);
      star.style.left = `${left}%`;
      star.style.top = `${top}%`;
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.setProperty("--peak-opacity", gsap.utils.random(0.5, 0.85).toFixed(2));
      star.style.setProperty("--glow-color", mediumColors[i % mediumColors.length]);
      star.style.animationDuration = `${gsap.utils.random(5, 9).toFixed(1)}s`;
      star.style.animationDelay = `${gsap.utils.random(0, 6).toFixed(1)}s`;
      container.appendChild(star);
    }

    const crossColors = ["#f6b6cc", "#fff8f5", "#e8c98a"];
    const crossCount = isMobile ? 4 : 6;
    for (let i = 0; i < crossCount; i++) {
      const { left, top } = this._randomPosition({ avoidCenter: true });
      const cross = document.createElement("span");
      cross.className = "standard-ambient-star-cross";
      cross.textContent = "✦";
      cross.style.left = `${left}%`;
      cross.style.top = `${top}%`;
      cross.style.fontSize = `${gsap.utils.random(9, 15).toFixed(1)}px`;
      cross.style.color = crossColors[i % crossColors.length];
      cross.style.setProperty("--peak-opacity", gsap.utils.random(0.55, 0.9).toFixed(2));
      cross.style.animationDuration = `${gsap.utils.random(5, 9).toFixed(1)}s`;
      cross.style.animationDelay = `${gsap.utils.random(0, 7).toFixed(1)}s`;
      container.appendChild(cross);
    }

    const heartCount = isMobile ? 3 : 5;
    for (let i = 0; i < heartCount; i++) {
      const { left, top } = this._randomPosition({ avoidCenter: true });
      const heart = document.createElement("span");
      heart.className = "standard-ambient-heart";
      heart.textContent = "❤";
      heart.style.left = `${left}%`;
      heart.style.top = `${top}%`;
      heart.style.fontSize = `${gsap.utils.random(8, 15).toFixed(1)}px`;
      heart.style.animationDuration = `${gsap.utils.random(9, 15).toFixed(1)}s`;
      heart.style.animationDelay = `${gsap.utils.random(0, 10).toFixed(1)}s`;
      container.appendChild(heart);
    }

    const dustColors = [
      "rgba(255, 248, 245, 0.45)",
      "rgba(246, 182, 204, 0.5)",
      "rgba(205, 180, 232, 0.4)",
      "rgba(232, 201, 138, 0.4)",
    ];
    const dustCount = isMobile ? 6 : 11;
    for (let i = 0; i < dustCount; i++) {
      const { left, top } = this._randomPosition();
      const dust = document.createElement("span");
      dust.className = "standard-ambient-dust";
      const size = gsap.utils.random(2, 4);
      dust.style.left = `${left}%`;
      dust.style.top = `${top}%`;
      dust.style.width = `${size}px`;
      dust.style.height = `${size}px`;
      dust.style.background = dustColors[i % dustColors.length];
      dust.style.animationDuration = `${gsap.utils.random(10, 18).toFixed(1)}s`;
      dust.style.animationDelay = `${gsap.utils.random(0, 8).toFixed(1)}s`;
      container.appendChild(dust);
    }
  }

  // Only ever called once, by StandardScene.destroy() at true teardown —
  // NOT by StartScreen's own destroy(), which is the entire point of
  // this file existing separately.
  destroy() {
    gsap.killTweensOf(this.element);
    this.element.remove();
  }
}
