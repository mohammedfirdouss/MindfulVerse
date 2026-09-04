// Typed runtime loaders for the bundled Quran data (served from /public/data).
// The service worker caches these for offline use after first load.

import type {
  Ayah,
  SurahMeta,
  SurahTafsir,
  Theme,
  TadabburSession,
  EmotionMap,
} from "./types";

const cache = new Map<string, unknown>();

async function getJson<T>(path: string): Promise<T> {
  if (cache.has(path)) return cache.get(path) as T;
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  const data = (await res.json()) as T;
  cache.set(path, data);
  return data;
}

export const loadSurahs = () => getJson<SurahMeta[]>("/data/surahs.json");

export const loadSurahAyahs = (surah: number) =>
  getJson<Ayah[]>(`/data/quran/${surah}.json`);

export const loadSurahTafsir = (surah: number) =>
  getJson<SurahTafsir>(`/data/tafsir/${surah}.json`);

export const loadThemes = () => getJson<Theme[]>("/data/themes.json");

export const loadSessions = () =>
  getJson<TadabburSession[]>("/data/sessions.json");

export const loadEmotions = () => getJson<EmotionMap>("/data/emotions.json");

/** Convenience: fetch a specific ayah (surah + translation + arabic). */
export async function loadAyah(surah: number, ayah: number): Promise<Ayah | undefined> {
  const ayahs = await loadSurahAyahs(surah);
  return ayahs.find((a) => a.ayah === ayah);
}

/** Parse "2:255" -> { surah: 2, ayah: 255 }. */
export function parseVerseKey(vk: string): { surah: number; ayah: number } {
  const [s, a] = vk.split(":").map(Number);
  return { surah: s, ayah: a };
}

/** Load a list of ayahs by verse keys, grouped-fetch per surah for efficiency. */
export async function loadAyahsByKeys(verseKeys: string[]): Promise<Ayah[]> {
  const bySurah = new Map<number, Set<number>>();
  for (const vk of verseKeys) {
    const { surah, ayah } = parseVerseKey(vk);
    if (!bySurah.has(surah)) bySurah.set(surah, new Set());
    bySurah.get(surah)!.add(ayah);
  }
  const out: Ayah[] = [];
  for (const [surah, ayahs] of bySurah) {
    const all = await loadSurahAyahs(surah);
    for (const a of all) if (ayahs.has(a.ayah)) out.push(a);
  }
  // preserve requested order
  const order = new Map(verseKeys.map((vk, i) => [vk, i]));
  return out.sort((x, y) => (order.get(x.verseKey)! - order.get(y.verseKey)!));
}
