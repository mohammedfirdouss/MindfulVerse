import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { Ayah, SurahWords } from "./types";
import { pairWords } from "./wordByWord";

const DATA = join(import.meta.dirname, "../../apps/web/public/data");
const read = <T>(path: string) =>
  JSON.parse(readFileSync(join(DATA, path), "utf-8")) as T;

describe(pairWords, () => {
  it("pairs each Arabic word with its meaning", () => {
    expect(pairWords("وَٱلۡعَصۡرِ", ["By the time"])).toStrictEqual([
      { arabic: "وَٱلۡعَصۡرِ", meanings: ["By the time"] },
    ]);
  });

  it("lets one meaning cover two Arabic words", () => {
    expect(pairWords("a b c", ["one", [2, "two"]])).toStrictEqual([
      { arabic: "a", meanings: ["one"] },
      { arabic: "b c", meanings: ["two"] },
    ]);
  });

  it("keeps two meanings under one Arabic word, in order", () => {
    expect(pairWords("a b", [[1, "Why", "not"], "you"])).toStrictEqual([
      { arabic: "a", meanings: ["Why", "not"] },
      { arabic: "b", meanings: ["you"] },
    ]);
  });

  it("skips the quarter mark, which is not a word", () => {
    expect(pairWords("۞ a b", ["one", "two"])).toHaveLength(2);
  });

  it("returns null when the meanings do not line up", () => {
    expect(pairWords("a b c", ["one", "two"])).toBeNull();
    expect(pairWords("a", ["one", "two"])).toBeNull();
    expect(pairWords("a", undefined)).toBeNull();
    expect(pairWords("a", [])).toBeNull();
  });
});

describe("bundled word meanings", () => {
  it("line up with the Arabic of every verse", () => {
    const unpaired: string[] = [];
    let words = 0;
    for (let surah = 1; surah <= 114; surah += 1) {
      const ayahs = read<Ayah[]>(`quran/${surah}.json`);
      const cells = read<SurahWords>(`words/${surah}.json`);
      for (const a of ayahs) {
        const pairs = pairWords(a.arabic, cells[String(a.ayah)]);
        if (pairs) {
          words += pairs.length;
        } else {
          unpaired.push(a.verseKey);
        }
      }
    }
    expect(unpaired).toStrictEqual([]);
    expect(words).toBeGreaterThan(77_000);
  });
});
