import { describe, expect, it } from "vitest";

import { surahJournal } from "./surahJournal";
import { formatTadabburBody } from "./tadabburBody";
import type { JournalEntry } from "./types";

type Kind = NonNullable<JournalEntry["context"]>["kind"];

function entry(
  id: string,
  createdAt: number,
  kind: Kind,
  ref?: string,
  body = "text"
): JournalEntry {
  return { id, createdAt, prompt: "p", body, context: { kind, ref } };
}

describe(surahJournal, () => {
  it("newest intention wins", () => {
    const journal = surahJournal(
      [
        entry("a", 1, "intention", "94"),
        entry("b", 3, "intention", "94"),
        entry("c", 9, "intention", "95"),
      ],
      94
    );
    expect(journal.intention?.id).toBe("b");
  });

  it("verses in ayah order, items newest first", () => {
    const journal = surahJournal(
      [
        entry("a", 1, "tadabbur", "94:6"),
        entry("b", 2, "tadabbur", "94:5"),
        entry("c", 3, "tadabbur", "94:5"),
        entry("d", 4, "tadabbur", "95:1"),
      ],
      94
    );
    expect(journal.verses.map((v) => v.verseKey)).toStrictEqual([
      "94:5",
      "94:6",
    ]);
    expect(journal.verses[0]?.ayah).toBe(5);
    expect(journal.verses[0]?.items.map((i) => i.entry.id)).toStrictEqual([
      "c",
      "b",
    ]);
  });

  it("attaches all follow-ups oldest first", () => {
    const journal = surahJournal(
      [
        entry("t", 1, "tadabbur", "94:5"),
        entry("f1", 2, "followup", "t"),
        entry("f2", 3, "followup", "t"),
      ],
      94
    );
    expect(
      journal.verses[0]?.items[0]?.followUps.map((f) => f.id)
    ).toStrictEqual(["f1", "f2"]);
  });

  it("ignores orphan follow-ups", () => {
    const journal = surahJournal([entry("f", 2, "followup", "gone")], 94);
    expect(journal.verses).toStrictEqual([]);
    expect(journal.also).toStrictEqual([]);
    expect(journal.isEmpty).toBeTruthy();
  });

  it("parses the body, and lists an unparseable one with null parts", () => {
    const journal = surahJournal(
      [
        entry(
          "a",
          1,
          "tadabbur",
          "94:5",
          formatTadabburBody({ action: "call mum" })
        ),
        entry("b", 2, "tadabbur", "94:5", "just free text"),
      ],
      94
    );
    const [b, a] = journal.verses[0]?.items ?? [];
    expect(b?.parts).toBeNull();
    expect(a?.parts?.action).toBe("call mum");
    expect(a?.followUps).toStrictEqual([]);
  });

  it("check-ins on this surah go to also, oldest first", () => {
    const journal = surahJournal(
      [
        entry("late", 5, "checkin", "94:2"),
        entry("early", 1, "checkin", "94:8"),
        entry("other", 3, "checkin", "95:1"),
      ],
      94
    );
    expect(journal.also.map((e) => e.id)).toStrictEqual(["early", "late"]);
    expect(journal.isEmpty).toBeFalsy();
  });

  it("isEmpty is true with no intention, verse or also entry", () => {
    expect(surahJournal([], 94).isEmpty).toBeTruthy();
    expect(surahJournal([entry("x", 1, "free")], 94).isEmpty).toBeTruthy();
  });
});
