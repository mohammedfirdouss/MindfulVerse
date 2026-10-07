// Metro config for the monorepo. Expo's default config already watches the
// repo root and adds both node_modules folders to the lookup path; this file
// adds two resolver rules on top.
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// 1. One React. The web app pins React 18, which npm hoists to the root
//    node_modules; this app needs React 19 (apps/mobile/node_modules). Any
//    file outside apps/mobile (packages/core/sync/auth.tsx, or a hoisted
//    dependency such as react-freeze or use-latest-callback) would otherwise
//    walk up to the root copy, and two Reacts in one bundle break hooks.
//    These packages are always resolved as if imported from this app.
//    Expo SDK 57's "autolinking module resolution" (sticky react/react-native
//    resolution, on by default) already dedupes react and react-native; this
//    rule is the explicit guarantee, and also covers scheduler and the SDK.
//    `npm run check:bundle` verifies the result on an export.
const SINGLETONS = ["react", "react-native", "scheduler", "@insforge/sdk"];
const appOrigin = path.join(projectRoot, "package.json");

function isSingleton(name) {
  return SINGLETONS.some((p) => name === p || name.startsWith(p + "/"));
}

const upstream = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = upstream ?? context.resolveRequest;

  // 2. @insforge/sdk has `await import("crypto")` on a Node-only branch
  //    (process.versions.node). Metro resolves it statically, so stub it.
  if (moduleName === "crypto") return { type: "empty" };

  if (isSingleton(moduleName)) {
    return resolve({ ...context, originModulePath: appOrigin }, moduleName, platform);
  }
  return resolve(context, moduleName, platform);
};

// Bundled data files (see scripts/sync-data.mjs) use their own extension so
// Metro treats them as assets — copied into the APK, read lazily at runtime —
// rather than inlining them as JSON modules.
config.resolver.assetExts.push("mvdata");

// Every bundling path loads this file (expo start, expo export, and the
// Gradle release task's `expo export:embed`), so syncing here guarantees the
// data is present and current in every build without a separate step.
syncDataIfStale();

function syncDataIfStale() {
  const fs = require("fs");
  const src = path.resolve(projectRoot, "../web/public/data");
  const manifest = path.join(projectRoot, "assets/data/manifest.js");
  if (!fs.existsSync(src)) return; // sync-data reports this itself when run
  let stale = !fs.existsSync(manifest);
  if (!stale) {
    const built = fs.statSync(manifest).mtimeMs;
    const walk = (dir) =>
      fs.readdirSync(dir, { withFileTypes: true }).some((e) => {
        const p = path.join(dir, e.name);
        return e.isDirectory() ? walk(p) : fs.statSync(p).mtimeMs > built;
      });
    stale = fs.statSync(src).mtimeMs > built || walk(src);
  }
  if (stale) {
    require("child_process").execFileSync(process.execPath, [path.join(projectRoot, "scripts/sync-data.mjs")], {
      stdio: "inherit",
    });
  }
}

module.exports = config;
