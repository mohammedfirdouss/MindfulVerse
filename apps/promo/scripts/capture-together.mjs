// Captures the screens for the ReadTogether promo: choosing this week's
// verses, the circle on Home, the circle card with its questions and QR code,
// moving to next week's verses, and "In short" in Deeper look. The circle,
// account and counts are invented test data, and every request that is not
// for the local preview is answered or dropped by ctx.route, so nothing
// reaches the real backend.
//
// Needs the web preview (stop it afterwards):
//   npm run build && npx vite preview --config apps/web/vite.config.ts --port 4300 --strictPort apps/web
// Usage: node scripts/capture-together.mjs [webBase]
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
const SURAH = 67;
const BRIEF_VERSE = 2;
const NAME = "Night readers";
const CODE = "h4m9tz";
const MEMBERS = 6;
const REFLECTED = 4;

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
    verse: 1,
    verseEnd: 14,
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
async function open({ joined, owns, signedIn = true }) {
  const ctx = await browser.newContext({
    deviceScaleFactor: 3,
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
    serviceWorkers: "block",
    viewport: { height: 844, width: 390 },
  });
  await ctx.clock.setFixedTime(NOW);
  let current = row(1, 14);
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
      if (j) {
        localStorage.setItem("mindfulverse.circles.v2", JSON.stringify(j));
      }
    },
    joined ? JOINED : null
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

// ---- 1. Start a circle on Al-Mulk and choose this week's verses ----
{
  const { ctx, page } = await open({ joined: false, owns: false });
  await page.goto(`${WEB}/circles`);
  await settle(page);
  const form = page.locator(".circle-form");
  await form.locator("input.field-input").first().fill(NAME);
  await form.locator("select").first().selectOption(String(SURAH));
  await page.waitForTimeout(300);
  const portion = form.locator("select").nth(1);
  await measure(page, "togetherPortion", portion);
  await measure(page, "togetherPortionField", portion.locator(".."));
  await shot(page, "together-form-whole");
  await portion.selectOption({ index: 1 });
  await page.waitForTimeout(300);
  await shot(page, "together-form-week");
  await ctx.close();
}

// ---- 2. Home, a member of the circle ----
{
  const { ctx, page } = await open({
    joined: true,
    owns: false,
    signedIn: false,
  });
  await page.goto(`${WEB}/`);
  await settle(page, 1800);
  await measure(page, "togetherLead", page.locator(".home-lead"));
  await measure(page, "togetherCount", page.locator(".home-circle-count"));
  await shot(page, "together-home");
  await ctx.close();
}

// ---- 3 to 5. The circle card: questions, QR code, next week's verses ----
{
  const { ctx, page } = await open({ joined: true, owns: true });
  await page.goto(`${WEB}/circles`);
  await settle(page, 1800);
  const card = page.locator(".circle-card").first();
  await measure(page, "togetherCard", card);
  await shot(page, "together-card");

  const questions = card.locator(".circle-discuss summary");
  await measure(page, "togetherQuestionsToggle", questions);
  await questions.click();
  await page.waitForTimeout(400);
  await measure(page, "togetherQuestions", card.locator(".circle-discuss"));
  await shot(page, "together-questions");
  await questions.click();
  await page.waitForTimeout(300);

  const qrButton = card.getByRole("button", { name: "QR code" });
  await qrButton.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await measure(page, "togetherQrButton", qrButton);
  await measure(page, "togetherShare", card.locator(".circle-share"));
  await shot(page, "together-share");
  await qrButton.click();
  await page.waitForTimeout(500);
  await card
    .locator(".circle-qr-figure")
    .evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(400);
  await measure(page, "togetherQr", card.locator(".circle-qr-figure"));
  await shot(page, "together-qr");
  await qrButton.click();
  await page.waitForTimeout(300);

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  const next = card.getByRole("button", { name: "Next week’s verses" });
  await measure(page, "togetherNextButton", next);
  await measure(page, "togetherSummary", card.locator(".circle-item-line"));
  await measure(page, "togetherNextRow", card.locator(".circle-next-row"));
  await shot(page, "together-before-next");
  await next.click();
  await page.waitForTimeout(1200);
  await measure(
    page,
    "togetherSummaryAfter",
    card.locator(".circle-item-line")
  );
  await shot(page, "together-after-next");
  await ctx.close();
}

// ---- 6. "In short" in Deeper look ----
{
  const { ctx, page } = await open({
    joined: false,
    owns: false,
    signedIn: false,
  });
  await page.goto(`${WEB}/read/${SURAH}?v=${BRIEF_VERSE}`);
  await settle(page, 2600);
  const verse = page.locator("article.verse").nth(BRIEF_VERSE - 1);
  const openBtn = verse.getByRole("button", { name: "Deeper look" });
  await measure(page, "briefOpen", openBtn);
  await measure(page, "briefTranslation", verse.locator(".translation"));
  await shot(page, "brief-reader");
  await openBtn.click();
  await page.locator(".brief").waitFor();
  await page.waitForTimeout(700);
  const brief = page.locator(".brief");
  await brief.evaluate((el) => {
    const body = el.closest(".sheet-body");
    body.scrollTop +=
      el.getBoundingClientRect().top - body.getBoundingClientRect().top - 24;
  });
  await page.waitForTimeout(400);
  await measure(page, "brief", brief);
  await shot(page, "brief-sheet");
  await ctx.close();
}

writeFileSync(
  join(OUT, "together-layout.json"),
  `${JSON.stringify(LAYOUT, null, 2)}\n`
);
console.log("saved together-layout.json");
await browser.close();
