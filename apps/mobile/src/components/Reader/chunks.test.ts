import { describe, expect, it } from "vitest";
import type { Ayah } from "@mindfulverse/core/types";
import { chunkAyahs, rowIndexFor } from "./chunks";

const ayah = (n: number, len: number): Ayah => ({
  surah: 2,
  ayah: n,
  verseKey: `2:${n}`,
  arabic: "ب".repeat(len),
  translation: "",
});

describe("chunkAyahs", () => {
  it("keeps every ayah, in order, exactly once", () => {
    const ayahs = Array.from({ length: 50 }, (_, i) => ayah(i + 1, 40 + ((i * 37) % 300)));
    const chunks = chunkAyahs(ayahs, 600);
    expect(chunks.flatMap((c) => c.ayahs.map((a) => a.ayah))).toEqual(ayahs.map((a) => a.ayah));
    for (const c of chunks) {
      expect(c.first).toBe(c.ayahs[0].ayah);
      expect(c.last).toBe(c.ayahs[c.ayahs.length - 1].ayah);
    }
  });

  it("groups short ayahs and stays under the target when it can", () => {
    const chunks = chunkAyahs([ayah(1, 100), ayah(2, 100), ayah(3, 100), ayah(4, 100)], 250);
    expect(chunks.map((c) => [c.first, c.last])).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it("lets one long ayah stand alone", () => {
    const chunks = chunkAyahs([ayah(1, 50), ayah(2, 2000), ayah(3, 50)], 600);
    expect(chunks.map((c) => [c.first, c.last])).toEqual([
      [1, 1],
      [2, 2],
      [3, 3],
    ]);
  });

  it("is empty for no ayahs; keys are unique verse keys", () => {
    expect(chunkAyahs([])).toEqual([]);
    const keys = chunkAyahs(Array.from({ length: 30 }, (_, i) => ayah(i + 1, 90))).map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("rowIndexFor", () => {
  const rows = [
    { first: 1, last: 4 },
    { first: 5, last: 5 },
    { first: 6, last: 9 },
  ];
  it("finds the row covering an ayah", () => {
    expect(rowIndexFor(rows, 1)).toBe(0);
    expect(rowIndexFor(rows, 5)).toBe(1);
    expect(rowIndexFor(rows, 8)).toBe(2);
  });
  it("is -1 out of range", () => {
    expect(rowIndexFor(rows, 10)).toBe(-1);
  });
});
