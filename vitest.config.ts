import { defineConfig } from "vitest/config";

// One vitest run for the whole repo: the shared core, the web app, and the
// InsForge edge-function logic. Playwright specs (apps/web/e2e) run via
// `npm run test:e2e`, not vitest — the include globs keep the runners apart.
export default defineConfig({
  test: {
    include: [
      "packages/*/**/*.test.{ts,tsx}",
      "apps/*/src/**/*.test.{ts,tsx}",
      "functions/**/*.test.ts",
    ],
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
