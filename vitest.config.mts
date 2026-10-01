import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Matches the "@/*" path in tsconfig.json. Vitest does not read tsconfig
    // paths on its own, and one line here beats the vite-tsconfig-paths dep.
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // ponytail: no DOM tests yet. Add jsdom + @testing-library/react when the
    // first client component needs testing, not before.
  },
});