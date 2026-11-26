// Pure tadabbur logic, ported from web's pages/SurahTadabbur.tsx. No
// react-native imports, so vitest runs it.
import {
  FEELINGS,
  hasReflection,
  MAX_FEELINGS,
  migrateDraft,
  PROMPTS,
  reflectionBody,
} from "@mindfulverse/core/reflectionPrompts";
import type { ReflectionDraft } from "@mindfulverse/core/reflectionPrompts";
import { introBlocks } from "@mindfulverse/core/surahIntro";
import type { IntroBlock } from "@mindfulverse/core/surahIntro";

/** Ibn Kathir comments on passages: a run of ayahs stores its commentary under
 *  the first ayah of the group. Find the entry covering this ayah.
 *  `indexed` is ascending (tafsir-index.json). */
export function coveringFromIndex(
  indexed: readonly number[],
  ayah: number
): number | null {
  let best: number | null = null;
  for (const n of indexed) {
    if (n <= ayah) {
      best = n;
    } else {
      break;
    }
  }
  return best;
}

/** The surah's "About" text opens trimmed to this many paragraphs. */
export const ABOUT_COLLAPSED_PARAGRAPHS = 5;

export type InfoBlock = IntroBlock;

/** The introduction's blocks (core's `introBlocks`: why it was revealed first
 *  when there is a background section; a short line without a full stop is a
 *  subheading, as on web). */
export function infoBlocks(
  text: string,
  expanded: boolean
): { blocks: InfoBlock[]; truncated: boolean } {
  const all = introBlocks(text);
  const blocks = expanded ? all : all.slice(0, ABOUT_COLLAPSED_PARAGRAPHS);
  return { blocks, truncated: all.length > blocks.length };
}

/** The collapsed "About this surah": its first section only (an opening
 *  subheading(s) and the paragraph under them, or just the first paragraph).
 *  `clamp` is true when that paragraph is long enough to be trimmed to a few
 *  lines; `more` is true when there is anything left to show. */
export const ABOUT_EXCERPT_CHARS = 200;
export function aboutExcerpt(blocks: readonly InfoBlock[]): {
  count: number;
  clamp: boolean;
  more: boolean;
} {
  let count = 0;
  while (blocks[count]?.kind === "heading") {
    count += 1;
  }
  if (blocks[count]?.kind === "paragraph") {
    count += 1;
  }
  const last = blocks[count - 1];
  const clamp =
    last?.kind === "paragraph" && last.text.length > ABOUT_EXCERPT_CHARS;
  return { clamp, count, more: clamp || blocks.length > count };
}

/** The journal entry a draft becomes (same prompt/body/context as web), or
 *  null when there is nothing to save. */
export function composeReflection(
  verseKey: string,
  d: ReflectionDraft
): {
  prompt: string;
  body: string;
  context: { kind: "tadabbur"; ref: string };
} | null {
  if (!hasReflection(d)) {
    return null;
  }
  return {
    body: reflectionBody(d),
    context: { kind: "tadabbur", ref: verseKey },
    prompt: `Tadabbur on ${verseKey}`,
  };
}

/** `?v=n` → the phase (0-based verse index) to start at, or null when the
 *  param is absent or out of range (web: `Number.isInteger(v) && 1 <= v <= count`). */
export function deepLinkPhase(
  v: string | string[] | undefined,
  count: number
): number | null {
  const raw = Array.isArray(v) ? v[0] : v;
  if (raw === undefined || raw === "") {
    return null;
  }
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= count ? n - 1 : null;
}

/** The saved resume point, if it falls inside this surah. */
export function resumeAyahFor(
  saved: { ayah: number } | undefined,
  count: number
): number | null {
  return saved !== null &&
    saved !== undefined &&
    saved.ayah >= 1 &&
    saved.ayah <= count
    ? saved.ayah
    : null;
}

export function parseSurahParam(
  s: string | string[] | undefined
): number | null {
  const raw = Array.isArray(s) ? s[0] : s;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 114 ? n : null;
}

export function verseCount(count: number): string {
  return `${count} ${count === 1 ? "verse" : "verses"}`;
}

/** The commentary toggle's label (web's VerseCommentary). */
export function commentaryToggleLabel(
  open: boolean,
  ayah: number,
  covering: number
): string {
  if (open) {
    return "Hide the commentary";
  }
  return covering === ayah
    ? "Read the commentary"
    : `Read the commentary (with verse ${covering})`;
}

/** The four questions (web's SurahTadabbur), asked one at a time. Copy and
 *  the feelings list live in core so web and Android match. */
export const QUESTIONS = Object.freeze([
  { key: "feeling", label: PROMPTS.feeling },
  { key: "reminder", label: PROMPTS.reminder },
  { key: "takeaway", label: PROMPTS.takeaway },
  { key: "research", label: PROMPTS.research },
] as const);

export type QuestionKey = (typeof QUESTIONS)[number]["key"];

/** Accessible label for the step diamonds. */
export function questionStepLabel(step: number): string {
  return `Question ${step + 1} of ${QUESTIONS.length}`;
}

/** Whether the question at `step` has anything in it yet (Next vs Skip). */
export function stepAnswered(d: ReflectionDraft, step: number): boolean {
  switch (QUESTIONS[step]?.key) {
    case "feeling": {
      return d.feelings.length > 0 || d.feelingNote.trim() !== "";
    }
    case "reminder": {
      return d.reminder.trim() !== "";
    }
    case "takeaway": {
      return d.takeaway.trim() !== "" || d.action.trim() !== "";
    }
    default: {
      return d.research.trim() !== "";
    }
  }
}

/** Toggle one feeling, never past MAX_FEELINGS, kept in display order. */
export function toggleFeeling(feelings: string[], word: string): string[] {
  if (feelings.includes(word)) {
    return feelings.filter((f) => f !== word);
  }
  if (feelings.length >= MAX_FEELINGS) {
    return feelings;
  }
  const next = new Set([...feelings, word]);
  return FEELINGS.filter((f) => next.has(f));
}

// Drafts persist per surah, so nothing typed is ever lost (reload, app kill,
// leaving the screen). Same key on web and mobile; on native localStorage is
// the MMKV shim. Stored as { [verseKey]: ReflectionDraft }, empty drafts
// dropped. Old drafts ({ lessons, stirs, action }) are read through
// migrateDraft, so a half-written reflection resumes in the new questions.

export const TADABBUR_DRAFTS_PREFIX = "mindfulverse.tadabburDrafts.v1:";

export function tadabburDraftKey(surah: number): string {
  return `${TADABBUR_DRAFTS_PREFIX}${surah}`;
}

export interface DraftStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function defaultStore(): DraftStore | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/** Parse a stored drafts map, keeping only drafts with something in them. */
export function parseTadabburDrafts(
  raw: string | null | undefined
): Record<string, ReflectionDraft> {
  if (!raw) {
    return {};
  }
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {};
  }
  const out: Record<string, ReflectionDraft> = {};
  for (const [verseKey, v] of Object.entries(data as Record<string, unknown>)) {
    const d = migrateDraft(v);
    if (hasReflection(d)) {
      out[verseKey] = d;
    }
  }
  return out;
}

/** Every kept draft for a surah. Never throws. */
export function loadTadabburDrafts(
  surah: number,
  store: DraftStore | null = defaultStore()
): Record<string, ReflectionDraft> {
  if (!store) {
    return {};
  }
  try {
    return parseTadabburDrafts(store.getItem(tadabburDraftKey(surah)));
  } catch {
    return {};
  }
}

/** Set (or, when empty, clear) one verse's draft. Never throws: a full or
 *  blocked store just means the draft lives in memory for now. */
export function saveTadabburDraft(
  surah: number,
  verseKey: string,
  draft: ReflectionDraft,
  store: DraftStore | null = defaultStore()
): void {
  if (!store) {
    return;
  }
  try {
    const all = loadTadabburDrafts(surah, store);
    if (hasReflection(draft)) {
      all[verseKey] = { ...draft, feelings: [...draft.feelings] };
    } else {
      // oxlint-disable-next-line typescript/no-dynamic-delete -- removing one verse draft by key
      delete all[verseKey];
    }
    const key = tadabburDraftKey(surah);
    if (Object.keys(all).length === 0) {
      store.removeItem(key);
    } else {
      store.setItem(key, JSON.stringify(all));
    }
  } catch {
    /* storage full or blocked */
  }
}
