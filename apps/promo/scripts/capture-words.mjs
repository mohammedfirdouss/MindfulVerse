// Captures the screens for the WordByWord promo: Al-Baqarah 2:282 (the
// longest verse) in the reader, its Deeper look with the verse word by word,
// the whole word list as one tall image, and the authors' credit. Nothing
// here is user data, and every request that is not for the local preview is
// dropped by page.route, so nothing reaches the real backend.
//
// Needs the web preview (stop it afterwards):
//   npm run build && npx vite preview --config apps/web/vite.config.ts --port 4300 --strictPort apps/web
// Usage: node scripts/capture-words.mjs [webBase]
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
const SURAH = 2;
const VERSE = 282;
// Rows of words the close-up shows.
const CLOSE_UP_WORDS = 9;
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

// ---- The reader at the start of 2:282 ----
await page.goto(`${WEB}/read/${SURAH}?v=${VERSE}`);
await page.waitForLoadState("networkidle").catch(() => {});
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(2600); // let the deep-link flash fade
const verse = page.locator("article.verse").nth(VERSE - 1);
const open = verse.getByRole("button", { name: "Deeper look" });
await shot("words-reader-top");

// ---- The end of the verse, with "Deeper look" under it ----
await open.evaluate((el) =>
  window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 600)
);
await page.waitForTimeout(500);
await measure("wordsOpen", open);
await shot("words-reader-open");

// ---- Deeper look: the verse word by word ----
await open.click();
await page.locator(".wbw-cell").first().waitFor();
await page.waitForTimeout(800);
const cells = page.locator(".wbw-cell");
await measure("wordsBody", page.locator(".sheet-body"));
await measure("wordsList", page.locator(".wbw"));
await measure("wordsCloseUpEnd", cells.nth(CLOSE_UP_WORDS - 1));
LAYOUT.wordsCount = await cells.count();
await shot("words-sheet");

// ---- The authors' credit, under the last word ----
const credit = page.locator(".wbw-credit");
await credit.evaluate((el) => {
  const body = el.closest(".sheet-body");
  body.scrollTop +=
    el.getBoundingClientRect().top - body.getBoundingClientRect().top - 300;
});
await page.waitForTimeout(400);
await measure("wordsCredit", credit);
await shot("words-credit");

// ---- Every word as one tall image, for the scroll ----
await page.evaluate(() => {
  const sheet = document.querySelector(".sheet");
  const body = document.querySelector(".sheet-body");
  body.scrollTop = 0;
  for (const el of [sheet, body]) {
    el.style.maxHeight = "none";
    el.style.height = "auto";
    el.style.overflow = "visible";
  }
  sheet.style.position = "absolute";
  sheet.style.top = "0";
  sheet.style.bottom = "auto";
});
await page.waitForTimeout(300);
const list = page.locator(".wbw");
LAYOUT.wordsTall = await list.evaluate((el) => {
  const r = el.getBoundingClientRect();
  return { h: r.height, w: r.width };
});
await list.screenshot({ path: join(OUT, "words-all.png") });
console.log("saved words-all");

writeFileSync(
  join(OUT, "words-layout.json"),
  `${JSON.stringify(LAYOUT, null, 2)}\n`
);
console.log("saved words-layout.json");
await browser.close();
