import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { briefFor, briefSharedLabel } from "./brief";
import type { SurahBrief, SurahMeta } from "./types";

const DATA = join(import.meta.dirname, "../../apps/web/public/data");
const read = <T>(path: string) =>
  JSON.parse(readFileSync(join(DATA, path), "utf-8")) as T;

describe(briefFor, () => {
  const brief: SurahBrief = { "1": "One.\n\nTwo.", "2": 1, "3": 9 };

  it("returns a verse's own explanation as paragraphs", () => {
    expect(briefFor(brief, 1)).toStrictEqual({
      from: 1,
      paragraphs: ["One.", "Two."],
    });
  });

  it("follows a verse to the one it is explained with", () => {
    const shared = briefFor(brief, 2);
    expect(shared).toStrictEqual({ from: 1, paragraphs: ["One.", "Two."] });
    expect(briefSharedLabel(shared ?? { from: 0, paragraphs: [] }, 2)).toBe(
      "Explained together with verse 1"
    );
  });

  it("has no label for a verse's own explanation", () => {
    expect(briefSharedLabel({ from: 1, paragraphs: ["One."] }, 1)).toBeNull();
  });

  it("returns null when there is nothing to show", () => {
    expect(briefFor(brief, 3)).toBeNull();
    expect(briefFor(brief, 4)).toBeNull();
    expect(briefFor(undefined, 1)).toBeNull();
  });
});

describe("bundled short explanations", () => {
  it("cover every verse", () => {
    const missing: string[] = [];
    for (const s of read<SurahMeta[]>("surahs.json")) {
      const brief = read<SurahBrief>(`brief/${s.number}.json`);
      for (let a = 1; a <= s.ayahCount; a += 1) {
        if (!briefFor(brief, a)) {
          missing.push(`${s.number}:${a}`);
        }
      }
    }
    expect(missing).toStrictEqual([]);
  });
});
