// Captures the app screens for the "Sit with the Qur'an" video: Al-An'am in the
// Reading view and its passage map, a circle reading Al-Hadid week by week
// (Home and its discussion questions), and Deeper look on Al-Balad 90:12
// (Ibn Kathir's commentary and "In short"). The word-by-word list is hidden in
// every capture: its meanings are still being checked. The circle, account and
// counts are invented test data, and every request that is not for the local
// preview is answered or dropped by ctx.route, so nothing reaches the backend.
//
// Needs the web preview (stop it afterwards):
//   npm run build && npx vite preview --config apps/web/vite.config.ts --port 4300 --strictPort apps/web
// Usage: node scripts/capture-sitwith.mjs [webBase]
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(join(import.meta.dirname, "../../web/"));
const { chromium } = require("playwright");

const WEB = process.argv[2] ?? "http://localhost:4300";
const OUT = join(import.meta.dirname, "../public/screens/three");
mkdirSync(OUT, { recursive: true });

// A fixed Friday morning, as in the other captures.
const NOW = new Date(2026, 10, 20, 9, 30).getTime();
const DAY = 86_400_000;
const SURAH = 57;
const NAME = "After Isha circle";
const CODE = "k7p2rw";
const MEMBERS = 7;
const REFLECTED = 5;
/** Al-An'am, for the passages scenes; the passage tapped starts at 11. */
const LONG_SURAH = 6;
const TAP_FROM = 11;
/** Al-Balad 90:12, for Deeper look. */
const DEEPER_SURAH = 90;
const DEEPER_VERSE = 12;
const WALL_HEIGHT = 2400;
const HIDE_WORDS = ".verse-words { display: none !important; }";

const row = (verse, verseEnd) => ({
  code: CODE,
  name: NAME,
  surah: SURAH,
  updated_at: new Date(NOW - 2 * DAY).toISOString(),
  verse,
  verse_end: verseEnd,
});
const JOINED = [
  {
    code: CODE,
    name: NAME,
    surah: SURAH,
    updatedAt: NOW - 2 * DAY,
    verse: 11,
    verseEnd: 19,
  },
];
const TEST_USER = {
  email: "reader@example.com",
  id: "00000000-0000-4000-8000-000000000001",
  profile: { name: "Test Reader" },
};

const LAYOUT = { viewport: { h: 844, w: 390 } };
const browser = await chromium.launch();

/** owns: whether the account already has the circle. */
async function open({ joined, owns, signedIn = true, view = "translation", height = 844 }) {
  const ctx = await browser.newContext({
    deviceScaleFactor: 3,
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
    serviceWorkers: "block",
    viewport: { height, width: 390 },
  });
  await ctx.clock.setFixedTime(NOW);
  let current = row(11, 19);
  await ctx.route(
    (url) => !["localhost", "127.0.0.1"].includes(url.hostname),
    async (route) => {
      const url = new URL(route.request().url());
      const method = route.request().method();
      const json = (data, status = 200) =>
        route.fulfill({
          body: JSON.stringify(data),
          contentType: "application/json",
          status,
        });
      if (!url.hostname.endsWith("insforge.app")) {
        return route.abort();
      }
      const p = url.pathname;
      if (p.startsWith("/api/auth/refresh")) {
        return signedIn
          ? json({ accessToken: "test-token", csrfToken: "x", user: TEST_USER })
          : json({ error: "UNAUTHORIZED", message: "No session" }, 401);
      }
      if (p.startsWith("/api/auth/sessions/current")) {
        return signedIn ? json({ user: TEST_USER }) : json({}, 401);
      }
      if (p.endsWith("/rpc/circle_member_count")) {
        return json(MEMBERS);
      }
      if (p.endsWith("/rpc/circle_week_count")) {
        return json(REFLECTED);
      }
      if (p.endsWith("/rpc/get_circle")) {
        return json([current]);
      }
      if (p.endsWith("/records/circles")) {
        if (method === "PATCH") {
          const body = route.request().postDataJSON() ?? {};
          current = { ...current, ...body };
          return json([current]);
        }
        if (method === "POST") {
          return json([current], 201);
        }
        return json(owns ? [current] : []);
      }
      return json([], method === "POST" ? 201 : 200);
    }
  );
  await ctx.addInitScript(
    (j) => {
      if (sessionStorage.getItem("__seeded")) {
        return;
      }
      sessionStorage.setItem("__seeded", "1");
      localStorage.clear();
      localStorage.setItem("mindfulverse.installDismissed.v1", "1");
      localStorage.setItem("mindfulverse.journal.v1", "[]");
      localStorage.setItem("mindfulverse.theme.v1", "light");
      localStorage.setItem("mindfulverse.readView.v1", j?.view ?? "translation");
      if (j?.circles) {
        localStorage.setItem("mindfulverse.circles.v2", JSON.stringify(j.circles));
      }
    },
    { circles: joined ? JOINED : null, view }
  );
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

// ---- Al-An'am: the wall of text, in the Reading view, several screens tall ----
{
  const { ctx, page } = await open({ joined: false, owns: false, signedIn: false, view: "reading", height: WALL_HEIGHT });
  await page.goto(`${WEB}/read/${LONG_SURAH}`);
  await settle(page, 2200);
  await page.evaluate(() => {
    const plate = document.querySelector(".surah-plate");
    window.scrollBy(0, plate.getBoundingClientRect().top - 12);
  });
  await page.addStyleTag({ content: "nav { display: none !important; }" });
  await page.waitForTimeout(400);
  await shot(page, "sit-wall");
  await ctx.close();
}

// ---- Al-An'am: the passage map, folded, open, scrolled, tapped ----
{
  const { ctx, page } = await open({ joined: false, owns: false, signedIn: false });
  await page.goto(`${WEB}/read/${LONG_SURAH}`);
  await settle(page, 1800);
  const summary = page.locator(".passage-map summary");
  await summary.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(300);
  await measure(page, "sitSummary", summary);
  await shot(page, "sit-folded");
  await summary.click();
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const s = document.querySelector(".passage-map summary");
    window.scrollBy(0, s.getBoundingClientRect().top - 120);
  });
  await page.waitForTimeout(400);
  await measure(page, "sitList", page.locator(".passage-map ol"));
  await shot(page, "sit-open");
  const target = page.locator(".passage-map button").filter({ hasText: `Verses ${TAP_FROM} to` });
  await target.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(400);
  await measure(page, "sitTarget", target);
  await shot(page, "sit-titles");
  await target.click();
  await page.waitForTimeout(1500);
  await measure(page, "sitLandedVerse", page.locator(`#v${TAP_FROM}`));
  await shot(page, "sit-landed");
  await ctx.close();
}

// ---- Home, a member of the Al-Hadid circle ----
{
  const { ctx, page } = await open({ joined: true, owns: false, signedIn: false });
  await page.goto(`${WEB}/`);
  await settle(page, 1800);
  await measure(page, "sitLead", page.locator(".home-lead"));
  await measure(page, "sitCount", page.locator(".home-circle-count"));
  await shot(page, "sit-home");
  await ctx.close();
}

// ---- The circle card with its discussion questions open ----
{
  const { ctx, page } = await open({ joined: true, owns: true });
  await page.goto(`${WEB}/circles`);
  await settle(page, 1800);
  const card = page.locator(".circle-card").first();
  const questions = card.locator(".circle-discuss summary");
  await questions.click();
  await page.waitForTimeout(400);
  await card.locator(".circle-discuss").evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(300);
  await measure(page, "sitQuestions", card.locator(".circle-discuss"));
  await shot(page, "sit-questions");
  await ctx.close();
}

// ---- Deeper look on Al-Balad 90:12: In short, then Ibn Kathir ----
{
  const { ctx, page } = await open({ joined: false, owns: false, signedIn: false });
  await page.goto(`${WEB}/read/${DEEPER_SURAH}?v=${DEEPER_VERSE}`);
  await settle(page, 2600);
  await page.addStyleTag({ content: HIDE_WORDS });
  const verse = page.locator("article.verse").nth(DEEPER_VERSE - 1);
  const openBtn = verse.getByRole("button", { name: "Deeper look" });
  await measure(page, "sitDeeperOpen", openBtn);
  await shot(page, "sit-deeper-reader");
  await openBtn.click();
  await page.locator(".brief").waitFor();
  await page.waitForTimeout(700);
  const scrollTo = (sel) =>
    page.locator(sel).first().evaluate((el) => {
      const body = el.closest(".sheet-body");
      body.scrollTop += el.getBoundingClientRect().top - body.getBoundingClientRect().top - 24;
    });
  await scrollTo(".brief");
  await page.waitForTimeout(400);
  await measure(page, "sitBrief", page.locator(".brief"));
  await shot(page, "sit-brief");
  await page.getByRole("button", { name: "Read the full commentary" }).click();
  await page.locator(".tafsir p").nth(2).waitFor();
  await page.waitForTimeout(500);
  await scrollTo(".tafsir");
  await page.waitForTimeout(400);
  await measure(
    page,
    "sitCommentary",
    page.locator("h3.deeper-heading").filter({ hasText: "Ibn Kathir" })
  );
  await shot(page, "sit-commentary");
  if ((await page.locator(".verse-words").count()) > 0 && (await page.locator(".verse-words").isVisible())) {
    throw new Error("word by word is visible");
  }
  await ctx.close();
}

writeFileSync(
  join(OUT, "sit-layout.json"),
  `${JSON.stringify(LAYOUT, null, 2)}\n`
);
console.log("saved sit-layout.json");
await browser.close();
