// Captures the screens for the DeeperLook promo: a verse in the reader, its
// Deeper look, a topic opened, and the commentary's verse list. Nothing here
// is user data, and every request that is not for the local preview is
// dropped by page.route, so nothing reaches the real backend.
//
// Needs the web preview (stop it afterwards):
//   npm run build && npx vite preview --config apps/web/vite.config.ts --port 4300 --strictPort apps/web
// Usage: node scripts/capture-deeper.mjs [webBase]
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(join(import.meta.dirname, "../../web/"));
const { chromium } = require("playwright");

const WEB = process.argv[2] ?? "http://localhost:4300";
const OUT = join(import.meta.dirname, "../public/screens/three");
mkdirSync(OUT, { recursive: true });

// The same fixed Friday morning as capture-three.mjs.
const NOW = new Date(2026, 10, 13, 9, 30).getTime();
const SURAH = 39;
const VERSE = 53;
// The commentary opens with the verses it covers; the video shows this many.
const LAST_LINE = 2;
const LAYOUT = { viewport: { h: 844, w: 390 } };

const browser = await chromium.launch();
const ctx = await browser.newContext({
  deviceScaleFactor: 3,
  hasTouch: true,
  isMobile: true,
  reducedMotion: "reduce",
  serviceWorkers: "block",
  viewport: { height: 844, width: 390 },
});
await ctx.clock.setFixedTime(NOW);
await ctx.route(
  (url) => !["localhost", "127.0.0.1"].includes(url.hostname),
  (route) => route.abort()
);
await ctx.addInitScript(() => {
  if (sessionStorage.getItem("__seeded")) {
    return;
  }
  sessionStorage.setItem("__seeded", "1");
  localStorage.clear();
  localStorage.setItem("mindfulverse.installDismissed.v1", "1");
  localStorage.setItem("mindfulverse.journal.v1", "[]");
  localStorage.setItem("mindfulverse.theme.v1", "light");
});
const page = await ctx.newPage();
page.on("pageerror", (e) => console.warn("  page error:", e.message));

async function shot(name) {
  await page.screenshot({ path: join(OUT, `${name}.png`) });
  console.log("saved", name);
}

/** Viewport rect of the first match (CSS px), stored under `name`. */
async function measure(name, locator) {
  LAYOUT[name] = await locator.first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { h: r.height, w: r.width, x: r.left, y: r.top };
  });
  return LAYOUT[name];
}

// ---- The reader at the verse, with "Deeper look" under the verse ----
await page.goto(`${WEB}/read/${SURAH}?v=${VERSE}`);
await page.waitForLoadState("networkidle").catch(() => {});
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(2600); // let the deep-link flash fade
const verse = page.locator("article.verse").nth(VERSE - 1);
const open = verse.getByRole("button", { name: "Deeper look" });
await measure("deeperVerse", verse);
await measure("deeperTranslation", verse.locator(".translation"));
await measure("deeperOpen", open);
await shot("deeper-reader");

// ---- The Deeper look sheet ----
await open.click();
await page.locator(".related-topic").waitFor();
await page.getByRole("button", { name: "Read the full commentary" }).click();
await page.locator(".tafsir p").nth(3).waitFor();
await page.waitForTimeout(700);
await measure("deeperSheet", page.locator(".sheet"));
await measure("deeperRelated", page.locator(".related"));
await measure("deeperTopic", page.locator(".related-topic"));
await shot("deeper-sheet");

// ---- The topic opened: the other verses that mention it ----
await page.locator(".related-topic").click();
await page.locator(".related-verses li").nth(2).waitFor();
await page.waitForTimeout(500);
await measure("deeperVerses", page.locator(".related-verses"));
await measure("deeperFirstVerse", page.locator(".related-verses li"));
await measure("deeperFirstLink", page.locator(".related-verses a"));
await shot("deeper-topic-open");

// ---- The commentary: each quoted verse on its own line ----
await page.locator(".related-topic").click();
await page.waitForTimeout(300);
const first = page.locator(".tafsir p").first();
await first.evaluate((el) => {
  const body = el.closest(".sheet-body");
  body.scrollTop +=
    el.getBoundingClientRect().top - body.getBoundingClientRect().top - 64;
});
await page.waitForTimeout(400);
await measure("deeperLines", first);
await measure("deeperLastLine", page.locator(".tafsir p").nth(LAST_LINE));
await shot("deeper-commentary");

writeFileSync(
  join(OUT, "deeper-layout.json"),
  `${JSON.stringify(LAYOUT, null, 2)}\n`
);
console.log("saved deeper-layout.json");
await browser.close();
