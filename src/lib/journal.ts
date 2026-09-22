// Local-only journal (v0 has no accounts or sync). Persists to localStorage.
import type { JournalEntry } from "./types";
import type { JournalTombstone } from "./types";
import { markJournalDirty } from "./syncFlags";

const KEY = "mindfulverse.journal.v1";
const TOMBSTONES_KEY = "mindfulverse.journal.deleted.v1";

function readAll(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as JournalEntry[]) : [];
  } catch {
    return [];
  }
}

function writeAll(entries: JournalEntry[]): void {
  localStorage.setItem(KEY, JSON.stringify(entries));
}

export function getEntries(): JournalEntry[] {
  return readAll().sort((a, b) => b.createdAt - a.createdAt);
}

export function getTombstones(): JournalTombstone[] {
  try {
    const raw = localStorage.getItem(TOMBSTONES_KEY);
    return raw ? (JSON.parse(raw) as JournalTombstone[]) : [];
  } catch { return []; }
}

/** Sync engine writes merged state back; never marks dirty. */
export function replaceAll(entries: JournalEntry[], tombstones: JournalTombstone[]): void {
  writeAll(entries);
  localStorage.setItem(TOMBSTONES_KEY, JSON.stringify(tombstones));
}

export function addEntry(
  input: Omit<JournalEntry, "id" | "createdAt">
): JournalEntry {
  const entry: JournalEntry = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  const all = readAll();
  all.push(entry);
  writeAll(all);
  markJournalDirty();
  return entry;
}

export function deleteEntry(id: string): void {
  writeAll(readAll().filter((e) => e.id !== id));
  const tombs = getTombstones();
  if (!tombs.some((t) => t.id === id)) {
    tombs.push({ id, deletedAt: Date.now() });
    localStorage.setItem(TOMBSTONES_KEY, JSON.stringify(tombs));
  }
  markJournalDirty();
}
