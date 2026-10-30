import type { SurahJournal } from "@mindfulverse/core/surahJournal";
import type { JournalEntry } from "@mindfulverse/core/types";
import { describe, expect, it } from "vitest";

import { surahJournalSections } from "./surahJournalExport";

const entry = (
  id: string,
  kind: NonNullable<JournalEntry["context"]>["kind"],
  ref: string,
  createdAt = 1000
): JournalEntry => ({
  body: `body ${id}`,
  context: { kind, ref },
  createdAt,
  id,
  prompt: `prompt ${id}`,
});

const verses = new Map([
  ["94:5", { arabic: "ar5", translation: "tr5" }],
  ["94:6", { arabic: "ar6", translation: "tr6" }],
]);

const full: SurahJournal = {
  also: [entry("c", "checkin", "94:1")],
  intention: entry("i", "intention", "94"),
  isEmpty: false,
  verses: [
    {
      ayah: 5,
      items: [
        {
          entry: entry("t1", "tadabbur", "94:5"),
          followUps: [
            entry("f1", "followup", "t1"),
            entry("f1b", "followup", "t1"),
          ],
          parts: null,
        },
        { entry: entry("t2", "tadabbur", "94:5"), followUps: [], parts: null },
      ],
      verseKey: "94:5",
    },
    {
      ayah: 6,
      items: [
        { entry: entry("t3", "tadabbur", "94:6"), followUps: [], parts: null },
      ],
      verseKey: "94:6",
    },
  ],
};

describe(surahJournalSections, () => {
  it("orders intention, verse by verse, then also written on", () => {
    const sections = surahJournalSections(full, "Ash-Sharh", verses);
    expect(sections.map((s) => s.title)).toStrictEqual([
      "My intention",
      "Verse by verse",
      "Also written on Ash-Sharh",
    ]);
  });

  it("puts a follow-up right after its entry", () => {
    const [, verseSection] = surahJournalSections(full, "Ash-Sharh", verses);
    expect(verseSection.items.map((i) => i.entry.id)).toStrictEqual([
      "t1",
      "f1",
      "f1b",
      "t2",
      "t3",
    ]);
  });

  it("labels verse items with the bare ref and verse text", () => {
    const [, verseSection] = surahJournalSections(full, "Ash-Sharh", verses);
    expect(verseSection.items[0]).toMatchObject({
      arabic: "ar5",
      translation: "tr5",
      verseLabel: "94:5",
    });
    expect(verseSection.items[1].verseLabel).toBeUndefined();
    expect(verseSection.items[4].verseLabel).toBe("94:6");
  });

  it("gives verse text only to the first item of each verse", () => {
    const [, verseSection] = surahJournalSections(full, "Ash-Sharh", verses);
    const t2 = verseSection.items.find((i) => i.entry.id === "t2");
    expect(t2?.verseLabel).toBe("94:5");
    expect(t2?.arabic).toBeUndefined();
    expect(t2?.translation).toBeUndefined();
    const t3 = verseSection.items.find((i) => i.entry.id === "t3");
    expect(t3?.arabic).toBe("ar6");
  });

  it("omits empty parts", () => {
    const sections = surahJournalSections(
      { ...full, also: [], intention: null },
      "Ash-Sharh",
      verses
    );
    expect(sections.map((s) => s.title)).toStrictEqual(["Verse by verse"]);
    expect(
      surahJournalSections(
        { also: [], intention: null, isEmpty: true, verses: [] },
        "Ash-Sharh",
        verses
      )
    ).toStrictEqual([]);
  });
});
