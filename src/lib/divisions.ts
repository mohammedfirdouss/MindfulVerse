// Mushaf divisions (juz, hizb, quarters, sajdah) — pure helpers over the data
// in public/data/divisions.json. Verse keys are "surah:ayah".
import type { Division, Divisions } from "./types";

function split(key: string): [number, number] {
  const [s, a] = key.split(":").map(Number);
  return [s, a];
}

export function compareKeys(a: string, b: string): number {
  const [as, aa] = split(a);
  const [bs, ba] = split(b);
  return as - bs || aa - ba;
}

function divisionOf(list: Division[], key: string): number | null {
  const hit = list.find(
    (x) => compareKeys(key, x.first) >= 0 && compareKeys(key, x.last) <= 0
  );
  return hit ? hit.n : null;
}

export const juzOf = (key: string, d: Divisions) => divisionOf(d.juz, key);
export const hizbOf = (key: string, d: Divisions) => divisionOf(d.hizb, key);

export interface Span {
  surah: number;
  from: number;
  to: number;
}

/** The per-surah slices an inclusive key range covers, in reading order. */
export function spansInRange(
  first: string,
  last: string,
  ayahCounts: Map<number, number>
): Span[] {
  const [fs, fa] = split(first);
  const [ls, la] = split(last);
  const spans: Span[] = [];
  for (let s = fs; s <= ls; s++) {
    const count = ayahCounts.get(s);
    if (!count) continue;
    spans.push({ surah: s, from: s === fs ? fa : 1, to: s === ls ? la : count });
  }
  return spans;
}

export interface Marks {
  rub: Set<string>;
  sajda: Map<string, string>;
}

/** Inline mushaf marks. 1:1 opens the mushaf, so it carries no quarter sign. */
export function makeMarks(d: Divisions): Marks {
  return {
    rub: new Set(d.rub.filter((k) => k !== "1:1")),
    sajda: new Map(d.sajda.map((s) => [s.key, s.type])),
  };
}

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function toArabicDigits(n: number): string {
  return String(n).replace(/\d/g, (c) => ARABIC_DIGITS[Number(c)]);
}

/** DOM id for a verse where two surahs can share a page (juz, reading text). */
export function verseId(surah: number, ayah: number): string {
  return `v${surah}-${ayah}`;
}

/** Reads both "v{ayah}" (surah page translation blocks) and "v{surah}-{ayah}". */
export function parseVerseId(id: string): { surah: number | null; ayah: number } | null {
  const m = /^v(?:(\d+)-)?(\d+)$/.exec(id);
  if (!m) return null;
  return { surah: m[1] ? Number(m[1]) : null, ayah: Number(m[2]) };
}
