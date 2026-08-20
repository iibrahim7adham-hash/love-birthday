import "./SectionSeam.css";

// A small Islamic-geometric rosette (two overlapping squares forming an
// 8-point star/khatam, a classic Islamic ornamental motif — distinct
// from the 8-spike "flower" star each section's own header ornament
// already uses, see ORNAMENT_SVG in eventdetails/EventDetails.js) sat
// directly on the seam between two adjacent sections, flanked by thin
// gold hairlines. A fresh <defs>-free markup (plain shapes, no <use>
// ids) so it can be stamped once per seam without id collisions.
const SEAM_MOTIF_SVG = `
  <svg class="am-section-seam-motif" viewBox="0 0 60 60" aria-hidden="true">
    <circle cx="30" cy="30" r="19" fill="#fff9e7" stroke="#c8a96b" stroke-width="1" opacity="0.9" />
    <rect x="16" y="16" width="28" height="28" fill="none" stroke="#c19f62" stroke-width="1.1" opacity="0.85" />
    <rect x="16" y="16" width="28" height="28" fill="none" stroke="#c19f62" stroke-width="1.1" opacity="0.85" transform="rotate(45 30 30)" />
    <circle cx="30" cy="30" r="3.2" fill="#c19f62" stroke="#8a6d3b" stroke-width="0.4" />
    <circle cx="30" cy="30" r="1.2" fill="#fff5c0" opacity="0.9" />
  </svg>
`;

// Sat as the very first child of a section, absolutely positioned and
// centered on that section's own top edge (see .am-section-seam in
// SectionSeam.css) — the section below needs nothing of its own; this
// single element straddles the boundary with the section above it.
export function sectionSeamHTML() {
  return `
    <div class="am-section-seam" aria-hidden="true">
      <span class="am-section-seam-line"></span>
      ${SEAM_MOTIF_SVG}
      <span class="am-section-seam-line"></span>
    </div>
  `;
}
