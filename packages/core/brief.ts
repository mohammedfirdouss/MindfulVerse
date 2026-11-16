// "In short" in the Deeper look: Al-Mukhtasar's explanation of one verse.
// The text is shown exactly as published. Never edit it here.
import type { SurahBrief } from "./types";

export const BRIEF_HEADING = "In short";
/** The credit shown under the explanation. */
export const BRIEF_CREDIT =
  "From Al-Mukhtasar fi Tafsir al-Qur’an al-Karim, Tafsir Center for Quranic Studies";

export interface Brief {
  paragraphs: string[];
  /** The verse the explanation is filed under: this one, or the earlier
   *  verse it is explained together with. */
  from: number;
}

/** The explanation covering `ayah`, or null when there is none. */
export function briefFor(
  brief: SurahBrief | undefined,
  ayah: number
): Brief | null {
  const own = brief?.[String(ayah)];
  const from = typeof own === "number" ? own : ayah;
  const text = typeof own === "number" ? brief?.[String(own)] : own;
  if (typeof text !== "string") {
    return null;
  }
  const paragraphs = text
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);
  return paragraphs.length > 0 ? { from, paragraphs } : null;
}

/** "Explained together with verse 3", or null for a verse's own text. */
export function briefSharedLabel(brief: Brief, ayah: number): string | null {
  return brief.from === ayah
    ? null
    : `Explained together with verse ${brief.from}`;
}
