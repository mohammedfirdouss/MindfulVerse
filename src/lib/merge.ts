// Pure merge logic for local-first sync. Every merge is commutative and
// idempotent: journal = union by id with soft-delete tombstones winning;
// progress = per-key max / earliest-completion / latest-read / set-union.
import type { JournalEntry } from "./types";

export interface JournalTombstone { id: string; deletedAt: number }
export interface RemoteJournalRow {
  id: string; prompt: string; body: string;
  context_kind: string | null; context_ref: string | null;
  created_at: number; deleted_at: number | null;
}
export interface JournalMergeResult {
  entries: JournalEntry[];
  tombstones: JournalTombstone[];
  toInsert: JournalEntry[];
  toDelete: string[];
}

export function rowToEntry(row: RemoteJournalRow): JournalEntry {
  const entry: JournalEntry = {
    id: row.id, createdAt: row.created_at, prompt: row.prompt, body: row.body,
  };
  if (row.context_kind) {
    entry.context = {
      kind: row.context_kind as NonNullable<JournalEntry["context"]>["kind"],
      ...(row.context_ref ? { ref: row.context_ref } : {}),
    };
  }
  return entry;
}

export function entryToRow(e: JournalEntry): Omit<RemoteJournalRow, "deleted_at"> {
  return {
    id: e.id, prompt: e.prompt, body: e.body,
    context_kind: e.context?.kind ?? null, context_ref: e.context?.ref ?? null,
    created_at: e.createdAt,
  };
}

export function mergeJournal(
  local: JournalEntry[], tombstones: JournalTombstone[], remote: RemoteJournalRow[]
): JournalMergeResult {
  const dead = new Map(tombstones.map((t) => [t.id, t.deletedAt]));
  for (const row of remote) {
    if (row.deleted_at != null && !dead.has(row.id)) dead.set(row.id, row.deleted_at);
  }
  const merged = new Map<string, JournalEntry>();
  for (const e of local) if (!dead.has(e.id)) merged.set(e.id, e);
  const remoteIds = new Set<string>();
  for (const row of remote) {
    remoteIds.add(row.id);
    if (!dead.has(row.id) && !merged.has(row.id)) merged.set(row.id, rowToEntry(row));
  }
  const remoteDeleted = new Set(remote.filter((r) => r.deleted_at != null).map((r) => r.id));
  return {
    entries: [...merged.values()].sort((a, b) => b.createdAt - a.createdAt),
    tombstones: [...dead].map(([id, deletedAt]) => ({ id, deletedAt })),
    toInsert: local.filter((e) => !dead.has(e.id) && !remoteIds.has(e.id)),
    toDelete: [...dead.keys()].filter((id) => remoteIds.has(id) && !remoteDeleted.has(id)),
  };
}

/** Tombstones are kept this long before they become eligible for pruning. */
export const TOMBSTONE_TTL_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Drop tombstones that have done their job. A tombstone is only dropped when
 * it is older than the TTL AND its deletion is confirmed remotely — either the
 * remote row carries a `deleted_at`, or (only meaningful after a FULL pull)
 * the row is gone from the server entirely. Anything unconfirmed is kept, so a
 * partial/failed pull can never resurrect a deleted entry.
 */
export function pruneTombstones(
  tombstones: JournalTombstone[],
  remote: RemoteJournalRow[],
  opts: { now: number; fullPull: boolean }
): JournalTombstone[] {
  const remoteIds = new Set(remote.map((r) => r.id));
  const remoteDeleted = new Set(remote.filter((r) => r.deleted_at != null).map((r) => r.id));
  return tombstones.filter((t) => {
    if (opts.now - t.deletedAt <= TOMBSTONE_TTL_MS) return true;
    const confirmed = remoteDeleted.has(t.id) || (opts.fullPull && !remoteIds.has(t.id));
    return !confirmed;
  });
}

export interface LocalProgress {
  visits: string[];
  sessionProgress: Record<string, { step: number; completedAt?: number }>;
  surahTadabbur: Record<string, { ayah: number; updatedAt: number }>;
  lastRead: { surah: number; ayah: number; at: number } | null;
}

export function mergeProgress(local: LocalProgress, remote: LocalProgress | null): LocalProgress {
  if (!remote) return local;
  const visits = [...new Set([...local.visits, ...remote.visits])].sort().slice(-366);
  const sessionProgress: LocalProgress["sessionProgress"] = {};
  for (const key of new Set([...Object.keys(local.sessionProgress), ...Object.keys(remote.sessionProgress)])) {
    const a = local.sessionProgress[key], b = remote.sessionProgress[key];
    const completions = [a?.completedAt, b?.completedAt].filter((x): x is number => x != null);
    sessionProgress[key] = {
      step: Math.max(a?.step ?? -1, b?.step ?? -1),
      ...(completions.length ? { completedAt: Math.min(...completions) } : {}),
    };
  }
  const surahTadabbur: LocalProgress["surahTadabbur"] = {};
  for (const key of new Set([...Object.keys(local.surahTadabbur), ...Object.keys(remote.surahTadabbur)])) {
    const a = local.surahTadabbur[key], b = remote.surahTadabbur[key];
    surahTadabbur[key] = !a ? b! : !b ? a : a.ayah >= b.ayah ? a : b;
  }
  const lastRead =
    !local.lastRead ? remote.lastRead :
    !remote.lastRead ? local.lastRead :
    local.lastRead.at >= remote.lastRead.at ? local.lastRead : remote.lastRead;
  return { visits, sessionProgress, surahTadabbur, lastRead };
}
