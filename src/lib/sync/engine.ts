// Local-first sync: pull remote → merge (commutative, from merge.ts) → write
// merged state locally → push the diff. Runs on sign-in, tab focus, reconnect,
// and debounced after local writes. Failures set status and retry on the next
// trigger — they never surface as exceptions to callers.
import { insforge } from "./insforge";
import {
  mergeJournal, mergeProgress, entryToRow, pruneTombstones,
  type RemoteJournalRow,
} from "./merge";
import type { LocalProgress } from "../types";
import { getEntries, getTombstones, replaceAll } from "../journal";
import { getLocalProgress, replaceLocalProgress, clearLocalProgress } from "../progress";
import { isDirty, clearDirty, onDirty } from "../syncFlags";

export type SyncStatus =
  | "idle" | "syncing" | "synced" | "offline" | "error" | "signed-out" | "switched-account";

// --- account ownership of the local store -------------------------------
// localStorage carries no identity of its own. Without a marker, signing out
// as A and in as B would push A's journal into B's account (and pull B's onto
// A's device). We stamp the owning user id on every successful pass and refuse
// to sync when it disagrees, until the user picks a resolution.
const OWNER_KEY = "mindfulverse.sync.owner.v1";

export function getSyncOwner(): string | null {
  try { return localStorage.getItem(OWNER_KEY); } catch { return null; }
}
function setSyncOwner(userId: string): void {
  try { localStorage.setItem(OWNER_KEY, userId); } catch { /* storage full/blocked */ }
}

/** True when this device already holds a *different* account's data. */
export function ownerMismatch(stored: string | null, current: string): boolean {
  return stored != null && stored !== current;
}

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
    case "switched-account":
      return "This device holds another account's journal — open Account to resolve.";
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
// Set when a pass finds nobody signed in. Passive triggers (focus, reconnect)
// skip while it's set so a signed-out user doesn't hammer /auth on every tab
// focus; an explicit syncNow() always clears it and runs.
let knownSignedOut = false;

const PULL_PAGE_SIZE = 1000;
const PUSH_BATCH_SIZE = 100;

/** A row this device already pushed (PK collision) — not a real failure. */
function isDuplicateKey(err: unknown): boolean {
  const e = err as { code?: string | number; statusCode?: number; message?: string } | null;
  const code = String(e?.code ?? "");
  if (code === "23505" || code === "409" || e?.statusCode === 409) return true;
  return /duplicate key|already exists|unique constraint|conflict/i.test(e?.message ?? "");
}

export async function syncNow(): Promise<void> {
  // Cleared before the auth check: an explicit call (sign-in, "Sync now") is
  // always allowed to re-test whether somebody is signed in.
  knownSignedOut = false;
  if (inFlight) return;
  inFlight = true;
  try {
    if (!navigator.onLine) { setStatus("offline"); return; }
    const { data: userData, error: authErr } = await insforge.auth.getCurrentUser();
    const userId = userData?.user?.id;
    // An auth error here is indistinguishable from signed-out (a cold load
    // while logged out can surface as a refresh 401) — both mean "cannot
    // sync as a user".
    if (authErr || !userId) { knownSignedOut = true; setStatus("signed-out"); return; }

    // Another account's data is sitting in localStorage: touch nothing until
    // the user resolves it on /account (resolveOwnerMismatch).
    if (ownerMismatch(getSyncOwner(), userId)) { setStatus("switched-account"); return; }

    setStatus("syncing");

    // --- journal ---
    // Paginate to exhaustion: a fixed .limit() silently truncates a long
    // journal, and a truncated pull would look like "missing remotely" and
    // re-push rows forever.
    const remoteRows: RemoteJournalRow[] = [];
    for (let from = 0; ; from += PULL_PAGE_SIZE) {
      const { data: page, error: pullErr } = await insforge.database
        .from("journal_entries")
        .select("id, prompt, body, context_kind, context_ref, created_at, deleted_at")
        .eq("user_id", userId) // defense in depth; RLS already scopes this
        .order("created_at", { ascending: false })
        .range(from, from + PULL_PAGE_SIZE - 1);
      if (pullErr) { setStatus("error"); return; }
      const rows = (page ?? []) as RemoteJournalRow[];
      remoteRows.push(...rows);
      if (rows.length < PULL_PAGE_SIZE) break;
    }
    const merged = mergeJournal(getEntries(), getTombstones(), remoteRows);
    replaceAll(merged.entries, merged.tombstones);

    let pushFailed = false;
    const toInsert = merged.toInsert.map(entryToRow);
    for (let i = 0; i < toInsert.length; i += PUSH_BATCH_SIZE) {
      const batch = toInsert.slice(i, i + PUSH_BATCH_SIZE);
      const { error } = await insforge.database.from("journal_entries").insert(batch);
      if (!error) continue;
      // One bad row must not sink the batch: retry row-by-row and treat
      // duplicate-key failures as "already synced".
      for (const row of batch) {
        const { error: rowErr } = await insforge.database.from("journal_entries").insert([row]);
        if (rowErr && !isDuplicateKey(rowErr)) pushFailed = true;
      }
    }
    for (const id of merged.toDelete) {
      const tomb = merged.tombstones.find((t) => t.id === id);
      const { error } = await insforge.database
        .from("journal_entries")
        .update({ deleted_at: tomb?.deletedAt ?? Date.now() })
        .eq("id", id);
      if (error) pushFailed = true;
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

    if (pushFailed) { setStatus("error"); return; }

    // The pull above was exhaustive, so "absent remotely" is trustworthy:
    // retire tombstones older than the TTL whose deletion is confirmed.
    const keptTombstones = pruneTombstones(merged.tombstones, remoteRows, {
      now: Date.now(), fullPull: true,
    });
    if (keptTombstones.length !== merged.tombstones.length) {
      replaceAll(getEntries(), keptTombstones);
    }

    setSyncOwner(userId);
    clearDirty();
    setStatus("synced");
  } catch {
    setStatus(navigator.onLine ? "error" : "offline");
  } finally {
    inFlight = false;
  }
}

/**
 * Resolve a "switched-account" standoff, then sync normally.
 * - "merge": adopt whatever is on this device into the account now signed in.
 * - "fresh": wipe this device's journal, tombstones and progress first, so the
 *   new account starts from its own server state only.
 */
export async function resolveOwnerMismatch(choice: "merge" | "fresh"): Promise<void> {
  const { data, error } = await insforge.auth.getCurrentUser();
  const userId = data?.user?.id;
  if (error || !userId) { knownSignedOut = true; setStatus("signed-out"); return; }
  if (choice === "fresh") {
    replaceAll([], []);
    clearLocalProgress();
  }
  setSyncOwner(userId);
  clearDirty();
  await syncNow();
}

const debouncedSync = makeDebounced(() => void syncNow(), 3000);

export function initSync(): void {
  onDirty(debouncedSync);
  window.addEventListener("online", () => { if (!knownSignedOut) void syncNow(); });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !knownSignedOut) void syncNow();
  });
  if (isDirty()) debouncedSync();
  void syncNow(); // covers the sign-in-then-reload case
}
