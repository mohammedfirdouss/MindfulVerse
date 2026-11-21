// Pure logic for the Circles screen and the circle link route. No React Native
// imports, so vitest runs it.
import {
  finishedSurahs,
  nextPassage,
  portionLabel,
} from "@mindfulverse/core/circlePortion";
import type { Passage } from "@mindfulverse/core/circlePortion";
import {
  circlePath,
  MAX_JOINED_CIRCLES,
  parseCircleLink,
} from "@mindfulverse/core/circles";
import type {
  Circle,
  CircleHistoryEntry,
  CircleResult,
} from "@mindfulverse/core/circles";
import type { SurahMeta } from "@mindfulverse/core/types";

export const WEB_ORIGIN = "https://mindfulverse.vercel.app";

export const PRIVACY_LINE =
  "Your reflections stay private. Only the surah is shared.";
export const SIGNED_OUT_LINE =
  "Sign in to start one. Joining needs no account.";

const DIGITS = /^\d+$/u;

export function inviteUrl(code: string): string {
  return `${WEB_ORIGIN}${circlePath(code)}`;
}

export function surahLabel(
  surah: number,
  surahs: Map<number, SurahMeta>
): string {
  return surahs.get(surah)?.name ?? `Surah ${surah}`;
}

/** "Al-Kahf" or "Al-Kahf · verse 10". */
export function circleSummary(
  circle: Pick<Circle, "surah" | "verse">,
  surahs: Map<number, SurahMeta>
): string {
  const name = surahLabel(circle.surah, surahs);
  return circle.verse === null ? name : `${name} · verse ${circle.verse}`;
}

/** The message that goes into the share sheet, link last so chat apps
 *  preview it. */
export function inviteMessage(
  circle: Pick<Circle, "code" | "name" | "surah" | "verse">,
  surahs: Map<number, SurahMeta>
): string {
  const name = surahLabel(circle.surah, surahs);
  const focus = circle.verse === null ? "" : `, from verse ${circle.verse},`;
  return `Read ${name}${focus} with “${circle.name}” on MindfulVerse.\n${inviteUrl(circle.code)}`;
}

export type VerseCheck =
  | { ok: true; verse: number | null }
  | { ok: false; message: string };

/** The optional focus verse as typed. Empty means no focus verse. Checked
 *  against the surah's verse count once that is known. */
export function checkFocusVerse(
  raw: string,
  ayahCount: number | undefined
): VerseCheck {
  const text = raw.trim();
  if (text === "") {
    return { ok: true, verse: null };
  }
  const n = DIGITS.test(text) ? Number(text) : Number.NaN;
  const max = ayahCount ?? 286;
  if (!Number.isInteger(n) || n < 1 || n > max) {
    return { message: `Choose a verse from 1 to ${max}.`, ok: false };
  }
  return { ok: true, verse: n };
}

/** A focus verse the surah actually has, or null. Guards a cached circle
 *  whose verse no longer fits. */
export function fittingVerse(
  verse: number | null,
  ayahCount: number | undefined
): number | null {
  if (verse === null) {
    return null;
  }
  return ayahCount === undefined || verse <= ayahCount ? verse : null;
}

/** Surahs whose name or number matches the search, in mushaf order. */
export function filterSurahs(list: SurahMeta[], query: string): SurahMeta[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return list;
  }
  return list.filter(
    (s) => s.name.toLowerCase().includes(q) || String(s.number) === q
  );
}

export type LinkTarget =
  | { kind: "tadabbur"; surah: number; verse: number | null }
  | { kind: "home" }
  | { kind: "failed"; message: string; retry: boolean };

export interface LinkDeps {
  fetch: (code: string) => Promise<CircleResult<Circle>>;
  join: (circle: Circle) => boolean;
  leave: () => void;
  setSurah: (surah: number) => unknown;
}

/** Where a /circle/<x> link leads. A named circle is fetched and joined; an
 *  old numeric link replaces any named circle with that surah. */
export async function resolveCircleLink(
  raw: unknown,
  deps: LinkDeps
): Promise<LinkTarget> {
  const link = parseCircleLink(raw);
  if (!link) {
    return { kind: "home" };
  }
  if (link.kind === "surah") {
    deps.leave();
    deps.setSurah(link.surah);
    return { kind: "tadabbur", surah: link.surah, verse: null };
  }
  const result = await deps.fetch(link.code);
  if (!result.ok) {
    return {
      kind: "failed",
      message: result.error.message,
      retry: result.error.kind !== "not-found",
    };
  }
  if (!deps.join(result.value)) {
    return { kind: "home" };
  }
  return {
    kind: "tadabbur",
    surah: result.value.surah,
    verse: result.value.verse,
  };
}
