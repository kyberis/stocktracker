import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "e2e/**",
    "test-results/**",
    "playwright-report/**",
    "external/**",
    "knowledge/**",
  ]),
  {
    rules: {
      // Next / react-hooks flags many legitimate data-fetch-on-mount patterns as errors.
      // Re-enable after an incremental migration (useSyncExternalStore, etc.).
      "react-hooks/set-state-in-effect": "off",
      // React Compiler / eslint-plugin-react-hooks extras — revisit when aligning with Strict Mode tooling.
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",
      "react-hooks/preserve-manual-memoization": "off",
      // TODO: reduce warnings — tracked for a dedicated lint-hygiene pass (conditional hooks, any, Link).
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/rules-of-hooks": "warn",
      "@next/next/no-html-link-for-pages": "warn",
    },
  },
]);

export default eslintConfig;
