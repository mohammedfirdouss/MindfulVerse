import { parseTadabburBody } from "./tadabburBody";
import type { TadabburParts } from "./tadabburBody";
import type { JournalEntry } from "./types";

export interface SurahJournalItem {
  entry: JournalEntry;
  parts: TadabburParts | null;
  followUp: JournalEntry | null;
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

  // Newest first, so the first follow-up seen for an id is the newest.
  const followUps = new Map<string, JournalEntry>();
  for (const e of sorted) {
    const ref = e.context?.ref;
    if (e.context?.kind === "followup" && ref && !followUps.has(ref)) {
      followUps.set(ref, e);
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
        followUp: followUps.get(e.id) ?? null,
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
