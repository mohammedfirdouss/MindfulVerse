import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
// Captures the tadabbur-journal update screens for the UpdateJournal promo.
// Needs the web dev server: (cd apps/web && npx vite --port 5180 --strictPort &)
// Usage: node scripts/capture-update.mjs [baseUrl]
// Every entry here is invented test data; no real journal is used.
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(
  "/Users/amf/Desktop/Git-projects/MindfulVerse/apps/web/"
);
const { chromium } = require("playwright");

const BASE = process.argv[2] ?? "http://localhost:5180";
const OUT = join(import.meta.dirname, "../public/screens/update");
mkdirSync(OUT, { recursive: true });

const DAY = 86_400_000;
const NOW = Date.now();
const ACTION = "call my mother";
const INTENTION_94 = "To remember that ease comes with hardship";
const INTENTION_103 = "To slow down and trust";

const body = (parts) =>
  [
    ["Lessons", parts.lessons],
    ["Reflection", parts.reflection],
    ["Action", parts.action],
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n\n");

const tadabbur = (id, ref, ageDays, parts) => ({
  body: body(parts),
  context: { kind: "tadabbur", ref },
  createdAt: NOW - ageDays * DAY,
  id,
  prompt: `Tadabbur on ${ref}`,
});

const intention = (surah, name, text, ageDays) => ({
  body: text,
  context: { kind: "intention", ref: String(surah) },
  createdAt: NOW - ageDays * DAY,
  id: `i${surah}`,
  prompt: `Why I'm reading ${name}`,
});

const browser = await chromium.launch();

/** A fresh phone-sized context with localStorage seeded before any script runs. */
async function phone(seed) {
  const ctx = await browser.newContext({
    deviceScaleFactor: 3,
    hasTouch: true,
    isMobile: true,
    reducedMotion: "no-preference",
    viewport: { height: 844, width: 390 },
  });
  await ctx.addInitScript((pairs) => {
    if (sessionStorage.getItem("__seeded")) {
      return;
    }
    sessionStorage.setItem("__seeded", "1");
    for (const [k, v] of Object.entries(pairs)) {
      localStorage.setItem(k, v);
    }
  }, seed);
  return { ctx, page: await ctx.newPage() };
}

const base = (entries) => ({
  "mindfulverse.installDismissed.v1": "1",
  "mindfulverse.journal.v1": JSON.stringify(entries),
  "mindfulverse.theme.v1": "light",
});

async function settle(page, ms = 1200) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
}

async function shot(page, name, fullPage = false) {
  await page.screenshot({ fullPage, path: join(OUT, `${name}.png`) });
  console.log("saved", name);
}

/** Where things sit (CSS px, page coordinates incl. scroll), for overlays. */
const LAYOUT = { viewport: { h: 844, w: 390 } };
async function measure(name, locator) {
  LAYOUT[name] = await locator.first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { h: r.height, w: r.width, x: r.left, y: r.top + window.scrollY };
  });
}

// ---- The surah page and the Journal, with a week of history ----
{
  const entries = [
    intention(94, "Ash-Sharh", INTENTION_94, 9),
    tadabbur("t1", "94:5", 8, {
      action: ACTION,
      lessons: "Ease is promised alongside the hardship, not only after it.",
      reflection: "The hard week with work felt lighter reading this.",
    }),
    tadabbur("t2", "94:6", 8, {
      action: "Write down one ease each night",
      lessons: "It is repeated, so I don't miss it.",
    }),
    {
      body: "Partly\n\nWe spoke on Sunday, longer than usual.",
      context: { kind: "followup", ref: "t1" },
      createdAt: NOW - DAY,
      id: "f1",
      prompt: "How did it go? (94:5)",
    },
  ];
  const { ctx, page } = await phone(base(entries));

  await page.goto(`${BASE}/journal`);
  await settle(page);
  await measure(
    "journalGroup",
    page.getByRole("heading", { name: "Ash-Sharh" })
  );
  await measure(
    "journalPageLink",
    page.getByRole("link", { name: "Your page on this surah" })
  );
  await shot(page, "journal");

  await page.goto(`${BASE}/tadabbur/94/journal`);
  await settle(page);
  await measure("pageIntention", page.locator("blockquote"));
  await measure("pageFollowUp", page.getByText("A week on:"));
  await measure("pagePdf", page.getByRole("button", { name: "Save as PDF" }));
  const bar = await page
    .locator(".tabbar")
    .evaluate((el) => el.getBoundingClientRect().height);
  LAYOUT.tabbarH = bar;
  await page.screenshot({
    clip: { height: bar, width: 390, x: 0, y: 844 - bar },
    path: join(OUT, "tabbar.png"),
  });
  // The fixed tab bar would land mid-image in a full-page shot; the video pins
  // tabbar.png to the bottom of the phone instead.
  await page.addStyleTag({ content: ".tabbar{display:none!important}" });
  await shot(page, "surah-page", true);
  await page.addStyleTag({ content: ".tabbar{display:flex!important}" });

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Save as PDF" }).click(),
  ]);
  const pdf = join(OUT, "surah-page.pdf");
  await download.saveAs(pdf);
  execFileSync("sips", [
    "-s",
    "format",
    "png",
    "-Z",
    "1600",
    pdf,
    "--out",
    join(OUT, "surah-pdf.png"),
  ]);
  console.log("saved surah-pdf");
  await ctx.close();
}

// ---- Home with a follow-up due ----
{
  const entries = [
    tadabbur("t1", "94:5", 8, {
      action: ACTION,
      lessons: "Ease is promised alongside the hardship, not only after it.",
    }),
  ];
  const { ctx, page } = await phone(base(entries));
  await page.goto(`${BASE}/`);
  await settle(page, 1800);
  const card = page.locator(".followup").first();
  await card.evaluate((el) =>
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 120)
  );
  await page.waitForTimeout(400);
  await measure("homeCard", card);
  await measure(
    "homePartly",
    page.getByRole("button", { name: "Partly", exact: true })
  );
  LAYOUT.homeScroll = await page.evaluate(() => window.scrollY);
  await shot(page, "home-followup");

  await page.getByRole("button", { name: "Partly", exact: true }).click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Save" }).click();
  await page.waitForTimeout(500);
  // Same scroll as the question, so only the card changes in the cross-fade.
  await page.evaluate((y) => window.scrollTo(0, y), LAYOUT.homeScroll);
  await page.waitForTimeout(300);
  await measure("homeKeptCard", page.locator(".followup"));
  LAYOUT.homeKeptScroll = await page.evaluate(() => window.scrollY);
  await shot(page, "home-kept");
  await ctx.close();
}

// ---- A surah's opening screen, before and after an intention ----
{
  const { ctx, page } = await phone(base([]));
  await page.goto(`${BASE}/tadabbur/103`);
  await settle(page, 1600);
  const field = page.getByLabel("Why are you reading this surah now?");
  await field.evaluate((el) =>
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 360)
  );
  await page.waitForTimeout(400);
  await measure("introField", field);
  LAYOUT.introScroll = await page.evaluate(() => window.scrollY);
  await shot(page, "intro-empty");
  await field.fill(INTENTION_103);
  await page.waitForTimeout(200);
  await shot(page, "intro-typed");
  await ctx.close();
}

writeFileSync(join(OUT, "layout.json"), `${JSON.stringify(LAYOUT, null, 2)}\n`);
console.log("saved layout.json");
await browser.close();
