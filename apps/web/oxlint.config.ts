import { defineConfig } from "oxlint";
import playwright from "ultracite/oxlint/playwright";

import root from "../../oxlint.config.ts";

// Oxlint lints each file with its nearest config alone, so this extends the
// root config and repeats the properties that extends doesn't carry over.
export default defineConfig({
  env: root.env,
  extends: [root, playwright],
  ignorePatterns: root.ignorePatterns,
  settings: root.settings,
});
