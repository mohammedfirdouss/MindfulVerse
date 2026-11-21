// Captures the README screenshots (docs/screenshots) from the running web
// app: five phone screens and one desktop Home. The circle, account, journal
// and counts are invented test data, and every request that is not for the
// local preview is answered or dropped here, so nothing reaches the backend.
//
// Needs the web preview (stop it afterwards):
//   npm run build && npx vite preview --config apps/web/vite.config.ts --port 4300 --strictPort apps/web
// Usage: node scripts/capture-readme.mjs [webBase]
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(join(import.meta.dirname, "../apps/web/"));
const { chromium } = require("playwright");

const WEB = process.argv[2] ?? "http://localhost:4300";
const OUT = join(import.meta.dirname, "../docs/screenshots");
mkdirSync(OUT, { recursive: true });

// A fixed Friday morning, so the greeting and the week line up every run.
const NOW = new Date(2026, 10, 20, 9, 30).getTime();
const DAY = 86_400_000;
const SURAH = 67;
const VERSE = 2;
const CIRCLE = { code: "h4m9tz", name: "Night readers" };

const row = {
  code: CIRCLE.code,
  name: CIRCLE.name,
  surah: SURAH,
  updated_at: new Date(NOW - 2 * DAY).toISOString(),
  verse: 1,
  verse_end: 14,
};
const joined = [
  {
    code: CIRCLE.code,
    name: CIRCLE.name,
    surah: SURAH,
    updatedAt: NOW - 2 * DAY,
    verse: 1,
    verseEnd: 14,
  },
];
const user = {
  email: "reader@example.com",
  id: "00000000-0000-4000-8000-000000000001",
  profile: { name: "Test Reader" },
};

const dayKey = (t) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const at = (ageDays, hour) => {
  const d = new Date(NOW - ageDays * DAY);
  d.setHours(hour, 10, 0, 0);
  return d.getTime();
};
const journal = [
  {
    body: "I want to remember who holds everything, before I sleep.",
    context: { kind: "intention", ref: String(SURAH) },
    createdAt: at(3, 21),
    id: "r-int67",
    prompt: "Why I'm reading Al-Mulk",
  },
  {
    body: "Lessons: Life is a test of how well I act, not how much I do.\n\nAction: Do one thing slowly and well today.",
    context: { kind: "tadabbur", ref: `${SURAH}:${VERSE}` },
    createdAt: at(2, 21),
    id: "r-67-2",
    prompt: `Tadabbur on ${SURAH}:${VERSE}`,
  },
];
const seed = {
  "mindfulverse.circles.v2": JSON.stringify(joined),
  "mindfulverse.installDismissed.v1": "1",
  "mindfulverse.journal.v1": JSON.stringify(journal),
  "mindfulverse.surahTadabbur.v1": JSON.stringify({
    [SURAH]: { ayah: VERSE, updatedAt: at(2, 21) },
  }),
  "mindfulverse.theme.v1": "light",
  "mindfulverse.visits.v1": JSON.stringify(
    Array.from({ length: 6 }, (_, i) => dayKey(NOW - (5 - i) * DAY))
  ),
};

const browser = await chromium.launch();

async function open({ signedIn, width = 390, height = 844, scale = 2 }) {
  const ctx = await browser.newContext({
    deviceScaleFactor: scale,
    hasTouch: width < 600,
    isMobile: width < 600,
    reducedMotion: "reduce",
    serviceWorkers: "block",
    viewport: { height, width },
  });
  await ctx.clock.setFixedTime(NOW);
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
          ? json({ accessToken: "test-token", csrfToken: "x", user })
          : json({ error: "UNAUTHORIZED", message: "No session" }, 401);
      }
      if (p.startsWith("/api/auth/sessions/current")) {
        return signedIn ? json({ user }) : json({}, 401);
      }
      if (p.endsWith("/rpc/circle_member_count")) {
        return json(6);
      }
      if (p.endsWith("/rpc/circle_week_count")) {
        return json(4);
      }
      if (p.endsWith("/rpc/get_circle")) {
        return json([row]);
      }
      if (p.endsWith("/rpc/circle_history")) {
        return json([
          {
            ended_at: new Date(NOW - 9 * DAY).toISOString(),
            started_at: new Date(NOW - 30 * DAY).toISOString(),
            surah: 36,
          },
          {
            ended_at: null,
            started_at: new Date(NOW - 9 * DAY).toISOString(),
            surah: SURAH,
          },
        ]);
      }
      if (p.endsWith("/records/circles")) {
        return json(signedIn ? [row] : []);
      }
      return json([], method === "POST" ? 201 : 200);
    }
  );
  await ctx.addInitScript((pairs) => {
    if (sessionStorage.getItem("__seeded")) {
      return;
    }
    sessionStorage.setItem("__seeded", "1");
    localStorage.clear();
    for (const [k, v] of Object.entries(pairs)) {
      localStorage.setItem(k, v);
    }
  }, seed);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.warn("  page error:", e.message));
  return { ctx, page };
}

async function settle(page, ms = 1800) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
}

async function shot(page, name) {
  await page.screenshot({ path: join(OUT, `${name}.png`) });
  console.log("saved", name);
}

// ---- Phone screens ----
{
  const { ctx, page } = await open({ signedIn: false });
  await page.goto(`${WEB}/`);
  await settle(page);
  await shot(page, "home");

  await page.goto(`${WEB}/tadabbur/${SURAH}`);
  await settle(page);
  await shot(page, "surah");

  await page.goto(`${WEB}/read/${SURAH}?v=${VERSE}`);
  await settle(page, 2600);
  await shot(page, "reader");
  await page
    .locator("article.verse")
    .nth(VERSE - 1)
    .getByRole("button", { name: "Deeper look" })
    .click();
  await page.locator(".brief").waitFor();
  await page.waitForTimeout(700);
  await shot(page, "deeper");

  await page.goto(`${WEB}/journal`);
  await settle(page);
  await shot(page, "journal");
  await ctx.close();
}
{
  const { ctx, page } = await open({ signedIn: true });
  await page.goto(`${WEB}/circles`);
  await settle(page);
  await shot(page, "circles");
  await ctx.close();
}

// ---- Desktop Home ----
{
  const { ctx, page } = await open({
    height: 900,
    scale: 1,
    signedIn: false,
    width: 1440,
  });
  await page.goto(`${WEB}/`);
  await settle(page);
  await shot(page, "desktop");
  await ctx.close();
}

await browser.close();
