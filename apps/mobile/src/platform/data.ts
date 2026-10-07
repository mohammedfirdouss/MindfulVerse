// Native reader for core's data loaders (configureData). Paths are
// data-root-relative, exactly as on web: "surahs.json", "quran/2.json".
//
// The files are NOT in the JS bundle. scripts/sync-data.mjs copies
// apps/web/public/data into assets/data with a .mvdata extension, which Metro
// treats as an asset, and writes a manifest of require()d asset ids. At
// runtime expo-asset resolves an id to a readable local file (a release APK
// copies it out of res/raw into the cache dir once; a dev build downloads it
// from Metro) and expo-file-system reads it. Core caches each parsed result.
import { Asset } from "expo-asset";
import { File } from "expo-file-system";
import type { ReadJson } from "@mindfulverse/core/data";

let manifest: Record<string, number> | undefined;

function assetIdFor(path: string): number {
  // Generated, gitignored: run `npm run sync-data -w @mindfulverse/mobile`.
  manifest ??= require("../../assets/data/manifest.js") as Record<string, number>;
  const id = manifest[path];
  if (id === undefined) throw new Error(`Failed to load /data/${path}: not bundled`);
  return id;
}

export const readBundledJson: ReadJson = async (path) => {
  const asset = Asset.fromModule(assetIdFor(path));
  if (!asset.localUri) await asset.downloadAsync();
  if (!asset.localUri) throw new Error(`Failed to load /data/${path}: no local file`);
  const text = await new File(asset.localUri).text();
  return JSON.parse(text);
};
