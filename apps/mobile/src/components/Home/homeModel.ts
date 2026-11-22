// Pure Home logic, ported from apps/web/src/pages/Home.tsx. No React Native
// imports here so vitest can run it under the root `npm test`.

export function greeting(hour: number): string {
  if (hour < 5) {
    return "Peace be upon you tonight";
  }
  if (hour < 12) {
    return "Peace be upon you this morning";
  }
  if (hour < 18) {
    return "Peace be upon you today";
  }
  return "Peace be upon you this evening";
}

// The returning line is shared with web: a count from day 2, or a welcome
// back after a break.
export { streakLine } from "@mindfulverse/core/streakLine";

export interface VersePos {
  surah: number;
  ayah: number;
}

/** The Read entry's description: continue where the reader stopped. */
export function readDesc(lastRead: VersePos | null): string {
  return lastRead
    ? `Pick up at Surah ${lastRead.surah}, verse ${lastRead.ayah}`
    : "The Qur’an, with translation and commentary.";
}
