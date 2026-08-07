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
}));
