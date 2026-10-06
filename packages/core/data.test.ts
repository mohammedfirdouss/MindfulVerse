// data.ts hands data-root-relative paths to the host's reader and caches results.
import { describe, it, expect } from "vitest";
import {
  configureData, loadSurahs, loadSurahAyahs, loadSurahTafsir, loadSurahInfo, loadThemes,
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
});
