#!/usr/bin/env node
// Checks an `expo export --platform android --dump-assetmap --source-maps`
// output in dist/ for the two monorepo invariants Metro config protects:
//   1. exactly one React (and react-native/scheduler) copy, from apps/mobile;
//   2. the bundled data ships as assets, not inlined JS.
// Run with: npm run check:bundle -w @mindfulverse/mobile
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const jsDir = path.join(root, "dist/_expo/static/js/android");
const files = readdirSync(jsDir);
const hbc = files.find((f) => f.endsWith(".hbc"));
const map = files.find((f) => f.endsWith(".hbc.map"));
if (!hbc || !map) throw new Error("dist/ lacks an Android .hbc + .map: run export with --source-maps");

const fail = [];

// 1. Package roots of every React-family module in the bundle.
const roots = new Map();
for (const src of JSON.parse(readFileSync(path.join(jsDir, map), "utf8")).sources) {
  const m = src.match(/^(.*node_modules\/(react|react-native|scheduler))\//);
  if (m) roots.set(m[1], m[2]);
}
for (const pkg of ["react", "react-native", "scheduler"]) {
  const copies = [...roots].filter(([, p]) => p === pkg).map(([r]) => r);
  const versions = copies.map((r) => {
    const abs = path.isAbsolute(r) && r.startsWith(root) ? r : path.join(root, "../..", r);
    return `${path.relative(root, abs) || "."}@${JSON.parse(readFileSync(path.join(abs, "package.json"), "utf8")).version}`;
  });
  console.log(`${pkg}: ${versions.join(", ") || "(none)"}`);
  if (copies.length !== 1) fail.push(`${pkg}: expected 1 copy in bundle, found ${copies.length}`);
}

// 2. Data files are assets; the bytecode stays small.
const assets = Object.values(JSON.parse(readFileSync(path.join(root, "dist/assetmap.json"), "utf8")));
const data = assets.filter((a) => a.type === "mvdata");
const manifest = readFileSync(path.join(root, "assets/data/manifest.js"), "utf8").match(/require\(/g) ?? [];
const mb = statSync(path.join(jsDir, hbc)).size / 1048576;
console.log(`assets: ${assets.length} (data: ${data.length}, manifest: ${manifest.length}); bundle ${mb.toFixed(2)} MB`);
if (data.length !== manifest.length) fail.push("not every data file is an asset");
if (mb > 6) fail.push(`bundle is ${mb.toFixed(1)} MB: is data being inlined?`);

if (fail.length) {
  console.error("FAIL\n- " + fail.join("\n- "));
  process.exit(1);
}
console.log("OK");
