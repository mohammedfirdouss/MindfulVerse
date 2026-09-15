import { defineConfig } from "@playwright/test";

// Smoke-only config: one spec, real backend, skips cleanly without creds.
// See e2e/account-sync.spec.ts and README.md "Accounts & sync (v1)".
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run build && npm run preview",
    port: 4173,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
