// Samples a string of text (a single digit or a whole word) into a
// strict LED/dot-matrix grid: a fixed cols x rows lattice where each
// cell is either "on" (covered by the glyph) or "off". This is what
// gives the countdown its dot-matrix look — every particle that ends up
// representing a digit or word sits on an exact, evenly-spaced grid
// coordinate, never a free-floating sampled pixel.
//
// The text is rendered at SUPER_SAMPLE x the grid resolution and each
// cell's "on" state is decided by the AVERAGE alpha over its block of
// supersampled pixels (not a single-pixel read) — thin strokes at a
// coarse grid still register reliably instead of being missed or aliased.

const SUPER_SAMPLE = 8;
const ALPHA_THRESHOLD = 90; // out of 255, on the block-averaged alpha
const MAX_WIDTH_FRACTION = 0.9; // leaves a margin so text never touches the canvas edge

const cache = new Map();

function rasterizeTextToGrid(text, cols, rows) {
  const canvas = document.createElement("canvas");
  canvas.width = cols * SUPER_SAMPLE;
  canvas.height = rows * SUPER_SAMPLE;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Starts from a height-based font size (right for a single tall
  // digit), then shrinks to fit the canvas width if needed (a multi-
  // character word like "You" is much wider relative to its height than
  // a digit is) — one measure-and-scale pass is enough since font
  // metrics scale linearly with size.
  let fontSize = Math.round(canvas.height * 0.82);
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;

  const measuredWidth = ctx.measureText(text).width;
  const maxWidth = canvas.width * MAX_WIDTH_FRACTION;
  if (measuredWidth > maxWidth) {
    fontSize = Math.floor(fontSize * (maxWidth / measuredWidth));
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  }

  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + canvas.height * 0.03);

  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const on = [];

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      let sum = 0;

      for (let sy = 0; sy < SUPER_SAMPLE; sy++) {
        const py = j * SUPER_SAMPLE + sy;
        const rowOffset = py * canvas.width;

        for (let sx = 0; sx < SUPER_SAMPLE; sx++) {
          const px = i * SUPER_SAMPLE + sx;
          sum += data[(rowOffset + px) * 4 + 3];
        }
      }

      const avgAlpha = sum / (SUPER_SAMPLE * SUPER_SAMPLE);
      if (avgAlpha > ALPHA_THRESHOLD) on.push(i, j);
    }
  }

  return on;
}

// Returns the flat [i, j] cell-index list of every "on" cell for `text`
// (coerced to a string, so a plain digit number works too) at the given
// grid resolution — cached per (text, cols, rows).
export function getTextGridCells(text, cols, rows) {
  const value = String(text);
  const cacheKey = `${value}_${cols}x${rows}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const cells = rasterizeTextToGrid(value, cols, rows);
  cache.set(cacheKey, cells);
  return cells;
}

// Converts a grid cell index (i, j) to a centered world-space [x, y],
// z always 0 — the formed digit is a perfectly flat lattice, no depth
// jitter, so every particle that shares a cell lands on the exact same
// point (spacing = world size of one cell).
export function gridCellToWorld(i, j, cols, rows, spacing, out) {
  out[0] = (i - cols / 2 + 0.5) * spacing;
  out[1] = (rows / 2 - j - 0.5) * spacing;
  out[2] = 0;
  return out;
}
