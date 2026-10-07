// Journal export as plain text — the pure half of apps/web/src/lib/journalExport.ts,
// COPIED here because that file also holds browser-only saving (File, Blob,
// navigator.share, document). Keep the two in step until the formatter moves
// to packages/core; the output must match web's byte for byte.
import type { JournalGroup } from "@mindfulverse/core/journalGroups";
import type { JournalEntry } from "@mindfulverse/core/types";

export interface ExportItem {
  entry: JournalEntry;
  /** "Al-Baqarah · 2:255" when the entry was written about a verse. */
  verseLabel?: string;
  /** The verse's English translation, verbatim. */
  translation?: string;
  /** The verse in Arabic, verbatim. */
  arabic?: string;
}

export interface ExportSection {
  title: string;
  items: ExportItem[];
}

export interface ExportInput {
  sections: ExportSection[];
  exportedAt: Date;
}

export const VERSE_KEY_RE = /^\d{1,3}:\d{1,3}$/;

/** A group's heading (web Journal.tsx groupTitle). */
export function groupTitle(
  g: JournalGroup,
  surahNames: Map<number, string>,
  sessionTitles: Map<string, string>,
): string {
  if (g.surah) return surahNames.get(g.surah) ?? `Surah ${g.surah}`;
  if (g.sessionId) return sessionTitles.get(g.sessionId) ?? g.sessionId;
  return "Other reflections";
}

/** The verse an entry was written about, when it carries one. */
export function entryVerseKey(entry: JournalEntry): string | null {
  const c = entry.context;
  return (c?.kind === "checkin" || c?.kind === "tadabbur") && c.ref && VERSE_KEY_RE.test(c.ref)
    ? c.ref
    : null;
}

/** Every verse key the export will need, de-duplicated (web exportInput). */
export function exportVerseKeys(entries: JournalEntry[]): string[] {
  return [
    ...new Set(
      entries.map((e) => e.context?.ref).filter((r): r is string => !!r && VERSE_KEY_RE.test(r)),
    ),
  ];
}

/** Shape grouped entries for export; verse text is looked up by the caller. */
export function toSections(
  groups: JournalGroup[],
  titleFor: (g: JournalGroup) => string,
  surahNames: Map<number, string>,
  verses: Map<string, { arabic: string; translation: string }>,
): ExportSection[] {
  return groups.map((g) => ({
    title: titleFor(g),
    items: g.entries.map((entry) => {
      const ref = entry.context?.ref;
      if (!ref || !VERSE_KEY_RE.test(ref)) return { entry };
      const surah = Number(ref.split(":")[0]);
      const name = surahNames.get(surah);
      const verse = verses.get(ref);
      return {
        entry,
        // Under its own surah's heading the name would only repeat.
        verseLabel: g.surah === surah ? ref : name ? `${name} · ${ref}` : `Qur’an ${ref}`,
        translation: verse?.translation,
        arabic: verse?.arabic,
      };
    }),
  }));
}

export function formatDate(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  });
}

export function formatDay(d: Date): string {
  return d.toLocaleDateString(undefined, { dateStyle: "long" });
}

export const TRANSLATION_CREDIT = "English translation by Talal Itani (ClearQuran).";

export function hasTranslations(input: ExportInput): boolean {
  return input.sections.some((s) => s.items.some((i) => i.translation));
}

export function spanLabel(input: ExportInput): string {
  const times = input.sections.flatMap((s) => s.items.map((i) => i.entry.createdAt));
  const n = times.length;
  const count = `${n} ${n === 1 ? "reflection" : "reflections"}`;
  if (n === 0) return count;
  const first = formatDay(new Date(Math.min(...times)));
  const last = formatDay(new Date(Math.max(...times)));
  // One day's worth: each entry already carries its date.
  return first === last ? count : `${count} · ${first} – ${last}`;
}

/** "Exported …", only when it adds something the entry dates don't say. */
export function exportedLabel(input: ExportInput): string | null {
  const times = input.sections.flatMap((s) => s.items.map((i) => i.entry.createdAt));
  const exported = formatDay(input.exportedAt);
  if (times.length && formatDay(new Date(Math.max(...times))) === exported) return null;
  return `Exported ${exported}`;
}

/** Plain prose: headings on their own line, blank lines between, no markup. */
export function buildJournalText(input: ExportInput): string {
  const exported = exportedLabel(input);
  const out: string[] = ["MindfulVerse — Your reflections", spanLabel(input)];
  if (exported) out.push(exported);
  for (const section of input.sections) {
    out.push("", "", section.title);
    for (const { entry, verseLabel, translation, arabic } of section.items) {
      const lines = [formatDate(entry.createdAt)];
      if (verseLabel) lines.push(verseLabel);
      if (arabic) lines.push(arabic);
      if (translation) lines.push(`“${translation}”`);
      if (entry.prompt) lines.push(entry.prompt);
      lines.push(entry.body);
      out.push("", lines.join("\n"));
    }
  }
  if (hasTranslations(input)) out.push("", "", TRANSLATION_CREDIT);
  return out.join("\n") + "\n";
}
