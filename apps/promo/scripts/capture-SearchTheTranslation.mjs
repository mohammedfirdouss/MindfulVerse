// Captures Search, Reader index, Themes for SearchTheTranslation. No user data is used.
// Needs: (cd apps/web && npx vite --port 5196 --strictPort &)
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(
  "/Users/amf/Desktop/Git-projects/MindfulVerse-video/apps/web/"
);
const { chromium } = require("playwright");
const BASE = process.argv[2] ?? "http://localhost:5196";
const OUT = join(
  import.meta.dirname,
  "../public/screens/series/SearchTheTranslation"
);
mkdirSync(OUT, { recursive: true });
const WORD = "patience";
const L = { viewport: { h: 844, w: 390 } };
const browser = await chromium.launch();
const ctx = await browser.newContext({
  deviceScaleFactor: 3,
  hasTouch: true,
  isMobile: true,
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
const shot = async (n, full = false) => {
  await page.screenshot({ fullPage: full, path: join(OUT, `${n}.png`) });
  console.log("saved", n);
};
const measure = async (n, loc) => {
  L[n] = await loc.first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { h: r.height, w: r.width, x: r.left, y: r.top + scrollY };
  });
};

await page.goto(`${BASE}/search`);
await settle();
const input = page.getByLabel("Search the translation");
await measure("input", input);
await measure(
  "button",
  page.getByRole("button", { name: "Search", exact: true })
);
for (let i = 0; i <= WORD.length; i++) {
  await input.fill(WORD.slice(0, i));
  await page.waitForTimeout(80);
  await shot(`type-${i}`);
}
await page.getByRole("button", { name: "Search", exact: true }).click();
await settle(1500);
await page.evaluate(() => document.activeElement?.blur());
await shot("results");
L.count = await page
  .locator("section[aria-label='Search results'] p.muted")
  .first()
  .textContent();
L.rows = await page.locator("section[aria-label='Search results'] li").count();
console.log(L.count, L.rows);
await page.addStyleTag({ content: ".tabbar{display:none!important}" });
await page.waitForTimeout(300);
await shot("results-full", true);
L.fullH = await page.evaluate(() => document.documentElement.scrollHeight);
await page.addStyleTag({ content: ".tabbar{display:flex!important}" });
const bar = await page
  .locator(".tabbar")
  .evaluate((el) => el.getBoundingClientRect().height);
L.tabbarH = bar;
await page.screenshot({
  clip: { height: bar, width: 390, x: 0, y: 844 - bar },
  path: join(OUT, "tabbar.png"),
});

await page.goto(`${BASE}/read`);
await settle();
await measure(
  "linkSearch",
  page.getByRole("link", { name: "Search the translation" })
);
await measure(
  "linkTopic",
  page.getByRole("link", { name: "Find verses by topic" })
);
await shot("read");
await page.goto(`${BASE}/themes`);
await settle(1500);
await shot("themes");
writeFileSync(join(OUT, "layout.json"), `${JSON.stringify(L, null, 2)}\n`);
await browser.close();
