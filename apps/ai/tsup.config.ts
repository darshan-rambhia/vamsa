import { defineConfig } from "tsup";

// Bundles the AI service entrypoint. bun remains the runtime (see `start`);
// this replaces the previous `bun build` bundler step so bundling no longer
// depends on bun. Dependencies are kept external (standard for a server app).
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  platform: "node",
  outDir: "dist",
  clean: true,
  sourcemap: true,
});
