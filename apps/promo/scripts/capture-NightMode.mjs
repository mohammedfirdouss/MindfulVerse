// Captures Home, a surah reading view, the Journal and Account > Appearance in
// light and dark for the NightMode promo. All entries are invented test data.
// Needs: (cd apps/web && npx vite --port 5192 --strictPort &)
// Usage: node scripts/capture-NightMode.mjs [baseUrl]
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(
  "/Users/amf/Desktop/Git-projects/MindfulVerse/apps/web/"
);
const { chromium } = require("playwright");

const BASE = process.argv[2] ?? "http://localhost:5192";
const OUT = join(import.meta.dirname, "../public/screens/series/NightMode");
mkdirSync(OUT, { recursive: true });
const NOW = Date.now();
const entries = [
  {
    body: "Lessons: Ease is promised alongside the hardship, not only after it.\n\nReflection: A slower evening helped me read it properly.\n\nAction: Write down one ease tonight",
    context: { kind: "tadabbur", ref: "94:5" },
    createdAt: NOW - 3_600_000,
    id: "t1",
    prompt: "Tadabbur on 94:5",
  },
];
const LAYOUT = {};
const browser = await chromium.launch();

for (const theme of ["light", "dark"]) {
  const ctx = await browser.newContext({
    deviceScaleFactor: 3,
    hasTouch: true,
    isMobile: true,
    viewport: { height: 844, width: 390 },
  });
  await ctx.addInitScript(
    ([t, j]) => {
      localStorage.setItem("mindfulverse.installDismissed.v1", "1");
      localStorage.setItem("mindfulverse.theme.v1", t);
      localStorage.setItem("mindfulverse.verseSeed.v1", "promo-night");
      localStorage.setItem("mindfulverse.journal.v1", j);
    },
    [theme, JSON.stringify(entries)]
  );
  const page = await ctx.newPage();
  const go = async (path, name, ms = 1500) => {
    await page.goto(`${BASE}${path}`);
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(ms);
    await page.screenshot({ path: join(OUT, `${name}-${theme}.png`) });
    console.log("saved", name, theme);
  };
  await go("/", "home");
  await go("/read/94", "read");
  await go("/journal", "journal");
  await page.goto(`${BASE}/account`);
  await page.waitForTimeout(1500);
  const h = page.getByRole("heading", { name: "Appearance" });
  await h.evaluate((el) =>
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 260)
  );
  await page.waitForTimeout(500);
  for (const label of ["Light", "Night"]) {
    LAYOUT[label] = await page
      .getByRole("radio", { name: label })
      .evaluate((el) => {
        const r = el.getBoundingClientRect();
        return { h: r.height, w: r.width, x: r.left, y: r.top };
      });
  }
  await page.screenshot({ path: join(OUT, `account-${theme}.png`) });
  console.log("saved account", theme);
  await ctx.close();
}
writeFileSync(join(OUT, "layout.json"), `${JSON.stringify(LAYOUT, null, 2)}\n`);
await browser.close();
