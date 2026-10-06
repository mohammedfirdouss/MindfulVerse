// data.ts hands data-root-relative paths to the host's reader and caches results.
import { describe, it, expect } from "vitest";
import {
  TAFSIR_CACHE_SURAHS, configureData, loadSurahs, loadSurahAyahs, loadSurahTafsir, loadSurahInfo, loadThemes,
  loadTafsirIndex, loadSearchIndex, loadSessions, loadEmotions, loadDivisions,
} from "./data";

describe("configureData", () => {
  it("rejects until a reader is configured", async () => {
    await expect(loadSurahs()).rejects.toThrow(/configureData/);
  });

  it("reads each dataset by its relative path, once", async () => {
    const reads: string[] = [];
    configureData(async (path) => { reads.push(path); return [{ path }]; });
    await Promise.all([
      loadSurahs(), loadSurahAyahs(2), loadSurahTafsir(2), loadSurahInfo(2), loadThemes(),
      loadTafsirIndex(), loadSearchIndex(), loadSessions(), loadEmotions(), loadDivisions(),
    ]);
    expect(reads.sort()).toEqual([
      "divisions.json", "emotions.json", "info/2.json", "quran/2.json", "search.json",
      "sessions.json", "surahs.json", "tafsir-index.json", "tafsir/2.json", "themes.json",
    ]);
    await loadSurahAyahs(2);
    expect(reads.filter((p) => p === "quran/2.json")).toHaveLength(1);
  });

  it("propagates the reader's failure and does not cache it", async () => {
    let fail = true;
    configureData(async (path) => {
      if (fail) throw new Error(`Failed to load /data/${path}: 404`);
      return { ok: path };
    });
    await expect(loadSurahInfo(9)).rejects.toThrow("Failed to load /data/info/9.json: 404");
    fail = false;
    await expect(loadSurahInfo(9)).resolves.toEqual({ ok: "info/9.json" });
  });

  it("shares one read between concurrent loads", async () => {
    const reads: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    configureData(async (path) => { reads.push(path); await gate; return { path }; });
    const a = loadSurahAyahs(3);
    const b = loadSurahAyahs(3);
    release();
    const [x, y] = await Promise.all([a, b]);
    expect(x).toBe(y);
    expect(reads).toEqual(["quran/3.json"]);
  });

  it("lets every concurrent caller see a failure, then retries", async () => {
    let calls = 0;
    configureData(async () => {
      calls++;
      if (calls === 1) throw new Error("offline");
      return { ok: true };
    });
    const results = await Promise.allSettled([loadSurahInfo(10), loadSurahInfo(10)]);
    expect(results.map((r) => r.status)).toEqual(["rejected", "rejected"]);
    expect(calls).toBe(1);
    await expect(loadSurahInfo(10)).resolves.toEqual({ ok: true });
    expect(calls).toBe(2);
  });

  it("turns a reader that throws synchronously into a rejection", async () => {
    configureData(() => { throw new Error("boom"); });
    await expect(loadSurahInfo(11)).rejects.toThrow("boom");
  });

  it("keeps only the most recently used tafsir surahs", async () => {
    expect(TAFSIR_CACHE_SURAHS).toBe(3);
    const reads: string[] = [];
    configureData(async (path) => { reads.push(path); return { path }; });
    await loadSurahTafsir(101);
    await loadSurahTafsir(102);
    await loadSurahTafsir(103);
    await loadSurahTafsir(101); // touch: 102 is now the oldest
    await loadSurahTafsir(104); // evicts 102
    await loadSurahTafsir(101);
    await loadSurahTafsir(103);
    await loadSurahTafsir(104);
    expect(reads).toEqual(["tafsir/101.json", "tafsir/102.json", "tafsir/103.json", "tafsir/104.json"]);
    await loadSurahTafsir(102);
    expect(reads.at(-1)).toBe("tafsir/102.json");
    expect(reads).toHaveLength(5);
    // Other files are never evicted.
    await loadSurahAyahs(3);
    expect(reads).toHaveLength(5);
  });
});
