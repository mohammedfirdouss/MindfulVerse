import { test, expect } from "@playwright/test";

// Env-gated smoke test: sign in, write a journal entry, confirm it syncs to
// a second signed-in device. Skips cleanly when no credentials are supplied
// (CI / local dev without a verified test account). See README.md
// "Accounts & sync (v1)" for how to create a verified test account.
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;

test.skip(!EMAIL || !PASSWORD, "set E2E_EMAIL/E2E_PASSWORD to run");

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/account");
  await page.getByLabel("Email").fill(EMAIL!);
  await page.getByLabel("Password").fill(PASSWORD!);
  // The mode-toggle button ("Sign in" / "Create account") also has the name
  // "Sign in" in its default state, so the form's submit button is the last
  // match, not the first.
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click();
  await expect(page.getByText(/backed up to your account/i)).toBeVisible({ timeout: 15_000 });
}

test("sign in, write an entry, sync round-trip", async ({ page }) => {
  await signIn(page);

  // Journal entries are written from the daily check-in, not the Journal
  // page itself (Journal only lists/exports/deletes).
  await page.goto("/checkin");
  const marker = `e2e-${Date.now()}`;
  const journalBox = page.locator("#checkin-journal");
  await expect(journalBox).toBeVisible({ timeout: 15_000 });
  await journalBox.fill(marker);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText(/kept in your journal/i)).toBeVisible();

  // Force the push instead of racing the 3s debounce — deterministic rather
  // than a fixed sleep. "Sync now" also covers the pull side on this device.
  await page.goto("/account");
  await page.getByRole("button", { name: "Sync now" }).click();
  await expect(page.getByText(/backed up/i)).toBeVisible({ timeout: 15_000 });

  // Second context = second device: entry must arrive via sync.
  const ctx2 = await page.context().browser()!.newContext();
  const page2 = await ctx2.newPage();
  await signIn(page2);
  await page2.goto("/journal");
  await expect(page2.getByText(marker)).toBeVisible({ timeout: 20_000 });

  await ctx2.close();
});
