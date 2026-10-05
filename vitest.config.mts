import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

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
    // Agent worktrees under .kilo/ hold a full checkout of this repo. Git skips
    // them via .git/info/exclude, but Vitest does not, so without this every
    // test file runs twice. Matches the .kilo/** ignore in eslint.config.mjs.
    exclude: [...configDefaults.exclude, ".kilo/**"],
    // ponytail: no coverage thresholds yet. Add @vitest/coverage-v8 once there
    // is logic worth measuring, not before.
  },
});