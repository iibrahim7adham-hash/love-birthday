// Global visual identity shared across every scene: the font family
// used both by DOM UI (pushed onto CSS custom properties by
// ui/applyTheme.js) and canvas-drawn text (FloatingText, MessageCard),
// plus the base colors the DOM overlays and 3D backdrop share.
const theme = {
  fontFamily: "'Segoe UI', Arial, Helvetica, sans-serif",

  background: "#120b14",
  accent: "#ffd166",
  textColor: "#ffffff",
};

export default theme;
