// A circle's weekly portion: which verses everyone reads this week, built from
// the surah's passages (the theme ranges in data/themes.json), so "next week"
// is always a natural place to stop.
import type { Theme } from "./types";

export interface Passage {
  from: number;
  to: number;
  /** The passage's theme, as written in the source. */
  theme: string;
}

export interface PortionLike {
  surah: number;
  verse: number | null;
  verseEnd: number | null;
}

/** The surah's passages in order, each range once. */
export function surahPassages(themes: Theme[], surah: number): Passage[] {
  const seen = new Set<string>();
  const out: Passage[] = [];
  for (const t of themes) {
    if (t.surah !== surah) {
      continue;
    }
    const key = `${t.ayahFrom}-${t.ayahTo}`;
    if (!seen.has(key) && t.ayahFrom <= t.ayahTo) {
      seen.add(key);
      out.push({ from: t.ayahFrom, theme: t.theme, to: t.ayahTo });
    }
  }
  return out.sort((a, b) => a.from - b.from);
}

/** "verses 7 to 12", "verse 7", or null for the whole surah. */
export function portionLabel(p: PortionLike): string | null {
  if (p.verse === null) {
    return null;
  }
  return p.verseEnd === null || p.verseEnd === p.verse
    ? `verse ${p.verse}`
    : `verses ${p.verse} to ${p.verseEnd}`;
}

/** The passage that matches the portion exactly, if any. */
export function currentPassage(
  passages: Passage[],
  p: PortionLike
): Passage | null {
  return (
    passages.find(
      (x) => x.from === p.verse && x.to === (p.verseEnd ?? p.verse)
    ) ?? null
  );
}

/** The passage after this week's: after the current one when it matches a
 *  passage, else the first that starts after the portion. Null at the end of
 *  the surah or when the circle reads the whole surah. */
export function nextPassage(
  passages: Passage[],
  p: PortionLike
): Passage | null {
  if (p.verse === null) {
    return null;
  }
  const last = p.verseEnd ?? p.verse;
  return passages.find((x) => x.from > last) ?? null;
}

/** The same three questions the surah page asks, for talking it through
 *  together. Written by people, never generated. */
export const DISCUSSION_QUESTIONS = [
  "What does it teach?",
  "What stays with you?",
  "What will you do?",
] as const;
