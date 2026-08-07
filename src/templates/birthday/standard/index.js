// Convenience re-export so the whole template can be wired into the
// engine with one import, e.g.:
//   import StandardScene from "../../templates/birthday/standard";
// To actually make this the active template, swap the LuxuryScene import
// in src/engine/core/Experience.js for this one — left untouched here so
// the current live luxury flow keeps working as-is.
export { default } from "./Scene";
