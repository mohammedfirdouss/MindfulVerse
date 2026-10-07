// Web build of the data reader, used only by the browser design preview
// (expo start --web). Metro serves each .mvdata asset at a URL, so fetch it.
import { Asset } from "expo-asset";
import type { ReadJson } from "@mindfulverse/core/data";

let manifest: Record<string, number> | undefined;

export const readBundledJson: ReadJson = async (path) => {
  manifest ??= require("../../assets/data/manifest.js") as Record<string, number>;
  const id = manifest[path];
  if (id === undefined) throw new Error(`Failed to load /data/${path}: not bundled`);
  const res = await fetch(Asset.fromModule(id).uri);
  if (!res.ok) throw new Error(`Failed to load /data/${path}: ${res.status}`);
  return res.json();
};
