import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Service worker — plain JS running in worker scope, not React/Node
    "public/sw.js",
    // Generated coverage reports
    "coverage/**",
  ]),
  // Project-level rule hardening
  {
    rules: {
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  // Allow console in test files (assertions, debugging)
  {
    files: ["src/__tests__/**", "e2e/**"],
    rules: {
      "no-console": "off",
    },
  },
]);

export default eslintConfig;
