// Dirty-state bridge between the storage modules (journal/progress) and the
// sync engine — its own module so journal.ts never imports sync.ts (no cycle).
const DIRTY_KEY = "mindfulverse.sync.dirty.v1"; // "1" when a push is pending

let listener: (() => void) | null = null;

export function onDirty(cb: () => void): void { listener = cb; }

function mark(): void {
  try { localStorage.setItem(DIRTY_KEY, "1"); } catch { /* storage full — sync will full-diff anyway */ }
  listener?.();
}
export function markJournalDirty(): void { mark(); }
export function markProgressDirty(): void { mark(); }
export function isDirty(): boolean {
  try { return localStorage.getItem(DIRTY_KEY) === "1"; } catch { return false; }
}
export function clearDirty(): void {
  try { localStorage.removeItem(DIRTY_KEY); } catch { /* ignore */ }
}
