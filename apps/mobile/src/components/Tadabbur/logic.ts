// Pure tadabbur logic, ported from web's pages/SurahTadabbur.tsx. No
// react-native imports, so vitest runs it.

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

/** The collapsed "About this surah": its first section only (an opening
 *  subheading(s) and the paragraph under them, or just the first paragraph).
 *  `clamp` is true when that paragraph is long enough to be trimmed to a few
 *  lines; `more` is true when there is anything left to show. */
export const ABOUT_EXCERPT_CHARS = 200;
export function aboutExcerpt(blocks: readonly InfoBlock[]): { count: number; clamp: boolean; more: boolean } {
  let count = 0;
  while (blocks[count]?.kind === "heading") count += 1;
  if (blocks[count]?.kind === "paragraph") count += 1;
  const last = blocks[count - 1];
  const clamp = last?.kind === "paragraph" && last.text.length > ABOUT_EXCERPT_CHARS;
  return { count, clamp, more: clamp || blocks.length > count };
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


/** The three questions, asked one at a time. */
export const QUESTIONS: readonly { key: keyof Draft; label: string }[] = Object.freeze([
  { key: "lessons", label: "What does it teach?" },
  { key: "stirs", label: "What stays with you?" },
  { key: "action", label: "What will you do?" },
]);

/** Accessible label for the step diamonds. */
export function questionStepLabel(step: number): string {
  return `Question ${step + 1} of ${QUESTIONS.length}`;
}

// Drafts persist per surah, so nothing typed is ever lost (reload, app kill,
// leaving the screen). Same key on web and mobile; on native localStorage is
// the MMKV shim. Stored as { [verseKey]: Draft }, empty drafts dropped.

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

/** Parse a stored drafts map, keeping only well-formed drafts with text. */
export function parseTadabburDrafts(raw: string | null | undefined): Record<string, Draft> {
  if (!raw) return {};
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const out: Record<string, Draft> = {};
  for (const [verseKey, v] of Object.entries(data as Record<string, unknown>)) {
    if (!v || typeof v !== "object") continue;
    const o = v as Record<string, unknown>;
    const d: Draft = {
      lessons: typeof o.lessons === "string" ? o.lessons : "",
      stirs: typeof o.stirs === "string" ? o.stirs : "",
      action: typeof o.action === "string" ? o.action : "",
    };
    if (hasText(d)) out[verseKey] = d;
  }
  return out;
}

/** Every kept draft for a surah. Never throws. */
export function loadTadabburDrafts(
  surah: number,
  store: DraftStore | null = defaultStore(),
): Record<string, Draft> {
  if (!store) return {};
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
  draft: Draft,
  store: DraftStore | null = defaultStore(),
): void {
  if (!store) return;
  try {
    const all = loadTadabburDrafts(surah, store);
    if (hasText(draft)) all[verseKey] = { lessons: draft.lessons, stirs: draft.stirs, action: draft.action };
    else delete all[verseKey];
    const key = tadabburDraftKey(surah);
    if (Object.keys(all).length === 0) store.removeItem(key);
    else store.setItem(key, JSON.stringify(all));
  } catch {
    /* storage full or blocked */
  }
}
