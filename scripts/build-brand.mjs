// Renders every logo asset from the one mark in packages/core/brand.ts.
// Run after changing the mark: `npm run build:brand` (needs Playwright's
// Chromium, already installed for the web e2e tests).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

import { markSvg } from "../packages/core/brand.ts";

const root = resolve(import.meta.dirname, "..");
const { chromium } = createRequire(resolve(root, "apps/web/package.json"))(
  "playwright"
);

// The app's palette (apps/web/src/index.css :root). Keep in step.
const C = {
  cotton: "#f4f5f8",
  indigo: "#2a3a8c",
  indigoDeep: "#1b2559",
  ink: "#161a2e",
  inkSoft: "#474d66",
  nightInk: "#b5c2ef",
};

const out = (p) => {
  const f = resolve(root, p);
  mkdirSync(dirname(f), { recursive: true });
  return f;
};

// Web loading splash (index.html): the word in currentColor between the markers.
const html = resolve(root, "apps/web/index.html");
writeFileSync(
  html,
  readFileSync(html, "utf-8").replace(
    /<!-- brand:splash -->(?:[\s\S]*?<!-- \/brand:splash -->)?/u,
    `<!-- brand:splash -->${markSvg({ ink: "currentColor", pad: 0.04 })}<!-- /brand:splash -->`
  )
);

// Browser tab: the tile (concept B), padded tighter so it holds at 16 px.
writeFileSync(
  out("apps/web/public/favicon.svg"),
  `${markSvg({ ground: C.indigo, ink: C.cotton, pad: 0.12, radius: 0.18 })}\n`
);

const browser = await chromium.launch();
const page = await browser.newPage();

/** Screenshot an SVG at an exact pixel size; transparent unless it has a ground. */
async function png(svg, size, file) {
  await page.setViewportSize({ height: size, width: size });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`
  );
  await page.screenshot({ omitBackground: true, path: out(file) });
}

const tile = (pad) => markSvg({ ground: C.indigo, ink: C.cotton, pad });
const bare = (ink, pad) => markSvg({ ink, pad });

// Web install icons. Full-bleed tiles so maskable crops keep the word inside.
// The file names carry the mark's version: browsers only refresh an installed
// app's icon when the manifest points at a new URL, so bump it when the mark changes.
await png(tile(0.24), 192, "apps/web/public/mark-v2-192.png");
await png(tile(0.24), 512, "apps/web/public/mark-v2-512.png");
// Phone: iOS rounds the corners itself; Android's adaptive icon draws the
// cotton word on the indigo background from app.json, inside its 66% safe zone.
await png(tile(0.24), 1024, "apps/mobile/assets/images/icon.png");
await png(
  bare(C.cotton, 0.32),
  1024,
  "apps/mobile/assets/images/adaptive-icon.png"
);
// Splash: the word on the page ground (concept A), light and night.
await png(
  bare(C.indigoDeep, 0.04),
  512,
  "apps/mobile/assets/images/splash-icon.png"
);
await png(
  bare(C.nightInk, 0.04),
  512,
  "apps/mobile/assets/images/splash-icon-dark.png"
);

// Social preview (og:image): the mark, the name and one line, on cotton.
// Fonts are inlined: a page set from a string cannot read files from disk.
const font = (f) =>
  `url(data:font/woff2;base64,${readFileSync(resolve(root, "apps/web/public/fonts", f)).toString("base64")})`;
await page.setViewportSize({ height: 630, width: 1200 });
await page.setContent(`
<style>
  @font-face { font-family: Outfit; font-weight: 600; src: ${font("outfit-semibold.woff2")}; }
  @font-face { font-family: Literata; src: ${font("literata-regular.woff2")}; }
  html, body { margin: 0; width: 1200px; height: 630px; background: ${C.cotton}; }
  .band { height: 22px; background: ${C.indigo}; }
  main { display: flex; align-items: center; gap: 64px; padding: 0 96px; height: 608px; }
  .mark { width: 300px; height: 300px; flex: none; }
  .mark svg { width: 100%; height: 100%; }
  h1 { font: 600 88px/1 Outfit, sans-serif; letter-spacing: -0.03em; color: ${C.indigoDeep}; margin: 0 0 22px; }
  p { font: 400 30px/1.45 Literata, serif; color: ${C.inkSoft}; margin: 0; max-width: 20em; text-wrap: balance; }
</style>
<div class="band"></div>
<main>
  <div class="mark">${tile(0.2).replace("<svg ", '<svg style="border-radius:22%" ')}</div>
  <div><h1>MindfulVerse</h1><p>Sit with the Qur’an. A verse for today, guided reflection and a private journal.</p></div>
</main>`);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: out("apps/web/public/og.png") });

await browser.close();
console.log(
  "build-brand: favicon, web icons, app icon, adaptive icon, splash (light, night), og image"
);
