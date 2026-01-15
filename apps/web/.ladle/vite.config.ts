import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "../src"),
      "@vamsa/ui": path.resolve(__dirname, "../../../packages/ui/src"),
      "@vamsa/schemas": path.resolve(
        __dirname,
        "../../../packages/schemas/src"
      ),
      "@vamsa/lib": path.resolve(__dirname, "../../../packages/lib/src"),
    },
  },
});
