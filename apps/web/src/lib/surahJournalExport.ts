import type { SurahJournal } from "@mindfulverse/core/surahJournal";

import type { ExportItem, ExportSection } from "./journalExport";

/** The surah page as export sections, in page order: intention, verse by
 *  verse (each entry followed by its follow-up), then the rest. */
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
    for (const { entry, followUp } of verse.items) {
      verseItems.push({
        arabic: text?.arabic,
        entry,
        translation: text?.translation,
        verseLabel: verse.verseKey,
      });
      if (followUp) {
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
