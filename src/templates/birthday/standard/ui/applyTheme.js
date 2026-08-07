// Pushes content/config/theme.js's values onto :root as CSS custom
// properties, so IntroUI.css / CountdownUI.css / BlowCandlesUI.css can
// reference `var(--standard-font)` etc. instead of hardcoding a font
// stack or color in each file. Called once from Scene/StandardScene.js
// before any UI overlay is created — the CSS never needs to know where
// the values came from, so a new theme.js value just works.
export default function applyTheme(theme) {
  const root = document.documentElement.style;

  root.setProperty("--standard-font", theme.fontFamily);
  root.setProperty("--standard-bg", theme.background);
  root.setProperty("--standard-accent", theme.accent);
  root.setProperty("--standard-text", theme.textColor);
}
