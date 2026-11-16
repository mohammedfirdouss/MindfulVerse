// Typed runtime loaders for the bundled Quran data. Paths are relative to the
// data root ("surahs.json", "quran/2.json"); how a path becomes bytes is the
// host's job — web fetches /data/<path> (cached offline by the service
// worker), native reads a bundled asset. The host installs its reader with
// configureData() at startup, before any loader runs. Results are cached per
// path for the session (tafsir: the last few surahs only).

import type {
  Ayah,
  SurahInfo,
  SurahMeta,
  SurahBrief,
  SurahTafsir,
  SurahWords,
  Theme,
  TadabburSession,
  EmotionMap,
  Divisions,
  VerseTopic,
} from "./types";

/** Resolves a data-root-relative path to its parsed JSON, or rejects. */
export type ReadJson = (path: string) => Promise<unknown>;

let readJson: ReadJson | null = null;

export function configureData(fn: ReadJson): void {
  readJson = fn;
}

// Promises, not values: concurrent loads of one path share a single read
// (a surah's ayahs and its tafsir are often requested together). A rejected
// read is dropped so the next call retries.
const cache = new Map<string, Promise<unknown>>();

// Tafsir files are the big ones (up to ~1 MB of text per surah) and are read
// one surah at a time, so keep only the most recently used few in memory.
// Insertion order of this Map is the LRU order (oldest first).
export const TAFSIR_CACHE_SURAHS = 3;
const tafsirLru = new Map<string, true>();
const isTafsir = (path: string) => path.startsWith("tafsir/");

function touchTafsir(path: string): void {
  tafsirLru.delete(path);
  tafsirLru.set(path, true);
  while (tafsirLru.size > TAFSIR_CACHE_SURAHS) {
    const oldest = tafsirLru.keys().next().value as string;
    tafsirLru.delete(oldest);
    cache.delete(oldest);
  }
}

function getJson<T>(path: string): Promise<T> {
  let p = cache.get(path);
  if (!p) {
    const read = readJson;
    if (!read) {
      return Promise.reject(
        new Error("configureData() must run before loading data")
      );
    }
    // Via then(): a reader that throws synchronously still yields a rejection.
    const pending: Promise<unknown> = Promise.resolve().then(() => read(path));
    p = pending;
    cache.set(path, pending);
    pending.catch(() => {
      if (cache.get(path) !== pending) {
        return;
      } // already evicted or replaced
      cache.delete(path);
      tafsirLru.delete(path);
    });
  }
  if (isTafsir(path)) {
    touchTafsir(path);
  }
  return p as Promise<T>;
}

export const loadSurahs = () => getJson<SurahMeta[]>("surahs.json");

export const loadSurahAyahs = (surah: number) =>
  getJson<Ayah[]>(`quran/${surah}.json`);

export const loadSurahTafsir = (surah: number) =>
  getJson<SurahTafsir>(`tafsir/${surah}.json`);

/** Ibn Kathir's introduction to a surah (a few KB each). */
export const loadSurahInfo = (surah: number) =>
  getJson<SurahInfo>(`info/${surah}.json`);

export const loadThemes = () => getJson<Theme[]>("themes.json");

/** Per-surah list of ayah numbers that carry a direct tafsir entry (~6KB).
 *  Lets the reader label commentary links without downloading the tafsir. */
export const loadTafsirIndex = () =>
  getJson<Record<string, number[]>>("tafsir-index.json");

/** [verseKey, translation] pairs (~1MB) — fetch only when the user searches. */
export const loadSearchIndex = () => getJson<[string, string][]>("search.json");

export const loadSessions = () => getJson<TadabburSession[]>("sessions.json");

export const loadEmotions = () => getJson<EmotionMap>("emotions.json");

/** Juz / hizb / quarter / sajdah boundaries (a few KB). */
export const loadDivisions = () => getJson<Divisions>("divisions.json");

/** Al-Mukhtasar's short explanations for one surah (up to ~110KB). */
export const loadSurahBrief = (surah: number) =>
  getJson<SurahBrief>(`brief/${surah}.json`);

/** Word meanings for one surah (up to ~80KB), read when a verse is opened. */
export const loadSurahWords = (surah: number) =>
  getJson<SurahWords>(`words/${surah}.json`);

/** Topics and the verses under each (~80KB), read when a verse is opened. */
export const loadVerseTopics = () => getJson<VerseTopic[]>("topics.json");

/** Parse "2:255" -> { surah: 2, ayah: 255 }. */
export function parseVerseKey(vk: string): { surah: number; ayah: number } {
  const [s, a] = vk.split(":").map(Number);
  return { ayah: a, surah: s };
}

/** Load a list of ayahs by verse keys, grouped-fetch per surah for efficiency. */
export async function loadAyahsByKeys(verseKeys: string[]): Promise<Ayah[]> {
  const bySurah = new Map<number, Set<number>>();
  for (const vk of verseKeys) {
    const { surah, ayah } = parseVerseKey(vk);
    let ayahSet = bySurah.get(surah);
    if (!ayahSet) {
      ayahSet = new Set();
      bySurah.set(surah, ayahSet);
    }
    ayahSet.add(ayah);
  }
  const groups = [...bySurah];
  const loaded = await Promise.all(
    groups.map(([surah]) => loadSurahAyahs(surah))
  );
  const out: Ayah[] = [];
  for (const [i, [, ayahs]] of groups.entries()) {
    for (const a of loaded[i]) {
      if (ayahs.has(a.ayah)) {
        out.push(a);
      }
    }
  }
  // preserve requested order
  const order = new Map(verseKeys.map((vk, i) => [vk, i]));
  return out.sort(
    (x, y) => (order.get(x.verseKey) ?? 0) - (order.get(y.verseKey) ?? 0)
  );
}
