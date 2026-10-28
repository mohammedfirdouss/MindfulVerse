import { describe, expect, it } from "vitest";

import { DAILY_VERSES, verseKeyFor, verseOffset } from "./dailyVerse";

const n = DAILY_VERSES.length;

describe("daily verse", () => {
  it("gives different people different verses on the same day", () => {
    const ids = Array.from({ length: 50 }, (_, i) => `user-${i}-${i * 7919}`);
    const today = new Set(ids.map((id) => verseKeyFor(20_000, id)));
    // 50 people over 139 verses: a handful may share, most must differ.
    expect(today.size).toBeGreaterThan(35);
  });

  it("is stable for one person within a day", () => {
    expect(verseKeyFor(20_000, "abc")).toBe(verseKeyFor(20_000, "abc"));
  });

  it("walks one person through every verse before repeating", () => {
    const seen = new Set(
      Array.from({ length: n }, (_, d) => verseKeyFor(20_000 + d, "abc"))
    );
    expect(seen.size).toBe(n);
  });

  it("offsets are within the pool", () => {
    for (const s of [
      "",
      "a",
      "00000000-0000-0000-0000-000000000000",
      "ünïcode",
    ]) {
      const o = verseOffset(s);
      expect(o).toBeGreaterThanOrEqual(0);
      expect(o).toBeLessThan(n);
    }
  });
});
