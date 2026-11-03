// Captures the signed-out Journal, a typed check-in reflection and the Account
// sign-in screen for the YoursAlone promo. Every entry is invented test data.
// Needs the web dev server: (cd apps/web && npx vite --port 5195 --strictPort &)
// Usage: node scripts/capture-YoursAlone.mjs [baseUrl]
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(
  "/Users/amf/Desktop/Git-projects/MindfulVerse-video/apps/web/"
);
const { chromium } = require("playwright");

const BASE = process.argv[2] ?? "http://localhost:5195";
const OUT = join(import.meta.dirname, "../public/screens/series/YoursAlone");
mkdirSync(OUT, { recursive: true });
const DAY = 86_400_000;
const NOW = Date.now();
const PROMPT = "What stays with you from this verse?";
export const TEXT =
  "Ease was already beside the hard part. I only had to look up.";

const browser = await chromium.launch();
async function phone(seed) {
  const ctx = await browser.newContext({
    deviceScaleFactor: 3,
    hasTouch: true,
    isMobile: true,
    viewport: { height: 844, width: 390 },
  });
  await ctx.addInitScript((pairs) => {
    if (sessionStorage.getItem("__seeded")) {
      return;
    }
    sessionStorage.setItem("__seeded", "1");
    for (const [k, v] of Object.entries(pairs)) {
      localStorage.setItem(k, v);
    }
  }, seed);
  return { ctx, page: await ctx.newPage() };
}
const base = (entries) => ({
  "mindfulverse.installDismissed.v1": "1",
  "mindfulverse.theme.v1": "light",
  ...(entries ? { "mindfulverse.journal.v1": JSON.stringify(entries) } : {}),
});
async function settle(page, ms = 1200) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
}
const shot = (page, name) =>
  page
    .screenshot({ path: join(OUT, `${name}.png`) })
    .then(() => console.log("saved", name));
const LAYOUT = {};

// Journal, signed out, three invented entries (the "only on this device" line shows from three).
{
  const entries = [
    {
      body: "Slow down. The hard week is not the whole story.",
      context: { kind: "checkin", ref: "94:5" },
      createdAt: NOW - 3 * DAY,
      id: "a",
      prompt: PROMPT,
    },
    {
      body: "Ease was already beside the hard part. I only had to look up.",
      context: { kind: "checkin", ref: "94:6" },
      createdAt: NOW - 2 * DAY,
      id: "b",
      prompt: PROMPT,
    },
    {
      body: "Quiet morning. Grateful for small things.",
      context: { kind: "checkin", ref: "94:7" },
      createdAt: NOW - DAY,
      id: "c",
      prompt: PROMPT,
    },
  ];
  const { ctx, page } = await phone(base(entries));
  await page.goto(`${BASE}/journal`);
  await settle(page);
  const line = page.getByText("Entries live only on this device.");
  LAYOUT.line = await line.evaluate((el) => {
    const r = el.closest("p").getBoundingClientRect();
    return { h: r.height, w: r.width, x: r.left, y: r.top };
  });
  await shot(page, "journal");
  await ctx.close();
}

// Check-in: type the reflection word by word.
{
  const { ctx, page } = await phone(base(null));
  await page.goto(`${BASE}/checkin`);
  await settle(page, 1500);
  await page.getByRole("button", { name: /Just show me today/u }).click();
  await page.waitForTimeout(1500);
  const ta = page.locator("#checkin-journal");
  await ta.evaluate((el) =>
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 330)
  );
  await page.waitForTimeout(600);
  LAYOUT.checkinScroll = await page.evaluate(() => window.scrollY);
  const words = TEXT.split(" ");
  await shot(page, "type-0");
  for (let i = 1; i <= words.length; i++) {
    await ta.fill(words.slice(0, i).join(" "));
    await page.waitForTimeout(120);
    await shot(page, `type-${i}`);
  }
  LAYOUT.words = words.length;
  await page.getByRole("button", { name: "Keep in journal" }).click();
  await page.waitForTimeout(700);
  await page.evaluate((y) => window.scrollTo(0, y), LAYOUT.checkinScroll);
  await page.waitForTimeout(300);
  await shot(page, "kept");
  await ctx.close();
}

// Account, signed out.
{
  const { ctx, page } = await phone(base(null));
  await page.goto(`${BASE}/account`);
  await settle(page, 1500);
  await shot(page, "account");
  await ctx.close();
}
writeFileSync(join(OUT, "layout.json"), `${JSON.stringify(LAYOUT, null, 2)}\n`);
await browser.close();
