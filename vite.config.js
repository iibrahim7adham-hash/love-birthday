import { defineConfig } from "vite";

// `mode` comes from the --mode flag each npm script passes (see
// package.json's dev:luxury / build:luxury / dev:love / build:love /
// dev:standard / build:standard). It's how VITE_TEMPLATE gets into
// import.meta.env via .env.luxury / .env.love / .env.standard. Every
// template currently shares the same default `dist/` outDir — a
// previous version of this file special-cased one template's own
// outDir so it wouldn't collide with the others' `dist/`; the reason
// to reintroduce that would be a template that genuinely needs to
// coexist with an already-built one rather than replace it.
export default defineConfig(({ mode }) => ({
  // test-menu and fashion are standalone static pages (not part of the
  // Experience.js template system), so each needs its own project root to
  // be served as its own dev server entry via `npm run dev:test-menu` /
  // `npm run dev:fashion`. Every other mode leaves `root` undefined, which
  // Vite defaults to the project root — unchanged from before.
  root:
    mode === "test-menu"
      ? "src/templates/menus/test-menu"
      : mode === "fashion"
        ? "src/templates/websites/fashion"
        : undefined,
  assetsInclude: ["**/*.glb"],
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
