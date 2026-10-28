import { describe, it, expect } from "vitest";

import type { JournalEntry, LocalProgress } from "../types";
import {
  mergeJournal,
  mergeProgress,
  rowToEntry,
  entryToRow,
  pruneTombstones,
} from "./merge";
import type { RemoteJournalRow } from "./merge";

const e = (id: string, createdAt: number): JournalEntry => ({
  body: "b",
  context: { kind: "free" },
  createdAt,
  id,
  prompt: "p",
});
const r = (
  id: string,
  created_at: number,
  deleted_at: number | null = null
): RemoteJournalRow => ({
  body: "b",
  context_kind: "free",
  context_ref: null,
  created_at,
  deleted_at,
  id,
  prompt: "p",
});

describe(mergeJournal, () => {
  it("unions local-only and remote-only entries", () => {
    const res = mergeJournal([e("a", 1)], [], [r("b", 2)]);
    expect(res.entries.map((x) => x.id)).toStrictEqual(["b", "a"]); // newest first
    expect(res.toInsert.map((x) => x.id)).toStrictEqual(["a"]);
    expect(res.toDelete).toStrictEqual([]);
  });

  it("is idempotent when states match", () => {
    const res = mergeJournal([e("a", 1)], [], [r("a", 1)]);
    expect(res.entries).toHaveLength(1);
    expect(res.toInsert).toStrictEqual([]);
    expect(res.toDelete).toStrictEqual([]);
  });

  it("remote soft-delete removes local entry and keeps a tombstone", () => {
    const res = mergeJournal([e("a", 1)], [], [r("a", 1, 99)]);
    expect(res.entries).toStrictEqual([]);
    expect(res.tombstones).toStrictEqual([{ deletedAt: 99, id: "a" }]);
    expect(res.toDelete).toStrictEqual([]);
  });

  it("local tombstone schedules remote soft-delete and never resurrects", () => {
    const res = mergeJournal([], [{ deletedAt: 5, id: "a" }], [r("a", 1)]);
    expect(res.entries).toStrictEqual([]);
    expect(res.toDelete).toStrictEqual(["a"]);
  });

  it("tombstone for an already-deleted remote row pushes nothing", () => {
    const res = mergeJournal([], [{ deletedAt: 5, id: "a" }], [r("a", 1, 5)]);
    expect(res.toDelete).toStrictEqual([]);
  });
});

describe(mergeProgress, () => {
  const base: LocalProgress = {
    lastRead: { at: 100, ayah: 5, surah: 2 },
    sessionProgress: { s1: { step: 2 } },
    surahTadabbur: { "2": { ayah: 10, updatedAt: 100 } },
    visits: ["2026-09-14"],
  };

  it("returns local when remote is null", () => {
    expect(mergeProgress(base, null)).toStrictEqual(base);
  });

  it("unions visits, sorted, capped at 366", () => {
    const remote = { ...base, visits: ["2026-09-13", "2026-09-14"] };
    expect(mergeProgress(base, remote).visits).toStrictEqual([
      "2026-09-13",
      "2026-09-14",
    ]);
    const many = Array.from({ length: 400 }, (_, i) =>
      new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10)
    );
    expect(
      mergeProgress({ ...base, visits: many }, remote).visits
    ).toHaveLength(366);
  });

  it("takes max step per session; earliest completedAt wins", () => {
    const remote = {
      ...base,
      sessionProgress: { s1: { completedAt: 50, step: 5 }, s2: { step: 1 } },
    };
    const m = mergeProgress(
      { ...base, sessionProgress: { s1: { completedAt: 80, step: 2 } } },
      remote
    );
    expect(m.sessionProgress).toStrictEqual({
      s1: { completedAt: 50, step: 5 },
      s2: { step: 1 },
    });
  });

  it("takes max ayah per surah and latest lastRead", () => {
    const remote = {
      ...base,
      lastRead: { at: 200, ayah: 1, surah: 4 },
      surahTadabbur: {
        "2": { ayah: 20, updatedAt: 90 },
        "3": { ayah: 1, updatedAt: 1 },
      },
    };
    const m = mergeProgress(base, remote);
    expect(m.surahTadabbur["2"]).toStrictEqual({ ayah: 20, updatedAt: 90 });
    expect(m.surahTadabbur["3"]).toStrictEqual({ ayah: 1, updatedAt: 1 });
    expect(m.lastRead).toStrictEqual({ at: 200, ayah: 1, surah: 4 });
  });
});

describe("row mapping", () => {
  it("round-trips entry -> row -> entry", () => {
    const entry: JournalEntry = {
      body: "t",
      context: { kind: "session", ref: "patience" },
      createdAt: 7,
      id: "x",
      prompt: "q",
    };
    expect(rowToEntry({ ...entryToRow(entry), deleted_at: null })).toStrictEqual(
      entry
    );
  });

  it("omits context when kind is null", () => {
    expect(rowToEntry(r("a", 1)).context).toStrictEqual({ kind: "free" });
    const noCtx = { ...r("a", 1), context_kind: null };
    expect(rowToEntry(noCtx).context).toBeUndefined();
  });
});

describe(pruneTombstones, () => {
  const NOW = 1_000_000_000_000;
  const OLD = NOW - 91 * 24 * 60 * 60 * 1000;
  const RECENT = NOW - 10 * 24 * 60 * 60 * 1000;

  it("keeps tombstones younger than the 90-day TTL, even when confirmed", () => {
    const kept = pruneTombstones(
      [{ deletedAt: RECENT, id: "a" }],
      [r("a", 1, 5)],
      { fullPull: true, now: NOW }
    );
    expect(kept.map((t) => t.id)).toStrictEqual(["a"]);
  });

  it("drops an old tombstone whose remote row carries deleted_at", () => {
    expect(
      pruneTombstones([{ deletedAt: OLD, id: "a" }], [r("a", 1, 5)], {
        fullPull: true,
        now: NOW,
      })
    ).toStrictEqual([]);
  });

  it("drops an old tombstone absent from a full pull", () => {
    expect(
      pruneTombstones([{ deletedAt: OLD, id: "a" }], [r("b", 1)], {
        fullPull: true,
        now: NOW,
      })
    ).toStrictEqual([]);
  });

  it("keeps an old tombstone absent from a PARTIAL pull (unconfirmed)", () => {
    const kept = pruneTombstones([{ deletedAt: OLD, id: "a" }], [r("b", 1)], {
      fullPull: false,
      now: NOW,
    });
    expect(kept.map((t) => t.id)).toStrictEqual(["a"]);
  });

  it("keeps an old tombstone whose remote row is still alive (delete not pushed yet)", () => {
    const kept = pruneTombstones(
      [{ deletedAt: OLD, id: "a" }],
      [r("a", 1, null)],
      { fullPull: true, now: NOW }
    );
    expect(kept.map((t) => t.id)).toStrictEqual(["a"]);
  });
});
