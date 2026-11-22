// Captures the screens for the Passages promo on Surah Yusuf: the surah as an
// unbroken wall in the Reading view, the reader with its folded passage map,
// the map open, the map scrolled to "eaten by a wolf", and the reader after
// tapping it, then Al-Baqarah's and Al-Kahf's maps. No account is used; every request that is not for the local
// preview is answered or dropped by ctx.route, so nothing reaches the backend.
//
// Needs the web preview (stop it afterwards):
//   npm run build && npx vite preview --config apps/web/vite.config.ts --port 4300 --strictPort apps/web
// Usage: node scripts/capture-passages.mjs [webBase]
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(join(import.meta.dirname, "../../web/"));
const { chromium } = require("playwright");

const WEB = process.argv[2] ?? "http://localhost:4300";
const OUT = join(import.meta.dirname, "../public/screens/three");
mkdirSync(OUT, { recursive: true });

const NOW = new Date(2026, 10, 20, 9, 30).getTime();
const SURAH = 12;
/** "They told their father that Yusuf was eaten by a wolf", verses 16 to 18. */
const WOLF = 16;
/** Where the wall of text is shown from, in the Reading view. */
const WALL_VERSE = 4;

const LAYOUT = { viewport: { h: 844, w: 390 } };
const browser = await chromium.launch();

async function open(view) {
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
    (route) => {
      const url = new URL(route.request().url());
      if (!url.hostname.endsWith("insforge.app")) {
        return route.abort();
      }
      return route.fulfill({
        body: "[]",
        contentType: "application/json",
        status: 200,
      });
    }
  );
  await ctx.addInitScript((v) => {
    if (sessionStorage.getItem("__seeded")) {
      return;
    }
    sessionStorage.setItem("__seeded", "1");
    localStorage.clear();
    localStorage.setItem("mindfulverse.installDismissed.v1", "1");
    localStorage.setItem("mindfulverse.theme.v1", "light");
    localStorage.setItem("mindfulverse.readView.v1", v);
  }, view);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.warn("  page error:", e.message));
  return { ctx, page };
}

async function settle(page, ms = 1400) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
}

async function shot(page, name) {
  await page.screenshot({ path: join(OUT, `${name}.png`) });
  console.log("saved", name);
}

/** Viewport rect of the first match (CSS px), stored under `name`. */
async function measure(page, name, locator) {
  LAYOUT[name] = await locator.first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { h: r.height, w: r.width, x: r.left, y: r.top };
  });
  return LAYOUT[name];
}

// ---- 1. The surah as one unbroken wall, in the Reading view ----
{
  const { ctx, page } = await open("reading");
  await page.goto(`${WEB}/read/${SURAH}?v=${WALL_VERSE}`);
  await settle(page, 2200);
  await shot(page, "passages-wall");
  await ctx.close();
}

// ---- 2 to 5. The Translation view: map folded, open, scrolled, tapped ----
{
  const { ctx, page } = await open("translation");
  await page.goto(`${WEB}/read/${SURAH}`);
  await settle(page, 1800);
  const summary = page.locator(".passage-map summary");
  await summary.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(300);
  await measure(page, "passagesSummary", summary);
  await shot(page, "passages-folded");

  await summary.click();
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const s = document.querySelector(".passage-map summary");
    window.scrollBy(0, s.getBoundingClientRect().top - 120);
  });
  await page.waitForTimeout(400);
  await measure(page, "passagesList", page.locator(".passage-map ol"));
  await shot(page, "passages-open");

  const wolf = page
    .locator(".passage-map button")
    .filter({ hasText: `Verses ${WOLF} to` });
  await wolf.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(400);
  await measure(page, "passagesWolf", wolf);
  await shot(page, "passages-wolf");

  await wolf.click();
  await page.waitForTimeout(1500);
  await measure(page, "passagesHeading", page.locator(`#p${WOLF}`));
  await measure(page, "passagesFirstVerse", page.locator(`#v${WOLF}`));
  await shot(page, "passages-landed");
  await ctx.close();
}

// ---- 6. Long surahs: Al-Baqarah and Al-Kahf, map open ----
for (const [surah, name] of [
  [2, "passages-baqarah"],
  [18, "passages-kahf"],
]) {
  const { ctx, page } = await open("translation");
  await page.goto(`${WEB}/read/${surah}`);
  await settle(page, 1800);
  await page.locator(".passage-map summary").click();
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const s = document.querySelector(".surah-plate");
    window.scrollBy(0, s.getBoundingClientRect().top - 12);
  });
  await page.waitForTimeout(400);
  await shot(page, name);
  await ctx.close();
}

writeFileSync(
  join(OUT, "passages-layout.json"),
  `${JSON.stringify(LAYOUT, null, 2)}\n`
);
console.log("saved passages-layout.json");
await browser.close();
