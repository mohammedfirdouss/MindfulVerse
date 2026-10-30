import { mkdirSync, writeFileSync } from "node:fs";
// Captures real MindfulVerse screens for the DayInTheLife promo.
// Needs the web dev server: (cd apps/web && npx vite --port 5180 --strictPort &)
// Usage: node scripts/capture-screens.mjs [baseUrl]
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(
  "/Users/amf/Desktop/Git-projects/MindfulVerse/apps/web/"
);
const { chromium } = require("playwright");

const BASE = process.argv[2] ?? "http://localhost:5180";
const OUT = join(import.meta.dirname, "../public/screens");
mkdirSync(OUT, { recursive: true });

const REFLECTION = "So much to be thankful for this morning. Alhamdulillah.";
const NIGHT_NOTE = "Every morning is a new mercy.";
let morningRef = "93:11";

/** Today at a given clock time, so the journal reads as one day. */
function today(h, m) {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

const browser = await chromium.launch();

/** A fresh phone-sized context with localStorage seeded before any script runs. */
// oxlint-disable-next-line default-param-last -- call sites pass `at` only after an explicit seed
async function phone(seed = {}, at) {
  const ctx = await browser.newContext({
    deviceScaleFactor: 3,
    hasTouch: true,
    isMobile: true,
    reducedMotion: "no-preference",
    viewport: { height: 844, width: 390 },
  });
  await ctx.addInitScript((pairs) => {
    // Only on the first load of this context: later navigations keep what the app wrote.
    if (sessionStorage.getItem("__seeded")) {
      return;
    }
    sessionStorage.setItem("__seeded", "1");
    for (const [k, v] of Object.entries(pairs)) {
      localStorage.setItem(k, v);
    }
  }, seed);
  const page = await ctx.newPage();
  if (at) {
    await page.clock.setFixedTime(at);
  }
  return { ctx, page };
}

async function settle(page, ms = 900) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
}

async function shot(page, name) {
  await page.screenshot({ path: join(OUT, `${name}.png`) });
  console.log("saved", name);
}

/** Where things sit on screen (CSS px in the 390x844 viewport), for overlays. */
const LAYOUT = {};
async function measure(name, locator) {
  LAYOUT[name] = await locator.first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      background: cs.backgroundColor,
      // oxlint-disable-next-line unicorn/prefer-number-coercion -- computed styles carry a "px" suffix, which Number() rejects
      border: Number.parseFloat(cs.borderTopWidth),
      color: cs.color,
      font: cs.fontFamily,
      h: r.height,
      lineHeight: cs.lineHeight,
      padding: [
        cs.paddingTop,
        cs.paddingRight,
        cs.paddingBottom,
        cs.paddingLeft,
      ].map(parseFloat),
      radius: cs.borderTopLeftRadius,
      // oxlint-disable-next-line unicorn/prefer-number-coercion -- computed styles carry a "px" suffix, which Number() rejects
      size: Number.parseFloat(cs.fontSize),
      w: r.width,
      weight: cs.fontWeight,
      x: r.x,
      y: r.y,
    };
  });
}

/** Scroll so an element sits a little below the top of the viewport. */
async function scrollTo(page, locator, offset = 90) {
  await locator.first().evaluate((el, off) => {
    const y = el.getBoundingClientRect().top + window.scrollY - off;
    window.scrollTo({ behavior: "instant", top: y });
  }, offset);
  await page.waitForTimeout(400);
}

// Morning, light theme.
{
  const { ctx, page } = await phone(
    { "mindfulverse.theme.v1": "light" },
    today(7, 12)
  );
  await page.goto(`${BASE}/`);
  await settle(page, 1500);
  await shot(page, "home");

  await page.goto(`${BASE}/checkin`);
  await page.getByRole("button", { name: "Grateful" }).waitFor();
  await settle(page);
  await shot(page, "checkin-feel");
  await measure("grateful", page.getByRole("button", { name: "Grateful" }));

  await page.getByRole("button", { name: "Grateful" }).click();
  await page.getByText("Verses on gratitude").waitFor();
  await settle(page, 1200);
  await scrollTo(page, page.getByText("Verses on gratitude"), 110);
  await shot(page, "checkin-verse");
  await measure("gratefulCard", page.locator(".ci-framed .card"));

  const box = page.locator("#checkin-journal");
  await scrollTo(
    page,
    page.getByText("What stays with you from this verse?"),
    260
  );
  await box.click();
  await page.waitForTimeout(300);
  await shot(page, "checkin-write");
  await measure("checkinBox", box);
  await measure(
    "checkinSave",
    page.getByRole("button", { name: "Keep in journal" })
  );
  await box.pressSequentially(REFLECTION, { delay: 10 });
  await page.waitForTimeout(300);
  await shot(page, "checkin-typed");
  await page.getByRole("button", { name: "Keep in journal" }).click();
  await page.getByText("Kept in your journal ✓").waitFor();
  morningRef = await page.evaluate(() => {
    const all = JSON.parse(
      localStorage.getItem("mindfulverse.journal.v1") ?? "[]"
    );
    return all.at(-1)?.context?.ref ?? "93:11";
  });
  await page.locator("textarea").blur();
  await page.waitForTimeout(500);
  await shot(page, "checkin-kept");
  await ctx.close();
}

// Midday reading, light theme.
{
  const { ctx, page } = await phone(
    { "mindfulverse.theme.v1": "light" },
    today(13, 5)
  );
  await page.goto(`${BASE}/read/93`);
  await settle(page, 1500);
  await shot(page, "read-title");
  await page.getByRole("button", { name: "Reading settings" }).click();
  await page.getByRole("button", { exact: true, name: "Reading" }).click();
  await page.waitForTimeout(400);
  await page.keyboard.press("Escape");
  await page.mouse.move(2, 2);
  await page.evaluate(() => document.activeElement?.blur?.());
  await settle(page, 900);
  await shot(page, "read-arabic");
  await ctx.close();
}

// Night, dark theme: one question, then the journal.
{
  const entry = {
    id: "promo-morning",
    createdAt: today(7, 14),
    prompt: "What stays with you from this verse?",
    body: REFLECTION,
    // The morning check-in above keeps its reflection on the verse of the day.
    context: { kind: "checkin", ref: morningRef },
  };
  const seed = {
    "mindfulverse.journal.v1": JSON.stringify([entry]),
    "mindfulverse.theme.v1": "dark",
  };
  const { ctx, page } = await phone(seed, today(21, 40));
  await page.goto(`${BASE}/tadabbur/93`);
  await settle(page, 1200);
  await shot(page, "tadabbur-intro");
  await page.getByRole("button", { name: "Begin pondering" }).first().click();
  await settle(page, 1200);
  await shot(page, "tadabbur-question");
  const answer = page.locator("textarea").first();
  await answer.click();
  await page.waitForTimeout(300);
  await shot(page, "tadabbur-write");
  await measure("tadabburBox", answer);
  await measure(
    "tadabburSave",
    page.getByRole("button", { name: "Keep in journal" })
  );
  await answer.pressSequentially(NIGHT_NOTE, { delay: 10 });
  await page.waitForTimeout(300);
  await shot(page, "tadabbur-typed");
  await page.getByRole("button", { name: "Keep in journal" }).click();
  await page.waitForTimeout(600);
  await page.evaluate(() => document.activeElement?.blur?.());
  await shot(page, "tadabbur-kept");

  await page.goto(`${BASE}/journal`);
  await settle(page, 1200);
  await shot(page, "journal");
  await ctx.close();
}

await browser.close();
writeFileSync(
  join(OUT, "layout.json"),
  `${JSON.stringify({ viewport: { h: 844, w: 390 }, ...LAYOUT }, null, 2)}\n`
);
console.log("saved layout.json");
