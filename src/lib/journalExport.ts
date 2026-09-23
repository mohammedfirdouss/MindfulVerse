// Journal export: shaping entries for export, the plain-text file, and saving.
// The designed PDF lives in journalPdf.ts, loaded only when asked for.
import type { JournalGroup } from "./journalGroups";
import type { JournalEntry } from "./types";

export interface ExportItem {
  entry: JournalEntry;
  /** "Al-Baqarah · 2:255" when the entry was written about a verse. */
  verseLabel?: string;
  /** The verse's English translation, verbatim. */
  translation?: string;
}

export interface ExportSection {
  title: string;
  items: ExportItem[];
}

export interface ExportInput {
  sections: ExportSection[];
  exportedAt: Date;
}

const VERSE_KEY_RE = /^\d{1,3}:\d{1,3}$/;

/** Shape grouped entries for export; verse text is looked up by the caller. */
export function toSections(
  groups: JournalGroup[],
  titleFor: (g: JournalGroup) => string,
  surahNames: Map<number, string>,
  translations: Map<string, string>
): ExportSection[] {
  return groups.map((g) => ({
    title: titleFor(g),
    items: g.entries.map((entry) => {
      const ref = entry.context?.ref;
      if (!ref || !VERSE_KEY_RE.test(ref)) return { entry };
      const surah = Number(ref.split(":")[0]);
      const name = surahNames.get(surah);
      return {
        entry,
        verseLabel: name ? `${name} · ${ref}` : `Qur’an ${ref}`,
        translation: translations.get(ref),
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

export function countEntries(input: ExportInput): number {
  return input.sections.reduce((n, s) => n + s.items.length, 0);
}

/* ------------------------------ Plain text ------------------------------ */

/** Plain prose: headings on their own line, blank lines between, no markup. */
export function buildJournalText(input: ExportInput): string {
  const n = countEntries(input);
  const out: string[] = [
    "MindfulVerse — Your reflections",
    `Exported ${formatDay(input.exportedAt)} · ${n} ${n === 1 ? "reflection" : "reflections"}`,
  ];
  for (const section of input.sections) {
    out.push("", "", section.title);
    for (const { entry, verseLabel, translation } of section.items) {
      const lines = [formatDate(entry.createdAt)];
      if (verseLabel) lines.push(verseLabel);
      if (translation) lines.push(`“${translation}”`);
      if (entry.prompt) lines.push(entry.prompt);
      lines.push(entry.body);
      out.push("", lines.join("\n"));
    }
  }
  if (hasTranslations(input)) out.push("", "", TRANSLATION_CREDIT);
  return out.join("\n") + "\n";
}

/* ------------------------------- Saving --------------------------------- */

/** Hand a file to the user: the share sheet on phones (where a blob link can
 *  strand an installed app), a normal download everywhere else. */
export async function saveFile(data: BlobPart, filename: string, type: string): Promise<void> {
  const file = new File([data], filename, { type });
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  if (coarse && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch (e) {
      if ((e as DOMException).name === "AbortError") return;
      // Fall through to a download if sharing itself failed.
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking immediately can cancel the download in Safari and Firefox.
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
