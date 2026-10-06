// Pure tadabbur logic, ported from web's pages/SurahTadabbur.tsx (and the
// share text from lib/share.ts). No react-native imports, so vitest runs it.
import type { Ayah } from "@mindfulverse/core/types";

/** Ibn Kathir comments on passages: a run of ayahs stores its commentary under
 *  the first ayah of the group. Find the entry covering this ayah.
 *  `indexed` is ascending (tafsir-index.json). */
export function coveringFromIndex(indexed: readonly number[], ayah: number): number | null {
  let best: number | null = null;
  for (const n of indexed) {
    if (n <= ayah) best = n;
    else break;
  }
  return best;
}

/** Blank-line separated paragraphs, trimmed, empties dropped. */
export function splitParagraphs(text: string | null | undefined): string[] {
  return (text ?? "")
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);
}

/** The surah's "About" text opens trimmed to this many paragraphs. */
export const ABOUT_COLLAPSED_PARAGRAPHS = 5;

export interface InfoBlock {
  kind: "heading" | "paragraph";
  text: string;
}

/** Web's InfoText: a short line without a full stop is a subheading. */
export function infoBlocks(
  text: string,
  expanded: boolean,
): { blocks: InfoBlock[]; truncated: boolean } {
  const paragraphs = splitParagraphs(text);
  const shown = expanded ? paragraphs : paragraphs.slice(0, ABOUT_COLLAPSED_PARAGRAPHS);
  return {
    blocks: shown.map((p) => ({
      kind: p.length < 60 && !p.includes(".") ? "heading" : "paragraph",
      text: p,
    })),
    truncated: paragraphs.length > shown.length,
  };
}

/** The physical tadabbur journal's three questions. */
export interface Draft {
  lessons: string;
  stirs: string;
  action: string;
}

export const EMPTY_DRAFT: Draft = Object.freeze({ lessons: "", stirs: "", action: "" });

export function hasText(d: Draft | undefined): boolean {
  return !!d && (d.lessons.trim().length > 0 || d.stirs.trim().length > 0 || d.action.trim().length > 0);
}

/** The journal entry a draft becomes (same prompt/body/context as web), or
 *  null when there is nothing to save. */
export function composeReflection(
  verseKey: string,
  d: Draft,
): { prompt: string; body: string; context: { kind: "tadabbur"; ref: string } } | null {
  if (!hasText(d)) return null;
  const parts: string[] = [];
  if (d.lessons.trim()) parts.push(`Lessons: ${d.lessons.trim()}`);
  if (d.stirs.trim()) parts.push(`Reflection: ${d.stirs.trim()}`);
  if (d.action.trim()) parts.push(`Action: ${d.action.trim()}`);
  return {
    prompt: `Tadabbur on ${verseKey}`,
    body: parts.join("\n\n"),
    context: { kind: "tadabbur", ref: verseKey },
  };
}

/** `?v=n` → the phase (0-based verse index) to start at, or null when the
 *  param is absent or out of range (web: `Number.isInteger(v) && 1 <= v <= count`). */
export function deepLinkPhase(v: string | string[] | undefined, count: number): number | null {
  const raw = Array.isArray(v) ? v[0] : v;
  if (raw === undefined || raw === "") return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= count ? n - 1 : null;
}

/** The saved resume point, if it falls inside this surah. */
export function resumeAyahFor(saved: { ayah: number } | undefined, count: number): number | null {
  return saved != null && saved.ayah >= 1 && saved.ayah <= count ? saved.ayah : null;
}

export function parseSurahParam(s: string | string[] | undefined): number | null {
  const raw = Array.isArray(s) ? s[0] : s;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 114 ? n : null;
}

export function verseCount(count: number): string {
  return `${count} ${count === 1 ? "verse" : "verses"}`;
}

/** The commentary toggle's label (web's VerseCommentary). */
export function commentaryToggleLabel(open: boolean, ayah: number, covering: number): string {
  if (open) return "Hide the commentary";
  return covering === ayah ? "Read the commentary" : `Read the commentary (with verse ${covering})`;
}

/** Web's lib/share.ts verseText, verbatim. */
export function verseShareText(a: Pick<Ayah, "arabic" | "translation" | "surah" | "ayah">): string {
  return `${a.arabic}\n\n“${a.translation}”\n\n— Qur’an ${a.surah}:${a.ayah}\n\nvia MindfulVerse`;
}
