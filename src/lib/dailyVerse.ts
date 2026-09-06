// The verse of the day — shared by Home and the daily check-in so the whole
// app agrees on one verse per day. Deterministic: stable across reloads and
// identical for every visitor on the same date; rotates at local midnight.
//
// The pick ranges over the ENTIRE Qur'an (all 6,236 ayahs), scrambled
// deterministically so consecutive days land in different surahs.
// NOTE: the emotion picker does NOT use this — its sets remain hand-vetted
// (see emotions.json), because pairing verses to feelings is prescriptive
// while "today's verse from the Book" is simply reading.

import { loadSurahs } from "./data";

const TOTAL_AYAHS = 6236;

/** Small, hand-vetted fallback if the surah index can't be loaded. */
const FALLBACK: string[] = ["13:28", "94:5", "2:286", "39:53", "2:186"];

/** Days since epoch, local time — flips at the user's own midnight. */
function localDayIndex(): number {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor(startOfDay.getTime() / 86_400_000);
}

/** Deterministic integer scramble (splitmix32-style) — same day, same verse,
 *  on every device, with consecutive days scattered across the mushaf. */
function scramble(n: number): number {
  let x = (n + 0x9e3779b9) >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x21f0aaad) >>> 0;
  x ^= x >>> 15;
  x = Math.imul(x, 0x735a2d97) >>> 0;
  x ^= x >>> 15;
  return x >>> 0;
}

/** Today's verse key ("surah:ayah") from anywhere in the 114 surahs. */
export async function todayVerseKey(): Promise<string> {
  const day = localDayIndex();
  try {
    const surahs = await loadSurahs();
    let global = scramble(day) % TOTAL_AYAHS;
    for (const s of surahs) {
      if (global < s.ayahCount) return `${s.number}:${global + 1}`;
      global -= s.ayahCount;
    }
    // Only reachable if the index is malformed.
    return FALLBACK[day % FALLBACK.length];
  } catch {
    return FALLBACK[day % FALLBACK.length];
  }
}
