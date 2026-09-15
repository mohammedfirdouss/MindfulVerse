// Local-first sync: pull remote → merge (commutative, from merge.ts) → write
// merged state locally → push the diff. Runs on sign-in, tab focus, reconnect,
// and debounced after local writes. Failures set status and retry on the next
// trigger — they never surface as exceptions to callers.
import { insforge } from "./insforge";
import {
  mergeJournal, mergeProgress, entryToRow,
  type RemoteJournalRow, type LocalProgress,
} from "./merge";
import { getEntries, getTombstones, replaceAll } from "./journal";
import { getLocalProgress, replaceLocalProgress } from "./progress";
import { isDirty, clearDirty, onDirty } from "./syncFlags";

export type SyncStatus = "idle" | "syncing" | "synced" | "offline" | "error" | "signed-out";

let status: SyncStatus = "idle";
const listeners = new Set<(s: SyncStatus) => void>();
function setStatus(s: SyncStatus): void {
  status = s;
  listeners.forEach((cb) => cb(s));
}
export function getSyncStatus(): SyncStatus { return status; }
export function onSyncStatus(cb: (s: SyncStatus) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Shared wording for sync status, used on both the Account and Journal/Stats pages. */
export function statusLabel(s: SyncStatus): string {
  switch (s) {
    case "synced":
      return "Backed up ✓";
    case "syncing":
      return "Backing up…";
    case "offline":
      return "Offline — will sync when you're back";
    case "error":
      return "Backup hit a snag — will retry";
    default:
      return "";
  }
}

export function makeDebounced(fn: () => void, ms: number): () => void {
  let t: ReturnType<typeof setTimeout> | undefined;
  return () => {
    clearTimeout(t);
    t = setTimeout(fn, ms);
  };
}

let inFlight = false;

export async function syncNow(): Promise<void> {
  if (inFlight) return;
  inFlight = true;
  try {
    if (!navigator.onLine) { setStatus("offline"); return; }
    const { data: userData, error: authErr } = await insforge.auth.getCurrentUser();
    const userId = userData?.user?.id;
    // An auth error here is indistinguishable from signed-out (a cold load
    // while logged out can surface as a refresh 401) — both mean "cannot
    // sync as a user".
    if (authErr || !userId) { setStatus("signed-out"); return; }
    setStatus("syncing");

    // --- journal ---
    const { data: remoteRows, error: pullErr } = await insforge.database
      .from("journal_entries")
      .select("id, prompt, body, context_kind, context_ref, created_at, deleted_at")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (pullErr) { setStatus("error"); return; }
    const merged = mergeJournal(getEntries(), getTombstones(), (remoteRows ?? []) as RemoteJournalRow[]);
    replaceAll(merged.entries, merged.tombstones);
    if (merged.toInsert.length > 0) {
      const { error } = await insforge.database
        .from("journal_entries")
        .insert(merged.toInsert.map(entryToRow));
      if (error) { setStatus("error"); return; }
    }
    for (const id of merged.toDelete) {
      const tomb = merged.tombstones.find((t) => t.id === id);
      const { error } = await insforge.database
        .from("journal_entries")
        .update({ deleted_at: tomb?.deletedAt ?? Date.now() })
        .eq("id", id);
      if (error) { setStatus("error"); return; }
    }

    // --- progress ---
    const { data: remoteProgress, error: progErr } = await insforge.database
      .from("progress")
      .select("visits, session_progress, surah_tadabbur, last_read")
      .eq("user_id", userId)
      .maybeSingle();
    if (progErr) { setStatus("error"); return; }
    const remoteLp: LocalProgress | null = remoteProgress
      ? {
          visits: remoteProgress.visits ?? [],
          sessionProgress: remoteProgress.session_progress ?? {},
          surahTadabbur: remoteProgress.surah_tadabbur ?? {},
          lastRead: remoteProgress.last_read ?? null,
        }
      : null;
    const mergedProgress = mergeProgress(getLocalProgress(), remoteLp);
    replaceLocalProgress(mergedProgress);
    const row = {
      visits: mergedProgress.visits,
      session_progress: mergedProgress.sessionProgress,
      surah_tadabbur: mergedProgress.surahTadabbur,
      last_read: mergedProgress.lastRead,
    };
    if (remoteProgress) {
      const { error } = await insforge.database.from("progress").update(row).eq("user_id", userId);
      if (error) { setStatus("error"); return; }
    } else {
      const { error } = await insforge.database.from("progress").insert([row]);
      if (error) { setStatus("error"); return; }
    }

    clearDirty();
    setStatus("synced");
  } catch {
    setStatus(navigator.onLine ? "error" : "offline");
  } finally {
    inFlight = false;
  }
}

const debouncedSync = makeDebounced(() => void syncNow(), 3000);

export function initSync(): void {
  onDirty(debouncedSync);
  window.addEventListener("online", () => void syncNow());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void syncNow();
  });
  if (isDirty()) debouncedSync();
  void syncNow(); // covers the sign-in-then-reload case
}
