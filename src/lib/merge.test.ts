import { describe, it, expect } from "vitest";
import {
  mergeJournal, mergeProgress, rowToEntry, entryToRow,
  type RemoteJournalRow, type LocalProgress,
} from "./merge";
import type { JournalEntry } from "./types";

const e = (id: string, createdAt: number): JournalEntry =>
  ({ id, createdAt, prompt: "p", body: "b", context: { kind: "free" } });
const r = (id: string, created_at: number, deleted_at: number | null = null): RemoteJournalRow =>
  ({ id, prompt: "p", body: "b", context_kind: "free", context_ref: null, created_at, deleted_at });

describe("mergeJournal", () => {
  it("unions local-only and remote-only entries", () => {
    const res = mergeJournal([e("a", 1)], [], [r("b", 2)]);
    expect(res.entries.map((x) => x.id)).toEqual(["b", "a"]); // newest first
    expect(res.toInsert.map((x) => x.id)).toEqual(["a"]);
    expect(res.toDelete).toEqual([]);
  });
  it("is idempotent when states match", () => {
    const res = mergeJournal([e("a", 1)], [], [r("a", 1)]);
    expect(res.entries).toHaveLength(1);
    expect(res.toInsert).toEqual([]);
    expect(res.toDelete).toEqual([]);
  });
  it("remote soft-delete removes local entry and keeps a tombstone", () => {
    const res = mergeJournal([e("a", 1)], [], [r("a", 1, 99)]);
    expect(res.entries).toEqual([]);
    expect(res.tombstones).toEqual([{ id: "a", deletedAt: 99 }]);
    expect(res.toDelete).toEqual([]);
  });
  it("local tombstone schedules remote soft-delete and never resurrects", () => {
    const res = mergeJournal([], [{ id: "a", deletedAt: 5 }], [r("a", 1)]);
    expect(res.entries).toEqual([]);
    expect(res.toDelete).toEqual(["a"]);
  });
  it("tombstone for an already-deleted remote row pushes nothing", () => {
    const res = mergeJournal([], [{ id: "a", deletedAt: 5 }], [r("a", 1, 5)]);
    expect(res.toDelete).toEqual([]);
  });
});

describe("mergeProgress", () => {
  const base: LocalProgress = {
    visits: ["2026-09-14"],
    sessionProgress: { s1: { step: 2 } },
    surahTadabbur: { "2": { ayah: 10, updatedAt: 100 } },
    lastRead: { surah: 2, ayah: 5, at: 100 },
  };
  it("returns local when remote is null", () => {
    expect(mergeProgress(base, null)).toEqual(base);
  });
  it("unions visits, sorted, capped at 366", () => {
    const remote = { ...base, visits: ["2026-09-13", "2026-09-14"] };
    expect(mergeProgress(base, remote).visits).toEqual(["2026-09-13", "2026-09-14"]);
    const many = Array.from({ length: 400 }, (_, i) =>
      new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10));
    expect(mergeProgress({ ...base, visits: many }, remote).visits).toHaveLength(366);
  });
  it("takes max step per session; earliest completedAt wins", () => {
    const remote = { ...base, sessionProgress: { s1: { step: 5, completedAt: 50 }, s2: { step: 1 } } };
    const m = mergeProgress({ ...base, sessionProgress: { s1: { step: 2, completedAt: 80 } } }, remote);
    expect(m.sessionProgress).toEqual({ s1: { step: 5, completedAt: 50 }, s2: { step: 1 } });
  });
  it("takes max ayah per surah and latest lastRead", () => {
    const remote = { ...base,
      surahTadabbur: { "2": { ayah: 20, updatedAt: 90 }, "3": { ayah: 1, updatedAt: 1 } },
      lastRead: { surah: 4, ayah: 1, at: 200 } };
    const m = mergeProgress(base, remote);
    expect(m.surahTadabbur["2"]).toEqual({ ayah: 20, updatedAt: 90 });
    expect(m.surahTadabbur["3"]).toEqual({ ayah: 1, updatedAt: 1 });
    expect(m.lastRead).toEqual({ surah: 4, ayah: 1, at: 200 });
  });
});

describe("row mapping", () => {
  it("round-trips entry -> row -> entry", () => {
    const entry: JournalEntry = { id: "x", createdAt: 7, prompt: "q", body: "t",
      context: { kind: "session", ref: "patience" } };
    expect(rowToEntry({ ...entryToRow(entry), deleted_at: null })).toEqual(entry);
  });
  it("omits context when kind is null", () => {
    expect(rowToEntry(r("a", 1)).context).toEqual({ kind: "free" });
    const noCtx = { ...r("a", 1), context_kind: null };
    expect(rowToEntry(noCtx).context).toBeUndefined();
  });
});
