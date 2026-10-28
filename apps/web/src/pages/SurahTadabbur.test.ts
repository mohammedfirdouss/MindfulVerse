import { describe, expect, it } from "vitest";

import {
  loadTadabburDrafts,
  parseTadabburDrafts,
  saveTadabburDraft,
  tadabburDraftKey,
} from "./SurahTadabbur";

function memStore() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    m,
    removeItem: (k: string) => void m.delete(k),
    setItem: (k: string, v: string) => void m.set(k, v),
  };
}
const empty = { action: "", lessons: "", stirs: "" };
const d = { action: "call mum", lessons: "patience", stirs: "" };

describe("tadabbur drafts (web)", () => {
  it("uses the same per-surah key as mobile", () => {
    expect(tadabburDraftKey(2)).toBe("mindfulverse.tadabburDrafts.v1:2");
  });

  it("round-trips and keeps other verses", () => {
    const s = memStore();
    saveTadabburDraft(1, "1:1", d, s);
    saveTadabburDraft(1, "1:2", { ...empty, stirs: "mercy" }, s);
    expect(loadTadabburDrafts(1, s)).toStrictEqual({
      "1:1": d,
      "1:2": { ...empty, stirs: "mercy" },
    });
    expect(loadTadabburDrafts(2, s)).toStrictEqual({});
  });

  it("clears an emptied draft and the key when none remain", () => {
    const s = memStore();
    saveTadabburDraft(1, "1:1", d, s);
    saveTadabburDraft(1, "1:1", empty, s);
    expect(s.m.size).toBe(0);
  });

  it("survives corrupt data and throwing storage", () => {
    expect(parseTadabburDrafts("{bad")).toStrictEqual({});
    expect(
      parseTadabburDrafts(JSON.stringify({ "1:1": { lessons: 1, stirs: "x" } }))
    ).toStrictEqual({
      "1:1": { ...empty, stirs: "x" },
    });
    const bad = {
      getItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {},
      setItem: () => {
        throw new Error("full");
      },
    };
    expect(loadTadabburDrafts(1, bad)).toStrictEqual({});
    expect(() => saveTadabburDraft(1, "1:1", d, bad)).not.toThrow();
  });
});
