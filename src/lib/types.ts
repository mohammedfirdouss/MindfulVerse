// ============================================================================
// DATA CONTRACT — the single source of truth for all bundled data shapes.
// The data-pipeline and content agents PRODUCE these; the UI agents CONSUME them.
// Do not change a shape without updating both sides.
// ============================================================================

/** "surah:ayah", e.g. "2:255". */
export type VerseKey = string;

/** One ayah as shown in the reader. Served from /data/quran/{surah}.json */
export interface Ayah {
  surah: number;
  ayah: number;
  verseKey: VerseKey;
  arabic: string; // Uthmani script
  translation: string; // English (Talal Itani / ClearQuran, CC BY-NC-ND 4.0)
}

/** Index entry per surah. Served from /data/surahs.json (array of 114). */
export interface SurahMeta {
  number: number; // 1..114
  name: string; // transliterated English name, e.g. "Al-Baqarah"
  ayahCount: number;
}

/** Ibn Kathir (English) excerpt per ayah. Served from /data/tafsir/{surah}.json
 *  as a map keyed by ayah number (string). Text is cleaned, verbatim (no rewriting). */
export type SurahTafsir = Record<string, string>;

/** A theme → verse-range mapping from the ayah-themes dataset.
 *  Served from /data/themes.json (array). */
export interface Theme {
  id: number;
  theme: string;
  surah: number;
  ayahFrom: number;
  ayahTo: number;
}

/** One step in a tadabbur session. All content is verbatim-sourced EXCEPT
 *  `reflection`, which is the one hand-written prompt allowed per the plan. */
export interface SessionStep {
  verseKeys: VerseKey[]; // ayahs to display (arabic + translation + tafsir)
  reflection?: string; // OPTIONAL hand-written reflection prompt for this step
}

/** A curated tadabbur session. Served from /data/sessions.json (array of 10). */
export interface TadabburSession {
  id: string; // stable slug, e.g. "patience-in-hardship"
  title: string;
  theme: string; // human-readable theme label
  intro: string; // short hand-written framing shown before the ayahs
  steps: SessionStep[];
  journalPrompt: string; // hand-written prompt shown at the end
}

/** Emotion front-door option. The verses here are a NEUTRAL, self-evidently
 *  comforting curated set — never prescriptive pastoral advice. */
export interface EmotionEntry {
  id: string; // e.g. "anxious"
  label: string; // e.g. "Anxious"
  framing: string; // neutral header, e.g. "Verses on ease"
  verseKeys: VerseKey[]; // hand-vetted safe verses
}

/** Served from /data/emotions.json (array). */
export type EmotionMap = EmotionEntry[];

/** A saved journal entry (local-only, localStorage). */
export interface JournalEntry {
  id: string;
  createdAt: number; // epoch ms
  prompt: string; // what the user was responding to
  body: string; // the user's writing
  context?: { kind: "session" | "checkin" | "tadabbur" | "free"; ref?: string };
}

/** Soft-delete marker so a deletion propagates instead of resurrecting. */
export interface JournalTombstone { id: string; deletedAt: number }

/** Local progress state persisted to localStorage and synced. */
export interface LocalProgress {
  visits: string[];
  sessionProgress: Record<string, { step: number; completedAt?: number }>;
  surahTadabbur: Record<string, { ayah: number; updatedAt: number }>;
  lastRead: { surah: number; ayah: number; at: number } | null;
}

/** One juz or hizb: an inclusive verse-key range. */
export interface Division {
  n: number;
  first: string; // "2:142"
  last: string; // "2:252"
  /** Juz only: first three words of the first verse, verbatim. */
  opening?: string;
}

/** Mushaf divisions from QUL metadata (public/data/divisions.json). */
export interface Divisions {
  juz: Division[]; // 30
  hizb: Division[]; // 60
  rub: string[]; // 240 quarter start keys
  sajda: { key: string; type: string }[]; // 15
}
