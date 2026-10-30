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
    // Nested ternaries are used deliberately for short, flat variant/label picks.
    "no-nested-ternary": "off",
    // Empty callbacks are deliberate best-effort swallows (`.catch(() => {})`, no-op defaults).
    "no-empty-function": "off",
    // Awaits in loops are deliberately sequential (sync engine, PDF layout, reminder delivery).
    "no-await-in-loop": "off",
    // Prefer Promise chains vs async/await is a style call; `.then` is used where it reads better.
    "promise/always-return": "off",
    // Node-style callbacks appear only at platform API boundaries (timers, listeners).
    "promise/prefer-await-to-callbacks": "off",
    // Wrapping callback APIs in `new Promise` is the only option there.
    "promise/avoid-new": "off",
    // Regexes use positional groups; named groups would add noise without catching bugs.
    "prefer-named-capture-group": "off",
    // Page components and the sync/reminder pipelines are long by nature; a cap is not a bug signal.
    complexity: "off",
    // Inner helpers close over per-render state or are kept next to their only caller.
    "unicorn/consistent-function-scoping": "off",
    // Sorts run on fresh copies; toSorted is not available on every target (Hermes, older browsers).
    "unicorn/no-array-sort": "off",
    // Responses are built with explicit headers/status in edge functions; Response.json is not on every runtime.
    "unicorn/prefer-response-static-json": "off",
    // Metro/Expo needs require() for asset and platform module loading and CommonJS config files.
    "unicorn/prefer-module": "off",
    "node/global-require": "off",
    // Early-return after a callback is the pattern used at platform boundaries.
    "node/callback-return": "off",
    // role="status" etc. are used on RN/web views where <output> would change semantics or layout.
    "jsx-a11y/prefer-tag-over-role": "off",
    // Concise `new Promise((r) => setTimeout(r, ms))` sleeps are used throughout.
    "no-promise-executor-return": "off",
    // Indexed access is clearer than destructuring in a handful of spots.
    "prefer-destructuring": "off",
    // Bitwise ops are used for hashing/flags.
    "no-bitwise": "off",
    // Display names are inferred from the const/function binding for memoized components.
    "react/display-name": "off",
  },
  overrides: [
    {
      files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
      plugins: ["vitest"],
      rules: {
        // vi.mock must precede the imports it affects, so imports follow it.
        "import/first": "off",
        // Mock type parameters are noise in small tests.
        "vitest/require-mock-type-parameters": "off",
        // Scenario tests assert several related outcomes at once.
        "vitest/max-expects": "off",
        // Test files group cases flatly.
        "vitest/require-top-level-describe": "off",
      },
    },
  ],
});
