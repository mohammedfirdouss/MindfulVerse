import type { SurahJournal } from "@mindfulverse/core/surahJournal";

import type { ExportItem, ExportSection } from "./journalExport";

/** The surah page as export sections, in page order: intention, verse by
 *  verse (each entry followed by its follow-ups), then the rest. */
export function surahJournalSections(
  page: SurahJournal,
  surahName: string,
  verses: Map<string, { arabic: string; translation: string }>
): ExportSection[] {
  const sections: ExportSection[] = [];
  if (page.intention) {
    sections.push({
      items: [{ entry: page.intention }],
      title: "My intention",
    });
  }
  const verseItems: ExportItem[] = [];
  for (const verse of page.verses) {
    const text = verses.get(verse.verseKey);
    let first = true;
    for (const { entry, followUps } of verse.items) {
      // Verse text once per verse, like the page.
      verseItems.push({
        arabic: first ? text?.arabic : undefined,
        entry,
        translation: first ? text?.translation : undefined,
        verseLabel: verse.verseKey,
      });
      first = false;
      for (const followUp of followUps) {
        verseItems.push({ entry: followUp });
      }
    }
  }
  if (verseItems.length > 0) {
    sections.push({ items: verseItems, title: "Verse by verse" });
  }
  if (page.also.length > 0) {
    sections.push({
      items: page.also.map((entry) => ({
        entry,
        verseLabel: entry.context?.ref,
      })),
      title: `Also written on ${surahName}`,
    });
  }
  return sections;
}
