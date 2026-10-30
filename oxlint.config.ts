import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";
import vitest from "ultracite/oxlint/vitest";

// Playwright specs in e2e/ also end in .spec.ts; keep Vitest's rules (and
// autofixes, like importing from "vitest") off them.
const vitestUnitTests = defineConfig({
  ...vitest,
  overrides: vitest.overrides?.map((o) => ({
    ...o,
    excludeFiles: ["**/e2e/**"],
  })),
});

export default defineConfig({
  env: core.env,
  extends: [core, react, vitestUnitTests],
  ignorePatterns: core.ignorePatterns,
  rules: {
    // The codebase uses function declarations throughout.
    "func-style": "off",
    // Components are written as function declarations, same as above.
    "react/function-component-definition": "off",
    // Trailing explanatory comments are used deliberately.
    "no-inline-comments": "off",
    // Renaming breaks Expo Router routes; PascalCase component files are the convention.
    "unicorn/filename-case": "off",
    // Object keys are ordered for readability, not alphabetically.
    "sort-keys": "off",
    // i++ in loops is idiomatic here.
    "no-plusplus": "off",
    // Both method and property signatures are used in type declarations.
    "typescript/method-signature-style": "off",
    // The code relies on function hoisting.
    "no-use-before-define": "off",
    // void is used deliberately for fire-and-forget promises.
    "no-void": "off",
    // React Compiler cannot lower try/finally; this is not a code problem.
    "react/todo": "off",
  },
});
