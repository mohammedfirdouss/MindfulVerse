// Captures the screens for four promos: OneSurahOneWeek, StandLoop,
// StartACircle and Explainer. Every journal entry, circle, name and account
// here is invented test data. Every request that is not for the local preview
// is answered by page.route, so nothing reaches the real backend.
//
// Needs the web preview (stop it afterwards):
//   npm run build && npx vite preview --config apps/web/vite.config.ts --port 4300 --strictPort apps/web
// Usage: node scripts/capture-three.mjs [webBase]
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(join(import.meta.dirname, "../../web/"));
const { chromium } = require("playwright");

const WEB = process.argv[2] ?? "http://localhost:4300";
const OUT = join(import.meta.dirname, "../public/screens/three");
mkdirSync(OUT, { recursive: true });

// A fixed Friday morning, so the greeting and the week line up every run.
const NOW = new Date(2026, 10, 13, 9, 30).getTime();
const DAY = 86_400_000;
const PUBLIC_ORIGIN = "https://mindfulverse.app";

// The words typed in the videos (the approved storyboards).
const INTENTION = "I've been anxious about work.";
const REFLECTION = "Ease is already beside the hardship.";
const ACTION = "Pray two rak'ahs before I open my inbox.";
const SURAH = 94;
const VERSE = 5;

const CIRCLE = {
  code: "k7m2qx",
  name: "Friday friends",
  surah: 18,
  updatedAt: NOW - 2 * DAY,
  verse: null,
};
const CIRCLE_ROW = {
  code: CIRCLE.code,
  name: CIRCLE.name,
  surah: CIRCLE.surah,
  updated_at: new Date(CIRCLE.updatedAt).toISOString(),
  verse: null,
};
const TEST_USER = {
  email: "reader@example.com",
  id: "00000000-0000-4000-8000-000000000001",
  profile: { name: "Test Reader" },
};

const at = (ageDays, hour = 8) => {
  const d = new Date(NOW - ageDays * DAY);
  d.setHours(hour, 15, 0, 0);
  return d.getTime();
};

/** What the device holds a week after the tadabbur in video 1: the intention
 *  and the kept reflection with its action, both seven days old. */
const WEEK_OLD_JOURNAL = [
  {
    body: INTENTION,
    context: { kind: "intention", ref: String(SURAH) },
    createdAt: at(7, 7),
    id: "t-int94",
    prompt: "Why I'm reading Ash-Sharh",
  },
  {
    body: `Lessons: ${REFLECTION}\n\nAction: ${ACTION}`,
    context: { kind: "tadabbur", ref: `${SURAH}:${VERSE}` },
    createdAt: at(7),
    id: "t-94-5",
    prompt: `Tadabbur on ${SURAH}:${VERSE}`,
  },
];
const WEEK_OLD_PROGRESS = {
  [SURAH]: { ayah: VERSE, updatedAt: at(7) },
};

const browser = await chromium.launch();
const LAYOUT = { viewport: { h: 844, w: 390 } };

/** Answers every non-local call here; anything unknown is dropped. */
async function mockBackend(ctx, { signedIn }) {
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
      if (p.endsWith("/rpc/circle_week_count")) {
        return json(3);
      }
      if (p.endsWith("/rpc/get_circle")) {
        return json([CIRCLE_ROW]);
      }
      if (p.endsWith("/records/circles")) {
        // The new account has no circles until it starts one.
        return method === "POST" ? json([CIRCLE_ROW], 201) : json([]);
      }
      return json([], method === "POST" ? 201 : 200);
    }
  );
}

/** A fresh context: no service worker, empty caches, seeded localStorage. */
async function open({ seed, signedIn = false }) {
  const ctx = await browser.newContext({
    deviceScaleFactor: 3,
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
    serviceWorkers: "block",
    viewport: { height: 844, width: 390 },
  });
  await ctx.clock.setFixedTime(NOW);
  await mockBackend(ctx, { signedIn });
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
  // Belt and braces: drop any worker or cache left from another origin run.
  await page.goto(`${WEB}/favicon.svg`).catch(() => {});
  await page
    .evaluate(async () => {
      for (const r of (await navigator.serviceWorker?.getRegistrations()) ??
        []) {
        await r.unregister();
      }
      for (const k of (await caches?.keys()) ?? []) {
        await caches.delete(k);
      }
    })
    .catch(() => {});
  return { ctx, page };
}

const seedOf = ({ journal = [], circle = false, extra = {} } = {}) => ({
  "mindfulverse.installDismissed.v1": "1",
  "mindfulverse.journal.v1": JSON.stringify(journal),
  "mindfulverse.theme.v1": "light",
  ...(circle ? { "mindfulverse.circle.v1": JSON.stringify(CIRCLE) } : {}),
  ...extra,
});

async function settle(page, ms = 1200) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
}

async function shot(page, name) {
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

async function scrollTo(page, locator, offset) {
  await locator
    .first()
    .evaluate(
      (el, off) =>
        window.scrollTo(
          0,
          el.getBoundingClientRect().top + window.scrollY - off
        ),
      offset
    );
  await page.waitForTimeout(400);
}

/** Leaves the field so no focus ring or caret is in the capture. */
async function blur(page) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
  await page.waitForTimeout(150);
}

// ---- A fresh device: Home, then Ash-Sharh from "Begin with a surah" ----
{
  const { ctx, page } = await open({ seed: seedOf() });
  await page.goto(`${WEB}/`);
  await settle(page, 1800);
  const chip = page
    .locator(".home-lead-suggestions")
    .getByRole("link", { name: "Ash-Sharh" });
  await measure("beginLead", page.locator(".home-lead"));
  await measure("beginChip", chip);
  await shot(page, "home-begin");

  await chip.click();
  await page.waitForURL(`**/tadabbur/${SURAH}`);
  await settle(page, 1400);
  const intention = page.locator(".intention .tad-input");
  await scrollTo(page, page.locator(".intention"), 330);
  await measure("intentionLabel", page.locator(".intention .tad-prompt"));
  await measure("intentionField", intention);
  await shot(page, "intention-empty");
  await intention.fill(INTENTION);
  await blur(page);
  await shot(page, "intention-typed");
  await ctx.close();
}

// ---- Verse 94:5: the verse, its commentary, a reflection, an action ----
{
  const { ctx, page } = await open({ seed: seedOf() });
  await page.goto(`${WEB}/tadabbur/${SURAH}?v=${VERSE}`);
  await settle(page, 1600);
  const open_ = page.getByRole("button", { name: /Read the commentary/u });
  await measure("verse", page.locator(".verse"));
  await measure("verseArabic", page.locator(".verse .arabic"));
  await measure("verseTranslation", page.locator(".verse .translation"));
  await measure("commentaryOpen", open_);
  await shot(page, "verse");

  await open_.first().click();
  await page.locator(".card.tafsir p").nth(1).waitFor();
  await page.waitForTimeout(700);
  await measure("commentaryCard", page.locator(".card.tafsir"));
  await shot(page, "verse-commentary");

  // Close it again: the verse stays in view above the questions.
  await page.getByRole("button", { name: "Hide the commentary" }).click();
  await page.waitForTimeout(300);
  const field = page.locator(".tad-reflect .tad-input");
  await scrollTo(page, page.locator(".verse"), 110);
  await measure("reflectLabel", page.locator(".tad-reflect .tad-prompt"));
  await measure("reflectField", field);
  await shot(page, "reflect-empty");
  await field.fill(REFLECTION);
  await blur(page);
  await shot(page, "reflect-typed");

  await page.getByRole("button", { name: "Next question" }).click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Skip this question" }).click();
  await page.getByText("What will you do?").waitFor();
  await blur(page);
  await measure("actionLabel", page.locator(".tad-reflect .tad-prompt"));
  await measure("actionField", field);
  await shot(page, "action-empty");
  await field.fill(ACTION);
  await blur(page);
  await shot(page, "action-typed");
  await ctx.close();
}

// ---- Seven days later: Home's follow-up card, before and after "Yes" ----
{
  const { ctx, page } = await open({
    seed: seedOf({
      extra: {
        "mindfulverse.surahTadabbur.v1": JSON.stringify(WEEK_OLD_PROGRESS),
      },
      journal: WEEK_OLD_JOURNAL,
    }),
  });
  await page.goto(`${WEB}/`);
  await settle(page, 1800);
  const card = page.locator(".followup");
  await scrollTo(page, card, 190);
  await measure("followup", card);
  await measure("followupYes", card.getByRole("button", { name: "Yes" }));
  await shot(page, "home-followup");
  await card.getByRole("button", { name: "Yes" }).click();
  await page.getByText("Anything to add? (optional)").waitFor();
  await page.waitForTimeout(400);
  await measure("followupNote", card);
  await shot(page, "home-followup-yes");
  await ctx.close();
}

// ---- The same week-old device: the surah's own journal page ----
{
  const { ctx, page } = await open({
    seed: seedOf({
      extra: {
        "mindfulverse.surahTadabbur.v1": JSON.stringify(WEEK_OLD_PROGRESS),
      },
      journal: WEEK_OLD_JOURNAL,
    }),
  });
  await page.goto(`${WEB}/tadabbur/${SURAH}/journal`);
  await page.getByRole("heading", { name: "Your page on Ash-Sharh" }).waitFor();
  await settle(page, 1600);
  await measure("journalHeading", page.getByRole("heading", { level: 1 }));
  await measure("journalItem", page.locator(".sj-item"));
  await shot(page, "surah-journal");
  await ctx.close();
}

// ---- Start a circle (signed in as a test account) ----
{
  const { ctx, page } = await open({ seed: seedOf(), signedIn: true });
  await page.goto(`${WEB}/circles`);
  await settle(page, 1600);
  const name = page.locator(".circle-form input.field-input").first();
  const surah = page.locator(".circle-form select");
  const heading = page.getByRole("heading", { name: "Start a circle" });
  // The picker opens on a surah near the top of the list, so choosing shows.
  await surah.selectOption("1");
  await scrollTo(page, heading, 150);
  await measure("formName", name);
  await measure("formSurah", surah);
  await measure(
    "formSubmit",
    page.getByRole("button", { name: "Start circle" })
  );
  await shot(page, "circle-form-empty");
  await name.fill(CIRCLE.name);
  await blur(page);
  await shot(page, "circle-form-named");
  await surah.selectOption(String(CIRCLE.surah));
  await page.waitForTimeout(200);
  await shot(page, "circle-form-surah");

  await page.getByRole("button", { name: "Start circle" }).click();
  await page.getByText("is ready. Anyone with the link can join.").waitFor();
  await page.waitForTimeout(500);
  // The invite link as people see it in production, not the local preview.
  await page
    .locator(".circle-link")
    .first()
    .evaluate((el, url) => {
      el.textContent = url;
    }, `${PUBLIC_ORIGIN}/circle/${CIRCLE.code}`);
  await scrollTo(page, heading, 150);
  await measure("createdNotice", page.locator(".notice-wash"));
  await measure("createdLink", page.locator(".circle-link"));
  await measure("createdCopy", page.getByRole("button", { name: "Copy link" }));
  await shot(page, "circle-created");
  await ctx.close();
}

// ---- A member's Home after joining from the link ----
{
  const { ctx, page } = await open({ seed: seedOf({ circle: true }) });
  await page.goto(`${WEB}/`);
  await settle(page, 1800);
  await measure("homeLead", page.locator(".home-lead"));
  await measure("homeCount", page.locator(".home-circle-count"));
  await shot(page, "home-circle");
  await ctx.close();
}

writeFileSync(join(OUT, "layout.json"), `${JSON.stringify(LAYOUT, null, 2)}\n`);
console.log("saved layout.json");
await browser.close();
