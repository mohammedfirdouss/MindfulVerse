// Pure logic for Home's lead card and "Or ponder a theme" (web:
// apps/web/src/pages/Home.tsx). No React Native imports, so vitest runs it.
import { portionLabel } from "@mindfulverse/core/circlePortion";
import type { Circle } from "@mindfulverse/core/circles";
import {
  parseSurahNumber,
  STARTER_SURAHS,
} from "@mindfulverse/core/circleSurah";
import type { SessionProgress } from "@mindfulverse/core/progress";
import type { SurahMeta, TadabburSession } from "@mindfulverse/core/types";

import type { VersePos } from "./homeModel";

export const BEGIN_TITLE = "Begin with a surah";
export const BEGIN_LINE = "Ponder it verse by verse, with Ibn Kathir.";

export const CIRCLE_EYEBROW = "Your circle is reading";
export const namedEyebrow = (name: string): string => `${name} is reading`;
/** "This week: verses 7 to 12", or "This week: verse 10". */
export const weekLine = (verse: number, verseEnd: number | null): string =>
  `This week: ${portionLabel({ surah: 0, verse, verseEnd })}`;

/** The named-circle card's one line: this week's verses when the circle has
 *  them, else the intro. Never both. */
export function namedLine(
  verse: number | null,
  verseEnd: number | null = null
): string {
  return verse === null ? BEGIN_LINE : weekLine(verse, verseEnd);
}

export const CONTINUE_EYEBROW = "Your surah";
export const RESUME_ACTION = "Resume";
/** "Your circle", or "Your circles" when the device is in more than one. */
export const yourCircleLink = (joinedCount: number): string =>
  joinedCount > 1 ? "Your circles" : "Your circle";

/** Where the surah in progress stands, under "Continue Al-Kahf". */
export function whereYouAre(
  ayah: number,
  meta: Pick<SurahMeta, "ayahCount"> | undefined
): string {
  if (!meta) {
    return `You’ve pondered up to verse ${ayah}.`;
  }
  if (ayah >= meta.ayahCount) {
    return `You’ve pondered all ${meta.ayahCount} verses.`;
  }
  return `Verse ${ayah} of ${meta.ayahCount}`;
}

/** "Go to verse 10" when the circle has a focus verse, else "Begin Al-Kahf". */
export function namedAction(surahTitle: string, verse: number | null): string {
  return verse === null ? `Begin ${surahTitle}` : `Go to verse ${verse}`;
}

/** What Home's lead card offers, most specific first. */
export type Lead =
  | { kind: "continue"; surah: number; ayah: number }
  | {
      kind: "named";
      name: string;
      surah: number;
      verse: number | null;
      verseEnd: number | null;
    }
  | { kind: "circle"; surah: number }
  | { kind: "starters"; surahs: readonly number[] };

/** A surah tadabbur in progress beats the joined circle, which beats an old
 *  numeric circle link's surah, which beats the short starter surahs. A
 *  circle value that isn't a surah number is ignored. */
export function chooseLead(
  deeper: VersePos | null,
  circleSurah: unknown,
  joined: Pick<Circle, "name" | "surah" | "verse" | "verseEnd"> | null = null
): Lead {
  if (deeper) {
    return { ayah: deeper.ayah, kind: "continue", surah: deeper.surah };
  }
  if (joined) {
    return {
      kind: "named",
      name: joined.name,
      surah: joined.surah,
      verse: joined.verse,
      verseEnd: joined.verseEnd,
    };
  }
  const circle = parseSurahNumber(circleSurah);
  if (circle !== null) {
    return { kind: "circle", surah: circle };
  }
  return { kind: "starters", surahs: STARTER_SURAHS };
}

export function surahName(
  surah: number,
  surahs: Map<number, SurahMeta>
): string {
  return surahs.get(surah)?.name ?? `Surah ${surah}`;
}

/** A starter surah's button text: just its name, "Al-'Asr". */
export function starterLabel(
  surah: number,
  surahs: Map<number, SurahMeta>
): string {
  return surahName(surah, surahs);
}

export const THEME_PICKS = 3;

export function continueTitle(
  surah: number,
  surahNames: Map<number, string>
): string {
  return `Continue ${surahNames.get(surah) ?? `Surah ${surah}`}`;
}

export interface ThemePick {
  id: string;
  title: string;
}

/** Up to `n` sessions in data order, unfinished ones first. */
export function themePicks(
  sessions: TadabburSession[],
  progress: Record<string, SessionProgress>,
  n: number = THEME_PICKS
): ThemePick[] {
  const done = (s: TadabburSession) =>
    progress[s.id]?.completedAt !== undefined;
  return [...sessions.filter((s) => !done(s)), ...sessions.filter(done)]
    .slice(0, n)
    .map(({ id, title }) => ({ id, title }));
}
