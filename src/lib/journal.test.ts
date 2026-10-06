// The journal-saved notification across hosts: a browser window (fires) and a
// React Native-style window with no dispatchEvent (must save without throwing).
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
});

import { addEntry, getEntries, JOURNAL_SAVED_EVENT } from "./journal";

beforeEach(() => store.clear());
afterEach(() => void vi.stubGlobal("window", undefined));

describe("addEntry saved notification", () => {
  it("dispatches the saved event on a window that is an EventTarget", () => {
    const target = new EventTarget();
    const seen: string[] = [];
    target.addEventListener(JOURNAL_SAVED_EVENT, (e) => seen.push(e.type));
    vi.stubGlobal("window", target);
    addEntry({ prompt: "p", body: "b" });
    expect(seen).toEqual([JOURNAL_SAVED_EVENT]);
  });

  it("saves without throwing where window has no dispatchEvent (React Native)", () => {
    vi.stubGlobal("window", {});
    const entry = addEntry({ prompt: "p", body: "b" });
    expect(getEntries().map((e) => e.id)).toEqual([entry.id]);
  });
});
