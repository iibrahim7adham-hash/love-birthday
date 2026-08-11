import "./style.css";

import { Experience } from "./engine/core";
import LuxuryIntroUI from "./templates/birthday/luxury/ui/IntroUI";

const canvas = document.createElement("canvas");

canvas.classList.add("webgl");

document.body.appendChild(canvas);

const experience = new Experience(canvas);

// The luxury template's intro overlay is bootstrapped here, outside the
// template class itself — every other template builds its own intro UI
// as part of its own flow instead. Which template is active is decided
// by VITE_TEMPLATE (see Experience.js and package.json's dev:luxury /
// dev:love / dev:standard scripts).
if ((import.meta.env.VITE_TEMPLATE || "luxury") === "luxury") {
  new LuxuryIntroUI(experience.audio);
}
