// Pure helpers ported verbatim from apps/web/src/components/Commentary.tsx, so
// labels match web exactly. (Share text lives in src/share.ts.)
import type { Ayah } from "@mindfulverse/core/types";

/** Per-surah list of ayahs that carry a direct Ibn Kathir entry. */
export type TafsirIndex = Record<string, number[]>;

/** Every surah except Al-Fatihah (where it is ayah 1) and At-Tawbah opens
 *  with the basmalah in the mushaf. */
export const BASMALAH = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";

export function showsBasmalah(surah: number): boolean {
  return surah !== 1 && surah !== 9;
}

/** Ibn Kathir comments on passages: a run of ayahs stores its commentary under
 *  the first ayah of the group. Find the entry covering this ayah. */
export function coveringFor(index: TafsirIndex | null, a: Ayah): number | null {
  if (!index) return null;
  let best: number | null = null;
  for (const n of index[String(a.surah)] ?? []) {
    if (n <= a.ayah) best = n;
    else break;
  }
  return best;
}

export function commentaryLabel(index: TafsirIndex | null, a: Ayah): string {
  if (!index) return "Commentary isn’t available right now";
  const c = coveringFor(index, a);
  if (c === null) return "No commentary for this verse";
  return c === a.ayah ? "Read the commentary" : `Read the commentary (with verse ${c})`;
}

export function commentaryTitle(a: Ayah, source: number): string {
  return source === a.ayah
    ? `Ibn Kathir · ${a.surah}:${a.ayah}`
    : `Ibn Kathir · on the passage from ${a.surah}:${source}`;
}

export function splitParagraphs(text: string | null): string[] {
  return (text ?? "")
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);
}

/** A `?v=` param as an ayah number, or null when absent/invalid. */
export function parseVerseParam(v: string | string[] | undefined, ayahCount?: number): number | null {
  const raw = Array.isArray(v) ? v[0] : v;
  if (raw === undefined || raw === "") return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) return null;
  if (ayahCount !== undefined && n > ayahCount) return null;
  return n;
}
