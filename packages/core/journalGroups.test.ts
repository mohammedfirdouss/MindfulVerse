import { describe, it, expect } from "vitest";
import { groupEntries, type JournalGroup } from "./journalGroups";
import type { JournalEntry } from "./types";

function entry(
  id: string,
  createdAt: number,
  context?: JournalEntry["context"]
): JournalEntry {
  return { id, createdAt, prompt: "p", body: "b", context };
}

describe("groupEntries", () => {
  it("clusters verse reflections by surah, sessions by id, the rest under other", () => {
    const groups = groupEntries([
      entry("a", 3, { kind: "checkin", ref: "8:2" }),
      entry("b", 2, { kind: "tadabbur", ref: "8:1" }),
      entry("c", 1, { kind: "session", ref: "hope-1" }),
      entry("d", 4, { kind: "free" }),
    ]);
    expect(groups.map((g: JournalGroup) => g.key)).toEqual([
      "other",
      "surah:8",
      "session:hope-1",
    ]);
    expect(groups.find((g) => g.key === "surah:8")!.surah).toBe(8);
    expect(groups.find((g) => g.key === "session:hope-1")!.sessionId).toBe("hope-1");
  });

  it("orders groups by most recent entry, entries inside oldest first", () => {
    const groups = groupEntries([
      entry("old-solo", 1, { kind: "checkin", ref: "2:5" }),
      entry("mid", 5, { kind: "tadabbur", ref: "8:1" }),
      entry("new", 9, { kind: "tadabbur", ref: "8:3" }),
    ]);
    expect(groups.map((g) => g.key)).toEqual(["surah:8", "surah:2"]);
    expect(groups[0].entries.map((e) => e.id)).toEqual(["mid", "new"]);
  });

  it("treats a malformed or missing ref as unattributed", () => {
    const groups = groupEntries([
      entry("a", 1, { kind: "checkin", ref: "not-a-verse" }),
      entry("b", 2),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe("other");
    expect(groups[0].entries.map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("returns no groups for an empty journal", () => {
    expect(groupEntries([])).toEqual([]);
  });
});
