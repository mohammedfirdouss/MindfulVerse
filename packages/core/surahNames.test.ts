import { describe, expect, it } from "vitest";
import { arabicSurahName, revelationPlace } from "./surahNames";

describe("surahNames", () => {
  it("names every surah and none beyond", () => {
    for (let n = 1; n <= 114; n++) {
      expect(arabicSurahName(n)).toBeTruthy();
      expect(revelationPlace(n)).toMatch(/^(Meccan|Medinan)$/);
    }
    expect(arabicSurahName(0)).toBeUndefined();
    expect(arabicSurahName(115)).toBeUndefined();
  });

  it("matches known places of revelation", () => {
    expect(revelationPlace(1)).toBe("Meccan");
    expect(revelationPlace(2)).toBe("Medinan");
    expect(revelationPlace(114)).toBe("Meccan");
  });

  it("drops the سورة prefix", () => {
    for (let n = 1; n <= 114; n++) expect(arabicSurahName(n)).not.toMatch(/^سُورَةُ|^سورة/);
  });
});
