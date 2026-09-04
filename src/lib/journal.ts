// Local-only journal (v0 has no accounts or sync). Persists to localStorage.
import type { JournalEntry } from "./types";

const KEY = "mindfulverse.journal.v1";

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
  return entry;
}

export function deleteEntry(id: string): void {
  writeAll(readAll().filter((e) => e.id !== id));
}
