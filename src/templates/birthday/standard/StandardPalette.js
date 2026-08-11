// ===========================
// Standard — the shared accent-color palette used across every DOM/CSS
// overlay and Three.js effect in this template (START screen, Countdown,
// the Happy Birthday intro, message capsules, fireworks, the cake's own
// atmosphere). One source of truth for "what color is our accent",
// replacing the earlier cyan/teal identity, so a future palette change
// means editing values here rather than hunting through every file that
// happens to reference the accent color.
//
// CSS files can't import this (this project has no build-time CSS
// variable injection — every .standard-*.css file uses literal hex/rgba
// values directly), so each one's own values are kept in sync with these
// by hand; each says so in its own comment, pointing back here. JS/
// Three.js consumers (StandardFireworksConstants.js, cake/CakeConstants.js)
// import these directly.
// ===========================

export const STANDARD_ACCENT_PINK = "#F6B6CC"; // primary accent — borders, the main pink identity
export const STANDARD_ACCENT_PINK_SOFT = "#F8C9D9"; // secondary pink — occasional variation
export const STANDARD_ACCENT_PINK_PALE = "#FFE4EC"; // pale pink — glow/highlight layers
export const STANDARD_ACCENT_ROSE_DEEP = "#D982A5"; // deeper rose — rare depth/contrast accents only
export const STANDARD_IVORY = "#FFF8F5"; // warm white — text, particles, anything that must stay neutral/readable
export const STANDARD_GOLD = "#E8C98A"; // soft gold — secondary celebration accent, pairs with candlelight
export const STANDARD_LAVENDER = "#CDB4E8"; // subtle lavender — sparing use only (e.g. an occasional balloon accent)
