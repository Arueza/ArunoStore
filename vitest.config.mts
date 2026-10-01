import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Matches the "@/*" path in tsconfig.json. Vitest does not read tsconfig
    // paths on its own, and one line here beats the vite-tsconfig-paths dep.
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // ponytail: no coverage thresholds yet. Add @vitest/coverage-v8 once there
    // is logic worth measuring, not before.
  },
});