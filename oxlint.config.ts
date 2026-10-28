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
});
