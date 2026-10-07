// Pure Home logic, ported from apps/web/src/pages/Home.tsx. No React Native
// imports here so vitest can run it under the root `npm test`.

export function greeting(hour: number): string {
  if (hour < 5) return "Peace be upon you tonight";
  if (hour < 12) return "Peace be upon you this morning";
  if (hour < 18) return "Peace be upon you today";
  return "Peace be upon you this evening";
}

/** Web shows the returning line from day 2 of a streak. */
export function streakLine(streak: number): string | null {
  return streak >= 2 ? `Day ${streak} of returning to the Qur’an` : null;
}

export interface VersePos {
  surah: number;
  ayah: number;
}

/** Where tadabbur continues. Web falls back to /sessions (the surah picker),
 *  which is deferred on native, so a first tadabbur begins at Al-Fatihah. */
export function tadabburTarget(deeper: VersePos | null): VersePos {
  return deeper ?? { surah: 1, ayah: 1 };
}

/** The "Go deeper" button label once today's check-in is saved. */
export function deeperLabel(deeper: VersePos | null, surahNames: Map<number, string>): string {
  return deeper
    ? `Go deeper — continue ${surahNames.get(deeper.surah) ?? `Surah ${deeper.surah}`}`
    : "Go deeper — begin tadabbur";
}

/** The Read entry's description: continue where the reader stopped. */
export function readDesc(lastRead: VersePos | null): string {
  return lastRead
    ? `Continue where you stopped — Surah ${lastRead.surah}, verse ${lastRead.ayah}`
    : "The Qur’an, with translation and commentary.";
}
