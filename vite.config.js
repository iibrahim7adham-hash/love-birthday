import { defineConfig } from "vite";

// `mode` comes from the --mode flag each npm script passes (see
// package.json's dev:luxury / dev:standard / build:luxury /
// build:standard). It's how VITE_TEMPLATE gets into import.meta.env via
// .env.luxury / .env.standard, and it's also used here so building both
// templates doesn't have one overwrite the other's dist/ folder.
export default defineConfig(({ mode }) => ({
  assetsInclude: ["**/*.glb"],
  build: {
    outDir: mode === "standard" ? "dist-standard" : "dist",
  },
  css: {
    // This project has no PostCSS plugins (no Tailwind, no
    // autoprefixer, nothing) — but without an explicit config, Vite's
    // PostCSS loader (via cosmiconfig) still searches upward through
    // every ancestor directory above the project root looking for a
    // postcss.config.* / .postcssrc* / package.json#postcss. That
    // search has no boundary at the project root, so it's at the mercy
    // of whatever unrelated files happen to sit in parent directories
    // on whatever machine is building — e.g. this broke a from-scratch
    // build here because an unrelated leftover file several directories
    // above the project (not part of this repo) happened to collide
    // with that search pattern. An explicit (empty) config here skips
    // the search entirely, so the build no longer depends on anything
    // outside the project.
    postcss: {},
  },
}));
