// Captures the screens for the WhatsNew promo (circles, Home's surah lead,
// the week rhythm, session follow-ups, the Android app and the desktop
// sidebar). Every journal entry, circle and account here is invented test
// data. All traffic to the InsForge backend is answered locally by
// page.route, so nothing reaches the real project.
//
// Needs two servers (stop them afterwards):
//   web:    npm run build && npx vite preview --config apps/web/vite.config.ts --port 4300 --strictPort apps/web
//   mobile: (cd apps/mobile && CI=1 npx expo start --web --port 8099)
// Usage: node scripts/capture-whatsnew.mjs [webBase] [mobileBase]
//        SKIP_MOBILE=1 skips the Expo screens.
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(join(import.meta.dirname, "../../web/"));
const { chromium } = require("playwright");

const WEB = process.argv[2] ?? "http://localhost:4300";
const MOBILE = process.argv[3] ?? "http://localhost:8099";
const OUT = join(import.meta.dirname, "../public/screens/whatsnew");
mkdirSync(OUT, { recursive: true });

// A fixed Sunday morning, so the greeting and the week line up every run.
const NOW = new Date(2026, 10, 8, 9, 30).getTime();
const DAY = 86_400_000;
const PUBLIC_ORIGIN = "https://mindfulverse.app";

const CIRCLE = {
  code: "k7m2qx",
  name: "Al-Noor halaqa",
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

const body = (parts) =>
  [
    ["Lessons", parts.lessons],
    ["Reflection", parts.reflection],
    ["Action", parts.action],
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n\n");

const at = (ageDays, hour = 8) => {
  const d = new Date(NOW - ageDays * DAY);
  d.setHours(hour, 15, 0, 0);
  return d.getTime();
};

const tadabbur = (id, ref, ageDays, parts) => ({
  body: body(parts),
  context: { kind: "tadabbur", ref },
  createdAt: at(ageDays),
  id,
  prompt: `Tadabbur on ${ref}`,
});

/** Four of the last seven days kept, an old tadabbur and an old session with
 *  actions (so a follow-up is due), and an intention for Al-Kahf. */
const JOURNAL = [
  {
    body: "To understand why we read it every Friday.",
    context: { kind: "intention", ref: "18" },
    createdAt: at(10),
    id: "w-int18",
    prompt: "Why I'm reading Al-Kahf",
  },
  {
    body: body({
      action: "Call my aunt and ask how she is",
      reflection: "The hard months last winter, and who stayed close.",
    }),
    context: { kind: "session", ref: "patience-in-hardship" },
    createdAt: at(9),
    id: "w-sess",
    prompt:
      "Write about a past hardship you eventually moved through. What helped you endure it?",
  },
  tadabbur("w-t8", "18:2", 8, {
    action: "Read Al-Kahf with my brother on Friday",
    lessons: "The Book is straight, with no crookedness in it.",
  }),
  tadabbur("w-t5", "18:10", 5, {
    lessons: "When they had nowhere to go, they asked for mercy first.",
    reflection: "I ask for answers before I ask for mercy.",
  }),
  {
    body: "Grateful for a quiet morning.",
    context: { kind: "checkin" },
    createdAt: at(3),
    id: "w-c3",
    prompt: "How are you arriving today?",
  },
  tadabbur("w-t1", "18:13", 1, {
    lessons: "They believed, and were given more guidance.",
  }),
  tadabbur("w-t0", "18:28", 0, {
    reflection: "Keep company with those who remember Him.",
  }),
];

const browser = await chromium.launch();
const LAYOUT = { viewport: { h: 844, w: 390 } };

/** Answers every InsForge call locally. */
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
        return json([CIRCLE_ROW], method === "POST" ? 201 : 200);
      }
      return json([], method === "POST" ? 201 : 200);
    }
  );
}

/** A fresh context: no service worker, empty caches, seeded localStorage. */
async function open({
  seed,
  signedIn = false,
  viewport = { height: 844, width: 390 },
  mobile = true,
}) {
  const ctx = await browser.newContext({
    deviceScaleFactor: mobile ? 3 : 2,
    hasTouch: mobile,
    isMobile: mobile,
    reducedMotion: "reduce",
    serviceWorkers: "block",
    viewport,
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

const seedOf = ({ journal = JOURNAL, circle = false, extra = {} } = {}) => ({
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

async function shot(page, name, opts = {}) {
  await page.screenshot({ path: join(OUT, `${name}.png`), ...opts });
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

// ---- Scene 3: a surah opened alone ----
{
  const { ctx, page } = await open({ seed: seedOf({ journal: [] }) });
  await page.goto(`${WEB}/read/18`);
  await settle(page, 1600);
  await shot(page, "alone-read");
  await ctx.close();
}

// ---- Scenes 5, 6: start a circle (signed in as a test account) ----
{
  const { ctx, page } = await open({
    seed: seedOf({ journal: [] }),
    signedIn: true,
  });
  await page.goto(`${WEB}/circles`);
  await settle(page, 1600);
  const name = page.locator(".circle-form input.field-input").first();
  const surah = page.locator(".circle-form select");
  await scrollTo(
    page,
    page.getByRole("heading", { name: "Start a circle" }),
    150
  );
  await surah.selectOption("1");
  await page.waitForTimeout(200);
  await measure("formName", name);
  await measure("formSurah", surah);
  await measure(
    "formSubmit",
    page.getByRole("button", { name: "Start circle" })
  );
  await shot(page, "circle-form-empty");
  await name.fill(CIRCLE.name);
  await surah.selectOption("18");
  await page.waitForTimeout(200);
  await shot(page, "circle-form-filled");

  await page.getByRole("button", { name: "Start circle" }).click();
  await page.getByText("is ready and on your Home").waitFor();
  await page.waitForTimeout(500);
  // The invite link as people see it in production, not the local preview.
  await page
    .locator(".circle-link")
    .first()
    .evaluate((el, url) => {
      el.value = url;
      el.scrollLeft = el.scrollWidth;
    }, `${PUBLIC_ORIGIN}/circle/${CIRCLE.code}`);
  await scrollTo(
    page,
    page.getByRole("heading", { name: "Start a circle" }),
    150
  );
  await measure("createdLink", page.locator(".circle-link"));
  await measure("createdCopy", page.getByRole("button", { name: "Copy link" }));
  await shot(page, "circle-created");
  await ctx.close();
}

// ---- Scenes 7, 10: a friend's Home after joining from the link ----
{
  const { ctx, page } = await open({
    seed: seedOf({ circle: true, journal: [] }),
  });
  await page.goto(`${WEB}/`);
  await settle(page, 1800);
  await measure("homeLead", page.locator(".home-lead"));
  await measure("homeCount", page.locator(".home-circle-count"));
  await shot(page, "home-circle");
  await ctx.close();
}

// ---- Scene 8: a verse of Al-Kahf with Ibn Kathir, writing ----
{
  const { ctx, page } = await open({
    seed: seedOf({ circle: true, journal: [] }),
  });
  await page.goto(`${WEB}/tadabbur/18?v=10`);
  await settle(page, 1600);
  await page
    .getByRole("button", { name: /Read the commentary/u })
    .first()
    .click();
  await page.waitForTimeout(900);
  await shot(page, "verse-top");
  const field = page.locator(".tad-input");
  await scrollTo(page, page.locator(".tad-reflect"), 330);
  await measure("verseField", field);
  await shot(page, "verse-write");
  await ctx.close();
}

// ---- Scene 9: the privacy line, on the Circles page ----
{
  const { ctx, page } = await open({
    seed: seedOf({ circle: true, journal: [] }),
  });
  await page.goto(`${WEB}/circles`);
  await settle(page, 1600);
  await measure("privacy", page.locator(".circles-privacy"));
  await shot(page, "circles-joined");
  await ctx.close();
}

// ---- Scenes 12, 13, 14: Home without a circle, the week, the follow-up ----
{
  const { ctx, page } = await open({ seed: seedOf() });
  await page.goto(`${WEB}/`);
  await settle(page, 1800);
  await measure("startersLead", page.locator(".home-lead"));
  await shot(page, "home-starters");
  await scrollTo(page, page.locator(".followup"), 140);
  await measure("followup", page.locator(".followup"));
  await measure("week", page.locator(".week-rhythm"));
  LAYOUT.weekDots = await page
    .locator(".week-rhythm-dots i")
    .evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return {
          h: r.height,
          on: el.classList.contains("on"),
          w: r.width,
          x: r.left,
          y: r.top,
        };
      })
    );
  await shot(page, "home-week");
  await ctx.close();
}
{
  const id = "gratitude";
  const { ctx, page } = await open({
    seed: seedOf({
      extra: {
        [`mindfulverse.sessionDraft.v1:${id}`]: JSON.stringify({
          action: "",
          body: "My mother's voice on the phone, the walk to the mosque, and a friend who checked in.",
        }),
      },
    }),
  });
  await page.goto(`${WEB}/sessions/${id}`);
  await settle(page, 1400);
  await page.getByRole("button", { name: "Begin" }).click();
  for (let i = 0; i < 6; i += 1) {
    const next = page.getByRole("button", { name: /^(Next|Finish|Continue)/u });
    if ((await page.getByText("What will you do? (optional)").count()) > 0) {
      break;
    }
    await next.first().click();
    await page.waitForTimeout(500);
  }
  await settle(page, 900);
  const action = page.getByLabel("What will you do? (optional)");
  await scrollTo(page, page.getByText("What will you do? (optional)"), 420);
  await measure("sessionAction", action);
  await shot(page, "session-end");
  await action.fill("Thank my mother properly");
  await page.waitForTimeout(200);
  await shot(page, "session-end-typed");
  await ctx.close();
}

// ---- Scene 16: the desktop sidebar ----
{
  const { ctx, page } = await open({
    mobile: false,
    seed: seedOf({ circle: true, journal: [] }),
    viewport: { height: 900, width: 1440 },
  });
  await page.goto(`${WEB}/circles`);
  await settle(page, 1600);
  await measure("deskSidebar", page.locator(".sidebar"));
  await measure(
    "deskCircles",
    page.locator(".sidebar").getByRole("link", { name: "Circles" })
  );
  await shot(page, "desktop-circles");
  await ctx.close();
}

// ---- Scene 15: the Android app (Expo web build) ----
if (!process.env.SKIP_MOBILE) {
  const go = async (path, name, wait = 4000) => {
    const { ctx, page } = await open({ seed: seedOf() });
    await page.goto(`${MOBILE}${path}`, { timeout: 120_000 });
    await settle(page, wait);
    return { ctx, page, name };
  };
  {
    const { ctx, page } = await go("/tadabbur/journal/18", "m-surah");
    await shot(page, "m-surah");
    await ctx.close();
  }
  {
    const { ctx, page } = await go("/sessions", "m-sessions");
    await shot(page, "m-sessions");
    await ctx.close();
  }
  {
    const { ctx, page } = await go("/search", "m-search");
    const input = page.locator("input").first();
    await input.fill("mercy");
    await page.waitForTimeout(2500);
    await page.keyboard.press("Enter").catch(() => {});
    await page.waitForTimeout(2500);
    await shot(page, "m-search");
    await ctx.close();
  }
}

writeFileSync(join(OUT, "layout.json"), `${JSON.stringify(LAYOUT, null, 2)}\n`);
console.log("saved layout.json");
await browser.close();
