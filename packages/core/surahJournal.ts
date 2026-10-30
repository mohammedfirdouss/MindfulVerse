import { parseTadabburBody } from "./tadabburBody";
import type { TadabburParts } from "./tadabburBody";
import type { JournalEntry } from "./types";

export interface SurahJournalItem {
  entry: JournalEntry;
  parts: TadabburParts | null;
  followUps: JournalEntry[];
}

export interface SurahJournalVerse {
  verseKey: string;
  ayah: number;
  items: SurahJournalItem[];
}

export interface SurahJournal {
  intention: JournalEntry | null;
  verses: SurahJournalVerse[];
  also: JournalEntry[];
  isEmpty: boolean;
}

const newestFirst = (a: JournalEntry, b: JournalEntry) =>
  b.createdAt - a.createdAt;

/** The ayah number when `ref` is a verse key ("94:5") in `surah`, else null. */
function ayahIn(ref: string | undefined, surah: number): number | null {
  const [s, a, ...rest] = (ref ?? "").split(":");
  if (rest.length > 0 || s !== String(surah)) {
    return null;
  }
  const ayah = Number(a);
  return Number.isInteger(ayah) && ayah > 0 ? ayah : null;
}

export function surahJournal(
  entries: JournalEntry[],
  surah: number
): SurahJournal {
  const sorted = [...entries].sort(newestFirst);

  const intention =
    sorted.find(
      (e) => e.context?.kind === "intention" && e.context.ref === String(surah)
    ) ?? null;

  // Every follow-up per entry id, oldest first (sorted is newest first).
  const followUps = new Map<string, JournalEntry[]>();
  for (const e of sorted) {
    const ref = e.context?.ref;
    if (e.context?.kind === "followup" && ref) {
      const list = followUps.get(ref) ?? [];
      list.unshift(e);
      followUps.set(ref, list);
    }
  }

  const byVerse = new Map<string, SurahJournalVerse>();
  const also: JournalEntry[] = [];
  for (const e of sorted) {
    const ref = e.context?.ref;
    const ayah = ayahIn(ref, surah);
    if (!ref || ayah === null) {
      continue;
    }
    if (e.context?.kind === "tadabbur") {
      let verse = byVerse.get(ref);
      if (!verse) {
        verse = { ayah, items: [], verseKey: ref };
        byVerse.set(ref, verse);
      }
      verse.items.push({
        entry: e,
        followUps: followUps.get(e.id) ?? [],
        parts: parseTadabburBody(e.body),
      });
    } else if (e.context?.kind === "checkin") {
      also.push(e);
    }
  }
  also.reverse();

  const verses = [...byVerse.values()].sort((a, b) => a.ayah - b.ayah);
  return {
    also,
    intention,
    isEmpty: !intention && verses.length === 0 && also.length === 0,
    verses,
  };
}
