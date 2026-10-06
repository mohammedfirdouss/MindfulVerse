// Web data reader for the shared core's loaders: data paths resolve under
// /data/ (public/data), and the service worker caches them for offline use.
import type { ReadJson } from "../lib/data";

export const fetchJson: ReadJson = async (path) => {
  const url = `/data/${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res.json();
};
