import { EMPTY_REFLECTION } from "@mindfulverse/core/reflectionPrompts";
import { describe, expect, it } from "vitest";

import {
  loadTadabburDrafts,
  parseTadabburDrafts,
  saveTadabburDraft,
  tadabburDraftKey,
  toggleFeeling,
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
const empty = EMPTY_REFLECTION;
const d = {
  ...empty,
  action: "call mum",
  feelings: ["Hopeful", "Moved"],
  takeaway: "patience",
};

describe("tadabbur drafts (web)", () => {
  it("uses the same per-surah key as mobile", () => {
    expect(tadabburDraftKey(2)).toBe("mindfulverse.tadabburDrafts.v1:2");
  });

  it("round-trips and keeps other verses", () => {
    const s = memStore();
    saveTadabburDraft(1, "1:1", d, s);
    saveTadabburDraft(1, "1:2", { ...empty, reminder: "mercy" }, s);
    expect(loadTadabburDrafts(1, s)).toStrictEqual({
      "1:1": d,
      "1:2": { ...empty, reminder: "mercy" },
    });
    expect(loadTadabburDrafts(2, s)).toStrictEqual({});
  });

  it("keeps a feelings-only draft", () => {
    const s = memStore();
    saveTadabburDraft(1, "1:1", { ...empty, feelings: ["Grateful"] }, s);
    expect(loadTadabburDrafts(1, s)["1:1"]?.feelings).toStrictEqual([
      "Grateful",
    ]);
  });

  it("clears an emptied draft and the key when none remain", () => {
    const s = memStore();
    saveTadabburDraft(1, "1:1", d, s);
    saveTadabburDraft(1, "1:1", empty, s);
    expect(s.m.size).toBe(0);
  });

  it("resumes an old { lessons, stirs, action } draft in the new shape", () => {
    const s = memStore();
    s.setItem(
      tadabburDraftKey(90),
      JSON.stringify({ "90:3": { action: "c", lessons: "a", stirs: "b" } })
    );
    expect(loadTadabburDrafts(90, s)).toStrictEqual({
      "90:3": { ...empty, action: "c", reminder: "b", takeaway: "a" },
    });
  });

  it("survives corrupt data and throwing storage", () => {
    expect(parseTadabburDrafts("{bad")).toStrictEqual({});
    expect(
      parseTadabburDrafts(
        JSON.stringify({ "1:1": { lessons: 1, stirs: "x" }, "1:2": 5 })
      )
    ).toStrictEqual({
      "1:1": { ...empty, reminder: "x" },
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

describe(toggleFeeling, () => {
  it("adds in display order, removes, and stops at three", () => {
    expect(toggleFeeling(["Moved"], "Peaceful")).toStrictEqual([
      "Peaceful",
      "Moved",
    ]);
    expect(toggleFeeling(["Peaceful", "Moved"], "Peaceful")).toStrictEqual([
      "Moved",
    ]);
    const three = ["Peaceful", "Hopeful", "Grateful"];
    expect(toggleFeeling(three, "Afraid")).toStrictEqual(three);
    expect(toggleFeeling(three, "Hopeful")).toStrictEqual([
      "Peaceful",
      "Grateful",
    ]);
  });
});
