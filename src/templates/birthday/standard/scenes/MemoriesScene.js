import * as THREE from "three";
import gsap from "gsap";

import BaseScene from "./BaseScene";
import MessageCard from "../objects/memories/MessageCard";
import { memoryMessages } from "../content/messages";

const LAYOUT_RADIUS = 3;

// Scene 7 — Memory / Love Messages. Floating message cards appear one by
// one from content/messages.js's memoryMessages, laid out in a loose
// ring with thin connecting lines between neighbors so they read as one
// constellation rather than a scattered pile. Card font, appear
// duration and float motion come from content/config/theme.js and
// content/config/animation.js. Swapping the messages shown here is just
// editing content/messages.js — this scene only cares about array
// length and each entry's `.text`.
export default class MemoriesScene extends BaseScene {
  enter() {
    const { scene, config } = this.context;
    const { theme, animation } = config;

    this.group = new THREE.Group();
    scene.add(this.group);

    this.cards = [];
    this.lines = [];

    const positions = this.layoutPositions(memoryMessages.length);

    memoryMessages.forEach((message, i) => {
      const card = new MessageCard(message.text, {
        ...positions[i],
        fontFamily: theme.fontFamily,
        appearDuration: animation.messageCard.appearDuration,
        motion: animation.messageCard.motion,
      }).addTo(this.group);

      card.appear(i * animation.messageCard.stagger);

      this.cards.push(card);

      if (i > 0) {
        this.addConnectingLine(positions[i - 1], positions[i]);
      }
    });

    if (positions.length > 2) {
      this.addConnectingLine(positions[positions.length - 1], positions[0]);
    }
  }

  layoutPositions(count) {
    const positions = [];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;

      positions.push({
        x: Math.cos(angle) * LAYOUT_RADIUS,
        y: 1.5 + Math.sin(i * 1.7) * 0.6,
        z: Math.sin(angle) * LAYOUT_RADIUS,
      });
    }

    return positions;
  }

  addConnectingLine(from, to) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(from.x, from.y, from.z),
      new THREE.Vector3(to.x, to.y, to.z),
    ]);

    const material = new THREE.LineBasicMaterial({
      color: "#ffffff",
      transparent: true,
      opacity: 0,
    });

    const line = new THREE.Line(geometry, material);
    this.group.add(line);

    gsap.to(material, { opacity: 0.25, duration: 1, delay: 0.5 });

    this.lines.push(line);
  }

  update(delta) {
    this.cards.forEach((card) => card.update(delta));
  }

  exit() {
    this.cards.forEach((card) => card.dispose());

    this.lines.forEach((line) => {
      line.geometry.dispose();
      line.material.dispose();
    });

    this.context.scene.remove(this.group);

    this.cards = [];
    this.lines = [];
  }
}
