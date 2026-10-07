// Derives the journal's grouped view from the flat entry list. Display-only:
// the stored data model and sync merge are untouched.
import type { JournalEntry } from "./types";

const VERSE_KEY_RE = /^(\d{1,3}):\d{1,3}$/;

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

function keyFor(e: JournalEntry): { key: string; surah?: number; sessionId?: string } {
  const kind = e.context?.kind;
  const ref = e.context?.ref;
  if ((kind === "checkin" || kind === "tadabbur") && ref) {
    const m = VERSE_KEY_RE.exec(ref);
    if (m) return { key: `surah:${Number(m[1])}`, surah: Number(m[1]) };
  }
  if (kind === "session" && ref) return { key: `session:${ref}`, sessionId: ref };
  return { key: "other" };
}

/** Cluster entries by what they were written about; newest group first. */
export function groupEntries(entries: JournalEntry[]): JournalGroup[] {
  const groups = new Map<string, JournalGroup>();
  for (const e of entries) {
    const { key, surah, sessionId } = keyFor(e);
    let g = groups.get(key);
    if (!g) {
      g = { key, surah, sessionId, entries: [], latest: 0 };
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
