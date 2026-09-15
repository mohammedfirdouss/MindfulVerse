// vitest with jsdom-like localStorage: run in "node" env with a tiny stub.
import { describe, it, expect, beforeEach, vi } from "vitest";

const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
});

import { markJournalDirty, isDirty, clearDirty, onDirty } from "./syncFlags";
import { addEntry, deleteEntry, getEntries, getTombstones, replaceAll } from "./journal";

beforeEach(() => { store.clear(); clearDirty(); });

describe("syncFlags", () => {
  it("starts clean, marks dirty, clears", () => {
    expect(isDirty()).toBe(false);
    markJournalDirty();
    expect(isDirty()).toBe(true);
    clearDirty();
    expect(isDirty()).toBe(false);
  });
  it("notifies the registered listener on mark", () => {
    const cb = vi.fn();
    onDirty(cb);
    markJournalDirty();
    expect(cb).toHaveBeenCalledOnce();
  });
});

describe("journal tombstones", () => {
  it("deleteEntry records a tombstone", () => {
    const e = addEntry({ prompt: "p", body: "b" });
    deleteEntry(e.id);
    expect(getEntries()).toEqual([]);
    expect(getTombstones().map((t) => t.id)).toEqual([e.id]);
  });
  it("replaceAll swaps state without marking dirty", () => {
    clearDirty();
    replaceAll([{ id: "z", createdAt: 1, prompt: "", body: "b" }], []);
    expect(getEntries()).toHaveLength(1);
    expect(isDirty()).toBe(false);
  });
  it("addEntry marks dirty", () => {
    addEntry({ prompt: "p", body: "b" });
    expect(isDirty()).toBe(true);
  });
});
