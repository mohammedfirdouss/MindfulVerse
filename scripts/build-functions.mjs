// build-functions.mjs — bundles the public API edge functions into single files.
// Run from repo root: `npm run build:functions`.

import { build } from "esbuild";

await build({
  bundle: true,
  entryPoints: ["functions/daily-verse.ts", "functions/api-keys.ts"],
  external: ["npm:*"],
  format: "esm",
  outdir: "functions/dist",
  platform: "neutral",
  target: "es2022",
});
