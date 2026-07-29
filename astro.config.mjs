import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://herrmannw.github.io",
  base: "/TeROW",
  output: "static",
  build: {
    assets: "assets",
  },
});
