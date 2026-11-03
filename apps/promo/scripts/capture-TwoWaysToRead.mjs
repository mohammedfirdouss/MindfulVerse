// Captures the reader's two views and the Surah/Juz browse toggle for TwoWaysToRead.
// Needs: (cd apps/web && npx vite --port 5196 --strictPort &)
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(
  "/Users/amf/Desktop/Git-projects/MindfulVerse-video/apps/web/"
);
const { chromium } = require("playwright");
const BASE = process.argv[2] ?? "http://localhost:5196";
const OUT = join(import.meta.dirname, "../public/screens/series/TwoWaysToRead");
mkdirSync(OUT, { recursive: true });
const L = { viewport: { h: 844, w: 390 } };
const browser = await chromium.launch();
const ctx = await browser.newContext({
  deviceScaleFactor: 3,
  hasTouch: true,
  isMobile: true,
  reducedMotion: "reduce",
  viewport: { height: 844, width: 390 },
});
await ctx.addInitScript(() => {
  if (sessionStorage.getItem("__seeded")) {
    return;
  }
  sessionStorage.setItem("__seeded", "1");
  localStorage.setItem("mindfulverse.installDismissed.v1", "1");
  localStorage.setItem("mindfulverse.theme.v1", "light");
});
const page = await ctx.newPage();
const settle = async (ms = 1200) => {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
};
const shot = async (n) => {
  await page.screenshot({ path: join(OUT, `${n}.png`) });
  console.log("saved", n);
};
const measure = async (n, loc) => {
  L[n] = await loc.first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { h: r.height, w: r.width, x: r.left, y: r.top };
  });
};

await page.goto(`${BASE}/read`);
await settle();
await measure(
  "tabSurah",
  page.getByRole("button", { name: "Surah", exact: true })
);
await measure("tabJuz", page.getByRole("button", { name: "Juz", exact: true }));
await shot("read-surah");
await page.getByRole("button", { name: "Juz", exact: true }).click();
await settle(900);
await shot("read-juz");

await page.goto(`${BASE}/read/94`);
await settle(1500);
await measure("aa", page.getByRole("button", { name: "Reading settings" }));
await shot("s94-translation");
await page.getByRole("button", { name: "Reading settings" }).click();
await settle(800);
await measure(
  "btnTranslation",
  page.getByRole("button", { name: "Translation", exact: true })
);
await measure(
  "btnReading",
  page.getByRole("button", { name: "Reading", exact: true })
);
await measure("done", page.getByRole("button", { name: "Done" }));
await shot("sheet-translation");
await page.getByRole("button", { name: "Reading", exact: true }).click();
await settle(800);
await shot("sheet-reading");
await page.getByRole("button", { name: "Done" }).click();
await settle(900);
await shot("s94-reading");
writeFileSync(join(OUT, "layout.json"), `${JSON.stringify(L, null, 2)}\n`);
await browser.close();
