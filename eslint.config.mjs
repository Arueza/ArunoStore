import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
    ".kilo/**",
    // ponytail: legacy Artora demo files, deleted in roadmap 0.8. Ignored only
    // so `eslint .` does not lint old browser JS. Remove the ignores after 0.8.
    "js/**",
    "css/**",
    "*.html",
  ]),
]);