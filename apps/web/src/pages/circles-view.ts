import { portionLabel } from "@mindfulverse/core/circlePortion";
import type { Passage } from "@mindfulverse/core/circlePortion";
import { circlePath, normalizeName } from "@mindfulverse/core/circles";
import type { CircleDraft } from "@mindfulverse/core/circles";

interface PortionOf {
  verse: number | null;
  verseEnd: number | null;
}

const portionOf = (c: { verse: number | null; verseEnd?: number | null }) =>
  portionLabel({ surah: 0, verse: c.verse, verseEnd: c.verseEnd ?? null });

export const PRIVACY_LINE =
  "Your reflections stay private. Only the surah is shared.";

const TRAILING_SLASHES = /\/+$/u;

/** The link a circle's owner shares: "<origin>/circle/<code>". */
export function circleShareUrl(origin: string, code: string): string {
  return `${origin.replace(TRAILING_SLASHES, "")}${circlePath(code)}`;
}

/** The message sent with the link. */
export function circleShareMessage(
  circle: { name: string; verse: number | null; verseEnd?: number | null },
  surahName: string,
  url: string
): string {
  const label = portionOf(circle);
  let focus = "";
  if (label !== null) {
    focus =
      circle.verseEnd === null || circle.verseEnd === undefined
        ? `, from verse ${circle.verse},`
        : `, ${label},`;
  }
  return `Read ${surahName}${focus} with “${circle.name}” on MindfulVerse.\n${url}`;
}

export function whatsappUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/** "Al-Kahf, verse 10", "Al-Kahf, verses 7 to 12". */
export function circleSummary(
  circle: { verse: number | null; verseEnd?: number | null },
  surahName: string
): string {
  const label = portionOf(circle);
  return label === null ? surahName : `${surahName}, ${label}`;
}

export interface CircleFormValues {
  name: string;
  surah: string;
  /** "" for the whole surah, "7" for a focus verse, "7-12" for a range. */
  portion: string;
}

/** The form value for a circle's portion. */
export function portionValue(p: PortionOf): string {
  if (p.verse === null) {
    return "";
  }
  return p.verseEnd === null ? String(p.verse) : `${p.verse}-${p.verseEnd}`;
}

/** "Verses 7 to 12: Story of the Companions of the Cave". */
export function passageOptionLabel(p: Passage): string {
  const range =
    p.from === p.to ? `Verse ${p.from}` : `Verses ${p.from} to ${p.to}`;
  return p.theme ? `${range}: ${p.theme}` : range;
}

const PORTION = /^(\d{1,3})(?:-(\d{1,3}))?$/u;

export type DraftCheck =
  | { ok: true; draft: CircleDraft }
  | { ok: false; message: string };

/** Checks the form against the chosen surah's verse count. */
export function checkCircleForm(
  values: CircleFormValues,
  verseCount: (surah: number) => number | undefined
): DraftCheck {
  const name = normalizeName(values.name);
  if (name === null) {
    return { message: "Give the circle a name.", ok: false };
  }
  const surah = Number(values.surah);
  const count = verseCount(surah);
  if (!Number.isInteger(surah) || count === undefined) {
    return { message: "Choose a surah.", ok: false };
  }
  const raw = values.portion.trim();
  if (raw === "") {
    return { draft: { name, surah, verse: null, verseEnd: null }, ok: true };
  }
  const match = PORTION.exec(raw);
  const verse = Number(match?.[1]);
  const end = match?.[2] === undefined ? null : Number(match[2]);
  const outside = (n: number) => n < 1 || n > count;
  if (
    !match ||
    outside(verse) ||
    (end !== null && (outside(end) || end < verse))
  ) {
    return {
      message: "Choose this week’s verses again for this surah.",
      ok: false,
    };
  }
  return { draft: { name, surah, verse, verseEnd: end }, ok: true };
}
