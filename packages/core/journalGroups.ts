// Derives the journal's grouped view from the flat entry list. Display-only:
// the stored data model and sync merge are untouched.
import type { JournalEntry } from "./types";

const VERSE_KEY_RE = /^(\d{1,3}):\d{1,3}$/u;
const SURAH_RE = /^\d{1,3}$/u;

export interface JournalGroup {
  /** "surah:<n>" | "session:<id>" | "other" */
  key: string;
  surah?: number;
  sessionId?: string;
  /** Oldest first, so a group reads like a notebook chapter. */
  entries: JournalEntry[];
  /** Epoch ms of the group's newest entry — what the group list sorts by. */
  latest: number;
}

interface GroupKey {
  key: string;
  surah?: number;
  sessionId?: string;
}

function keyFor(e: JournalEntry, byId: Map<string, JournalEntry>): GroupKey {
  const kind = e.context?.kind;
  const ref = e.context?.ref;
  if (kind === "followup" && ref) {
    // Resolves one level only: an original that is missing or itself a
    // follow-up leaves this one under "other".
    const original = byId.get(ref);
    return original && original.context?.kind !== "followup"
      ? keyFor(original, byId)
      : { key: "other" };
  }
  if (kind === "intention" && ref && SURAH_RE.test(ref)) {
    return { key: `surah:${Number(ref)}`, surah: Number(ref) };
  }
  if ((kind === "checkin" || kind === "tadabbur") && ref) {
    const m = VERSE_KEY_RE.exec(ref);
    if (m) {
      return { key: `surah:${Number(m[1])}`, surah: Number(m[1]) };
    }
  }
  if (kind === "session" && ref) {
    return { key: `session:${ref}`, sessionId: ref };
  }
  return { key: "other" };
}

/** Cluster entries by what they were written about; newest group first. */
export function groupEntries(entries: JournalEntry[]): JournalGroup[] {
  const groups = new Map<string, JournalGroup>();
  const byId = new Map(entries.map((e) => [e.id, e]));
  for (const e of entries) {
    const { key, surah, sessionId } = keyFor(e, byId);
    let g = groups.get(key);
    if (!g) {
      g = { entries: [], key, latest: 0, sessionId, surah };
      groups.set(key, g);
    }
    g.entries.push(e);
    g.latest = Math.max(g.latest, e.createdAt);
  }
  for (const g of groups.values()) {
    g.entries.sort((a, b) => a.createdAt - b.createdAt);
  }
  return [...groups.values()].sort((a, b) => b.latest - a.latest);
}
