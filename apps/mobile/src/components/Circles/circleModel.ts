// Pure logic for the Circles screen and the circle link route (web:
// apps/web/src/pages/circles-view.ts). No React Native imports, so vitest
// runs it.
import { portionLabel } from "@mindfulverse/core/circlePortion";
import type { Passage } from "@mindfulverse/core/circlePortion";
import {
  circlePath,
  finishedSurahs,
  MAX_JOINED_CIRCLES,
  parseCircleLink,
} from "@mindfulverse/core/circles";
import type {
  Circle,
  CircleHistoryEntry,
  CircleResult,
} from "@mindfulverse/core/circles";
import type { SurahMeta } from "@mindfulverse/core/types";

export const WEB_ORIGIN = "https://mindfulverse.app";

export const PRIVACY_LINE =
  "Your reflections stay private. Only the surah is shared.";
export const SIGNED_OUT_LINE =
  "Sign in to start one. Joining needs no account.";

/** Shown when "Show on Home" or "Start circle" would make a fourth. */
export const FULL_NOTE = `You can be in up to ${MAX_JOINED_CIRCLES} circles. Leave one to add this one.`;
/** Shown by an invite link when the device is already in three others. */
export const INVITE_FULL_NOTE = `You’re already in ${MAX_JOINED_CIRCLES} circles. Leave one on the Circles page, then open this link again.`;
export const CREATED_LINE =
  "Your circle is ready. Share the link or the QR code below.";
export const PORTION_ERROR = "Choose this week’s verses again for this surah.";
export const WHOLE_SURAH = "The whole surah";

const PORTION = /^(\d{1,3})(?:-(\d{1,3}))?$/u;
const LONGEST_SURAH = 286;

type PortionOf = Pick<Circle, "verse"> & { verseEnd?: number | null };

const labelOf = (c: PortionOf) =>
  portionLabel({ surah: 0, verse: c.verse, verseEnd: c.verseEnd ?? null });

export function inviteUrl(code: string): string {
  return `${WEB_ORIGIN}${circlePath(code)}`;
}

export function surahLabel(
  surah: number,
  surahs: Map<number, SurahMeta>
): string {
  return surahs.get(surah)?.name ?? `Surah ${surah}`;
}

/** "Al-Kahf", "Al-Kahf, verse 10" or "Al-Kahf, verses 7 to 12". */
export function circleSummary(
  circle: Pick<Circle, "surah"> & PortionOf,
  surahs: Map<number, SurahMeta>
): string {
  const name = surahLabel(circle.surah, surahs);
  const label = labelOf(circle);
  return label === null ? name : `${name}, ${label}`;
}

/** The message that goes into the share sheet, link last so chat apps
 *  preview it. */
export function inviteMessage(
  circle: Pick<Circle, "code" | "name" | "surah"> & PortionOf,
  surahs: Map<number, SurahMeta>
): string {
  const name = surahLabel(circle.surah, surahs);
  const label = labelOf(circle);
  let focus = "";
  if (label !== null) {
    focus =
      circle.verseEnd === null || circle.verseEnd === undefined
        ? `, from verse ${circle.verse},`
        : `, ${label},`;
  }
  return `Read ${name}${focus} with “${circle.name}” on MindfulVerse.\n${inviteUrl(circle.code)}`;
}

export function qrLabel(name: string): string {
  return `QR code to join ${name}`;
}

export function qrCaption(name: string): string {
  return `Scan with a phone camera to join ${name}.`;
}

/** The owner's delete confirm. */
export function deleteLine(name: string): string {
  return `Delete ${name}? Members keep their reflections.`;
}

export interface CircleEntry {
  circle: Circle;
  owned: boolean;
  joined: boolean;
  /** The circle Home leads with: the first one this device joined. */
  onHome: boolean;
}

/** Each circle once: the ones this device joined first (Home's first), then
 *  the rest the person started. A joined circle they own uses the owner's
 *  fresh copy. */
export function circleEntries(
  joined: Circle[],
  owned: Circle[]
): CircleEntry[] {
  const byCode = new Map(owned.map((c) => [c.code, c]));
  const joinedCodes = new Set(joined.map((c) => c.code));
  const entries: CircleEntry[] = joined.map((c, i) => ({
    circle: byCode.get(c.code) ?? c,
    joined: true,
    onHome: i === 0,
    owned: byCode.has(c.code),
  }));
  for (const c of owned) {
    if (!joinedCodes.has(c.code)) {
      entries.push({ circle: c, joined: false, onHome: false, owned: true });
    }
  }
  return entries;
}

export type StartView = "none" | "signed-out" | "form" | "button";

/** What sits below the cards: nothing while the account or the person's own
 *  circles load, a sign-in prompt, the start form (open, or straight away
 *  when there are no circles), or the button that opens it. */
export function startView({
  accountLoading,
  signedIn,
  ownedLoaded,
  formOpen,
  count,
}: {
  accountLoading: boolean;
  signedIn: boolean;
  ownedLoaded: boolean;
  formOpen: boolean;
  count: number;
}): StartView {
  if (accountLoading) {
    return "none";
  }
  if (!signedIn) {
    return "signed-out";
  }
  if (formOpen) {
    return "form";
  }
  if (!ownedLoaded) {
    return "none";
  }
  return count === 0 ? "form" : "button";
}

// ---- This week's portion ----

/** "" for the whole surah, "7" for a focus verse, "7-12" for a range. */
export function portionValue(p: PortionOf): string {
  if (p.verse === null) {
    return "";
  }
  const end = p.verseEnd ?? null;
  return end === null || end === p.verse
    ? String(p.verse)
    : `${p.verse}-${end}`;
}

/** The value a passage is picked with. */
export function passageValue(p: Passage): string {
  return portionValue({ verse: p.from, verseEnd: p.to });
}

/** "Verses 7 to 12: Story of the Companions of the Cave". */
export function passageOptionLabel(p: Passage): string {
  const range =
    p.from === p.to ? `Verse ${p.from}` : `Verses ${p.from} to ${p.to}`;
  return p.theme ? `${range}: ${p.theme}` : range;
}

export interface PortionChoice {
  value: string;
  label: string;
}

/** "Verses 7 to 12" or "From verse 7", for a portion that isn't a passage. */
function ownPortionLabel(value: string): string {
  return value.includes("-")
    ? `Verses ${value.replace("-", " to ")}`
    : `From verse ${value}`;
}

/** The "This week" choices: the whole surah, the current portion when it
 *  isn't one of the passages (so editing never drops it silently), then each
 *  passage. */
export function portionChoices(
  passages: Passage[],
  current: string
): PortionChoice[] {
  const choices: PortionChoice[] = [{ label: WHOLE_SURAH, value: "" }];
  const keepsOwn =
    current !== "" && !passages.some((p) => passageValue(p) === current);
  if (keepsOwn) {
    choices.push({ label: ownPortionLabel(current), value: current });
  }
  for (const p of passages) {
    choices.push({ label: passageOptionLabel(p), value: passageValue(p) });
  }
  return choices;
}

/** The label for a chosen value, falling back to the value's own label. */
export function portionChoiceLabel(passages: Passage[], value: string): string {
  return (
    portionChoices(passages, value).find((c) => c.value === value)?.label ??
    WHOLE_SURAH
  );
}

export type PortionCheck =
  | { ok: true; verse: number | null; verseEnd: number | null }
  | { ok: false; message: string };

/** The chosen portion, checked against the surah's verse count (the longest
 *  surah before the list has loaded). */
export function checkPortion(
  raw: string,
  ayahCount: number | undefined
): PortionCheck {
  const text = raw.trim();
  if (text === "") {
    return { ok: true, verse: null, verseEnd: null };
  }
  const match = PORTION.exec(text);
  const verse = Number(match?.[1]);
  const end = match?.[2] === undefined ? null : Number(match[2]);
  const max = ayahCount ?? LONGEST_SURAH;
  const outside = (n: number) => n < 1 || n > max;
  if (
    !match ||
    outside(verse) ||
    (end !== null && (outside(end) || end < verse))
  ) {
    return { message: PORTION_ERROR, ok: false };
  }
  return { ok: true, verse, verseEnd: end === verse ? null : end };
}

/** "Read together: Al-Fatihah, Al-'Asr", leaving out the surah being read
 *  now. Null when nothing else has been finished. */
export function readTogetherLine(
  history: CircleHistoryEntry[],
  currentSurah: number,
  surahs: Map<number, SurahMeta>
): string | null {
  const done = finishedSurahs(history).filter((n) => n !== currentSurah);
  if (done.length === 0) {
    return null;
  }
  return `Read together: ${done.map((n) => surahLabel(n, surahs)).join(", ")}`;
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
  | { kind: "full"; message: string }
  | { kind: "failed"; message: string; retry: boolean };

export interface LinkDeps {
  fetch: (code: string) => Promise<CircleResult<Circle>>;
  join: (circle: Circle) => boolean;
  /** True when joining this circle needs another to be left first. */
  full: (code: string) => boolean;
  leave: () => void;
  setSurah: (surah: number) => unknown;
}

/** Where a /circle/<x> link leads. A named circle is fetched and joined,
 *  unless the device is already in three others; an old numeric link
 *  replaces the circle Home leads with by that surah. */
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
  if (deps.full(result.value.code)) {
    return { kind: "full", message: INVITE_FULL_NOTE };
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
