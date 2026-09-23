import { describe, expect, it } from "vitest";
import divisionsJson from "../../public/data/divisions.json";
import surahsJson from "../../public/data/surahs.json";
import {
  compareKeys,
  hizbOf,
  juzOf,
  parseVerseId,
  spansInRange,
  toArabicDigits,
  verseId,
} from "./divisions";
import type { Divisions, SurahMeta } from "./types";

const d = divisionsJson as Divisions;
const counts = new Map((surahsJson as SurahMeta[]).map((s) => [s.number, s.ayahCount]));

describe("compareKeys", () => {
  it("orders numerically, not lexically", () => {
    expect(compareKeys("2:141", "2:142")).toBeLessThan(0);
    expect(compareKeys("9:1", "10:1")).toBeLessThan(0);
    expect(compareKeys("2:9", "2:10")).toBeLessThan(0);
    expect(compareKeys("3:1", "3:1")).toBe(0);
  });
});

describe("juzOf / hizbOf", () => {
  it("finds the division at its boundaries", () => {
    expect(juzOf("1:7", d)).toBe(1);
    expect(juzOf("2:141", d)).toBe(1);
    expect(juzOf("2:142", d)).toBe(2);
    expect(juzOf("114:6", d)).toBe(30);
    expect(hizbOf("2:74", d)).toBe(1);
    expect(hizbOf("2:75", d)).toBe(2);
  });
  it("returns null for a key outside the Qur'an", () => {
    expect(juzOf("115:1", d)).toBeNull();
  });
});

describe("spansInRange", () => {
  it("splits juz 1 into Al-Fatihah and part of Al-Baqarah", () => {
    expect(spansInRange("1:1", "2:141", counts)).toEqual([
      { surah: 1, from: 1, to: 7 },
      { surah: 2, from: 1, to: 141 },
    ]);
  });
  it("covers the 37 surahs of juz 30", () => {
    const spans = spansInRange("78:1", "114:6", counts);
    expect(spans).toHaveLength(37);
    expect(spans[0]).toEqual({ surah: 78, from: 1, to: 40 });
    expect(spans[36]).toEqual({ surah: 114, from: 1, to: 6 });
  });
  it("handles a range inside one surah", () => {
    expect(spansInRange("2:142", "2:252", counts)).toEqual([{ surah: 2, from: 142, to: 252 }]);
  });
});

describe("verse ids", () => {
  it("round-trips surah-qualified ids", () => {
    expect(verseId(2, 255)).toBe("v2-255");
    expect(parseVerseId("v2-255")).toEqual({ surah: 2, ayah: 255 });
  });
  it("reads the surah page's plain ids", () => {
    expect(parseVerseId("v12")).toEqual({ surah: null, ayah: 12 });
  });
  it("rejects anything else", () => {
    expect(parseVerseId("verse")).toBeNull();
  });
});

describe("toArabicDigits", () => {
  it("converts to Arabic-Indic digits", () => {
    expect(toArabicDigits(286)).toBe("٢٨٦");
    expect(toArabicDigits(10)).toBe("١٠");
  });
});
