import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Divisions, SurahMeta } from "./types";

function read<T>(file: string): T {
  return JSON.parse(
    readFileSync(new URL(`../../public/data/${file}`, import.meta.url), "utf8")
  ) as T;
}

const d = read<Divisions>("divisions.json");
const surahs = read<SurahMeta[]>("surahs.json");
const counts = new Map(surahs.map((s) => [s.number, s.ayahCount]));

/** The verse key right after `key`, or null after 114:6. */
function next(key: string): string | null {
  const [s, a] = key.split(":").map(Number);
  if (a < counts.get(s)!) return `${s}:${a + 1}`;
  return s < 114 ? `${s + 1}:1` : null;
}

describe("divisions.json", () => {
  it("has every division", () => {
    expect(d.juz).toHaveLength(30);
    expect(d.hizb).toHaveLength(60);
    expect(d.rub).toHaveLength(240);
    expect(d.sajda).toHaveLength(15);
  });

  it("juz ranges are contiguous and cover the whole Qur'an", () => {
    expect(d.juz[0].first).toBe("1:1");
    expect(d.juz[29].last).toBe("114:6");
    for (let i = 1; i < d.juz.length; i++) {
      expect(d.juz[i].first).toBe(next(d.juz[i - 1].last));
    }
    let total = 0;
    for (const j of d.juz) {
      for (let k: string | null = j.first; k; k = k === j.last ? null : next(k)) total++;
    }
    expect(total).toBe(6236);
  });

  it("hizb ranges are contiguous", () => {
    for (let i = 1; i < d.hizb.length; i++) {
      expect(d.hizb[i].first).toBe(next(d.hizb[i - 1].last));
    }
  });

  it("every juz carries its opening words", () => {
    for (const j of d.juz) expect(j.opening?.length).toBeGreaterThan(0);
  });
});
