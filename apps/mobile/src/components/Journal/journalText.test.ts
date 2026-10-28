import { groupEntries } from "@mindfulverse/core/journalGroups";
import type { JournalEntry } from "@mindfulverse/core/types";
import { describe, expect, it } from "vitest";

// Parity guard: this module is a copy of web's pure formatter.
import * as web from "../../../../web/src/lib/journalExport";
import {
  buildJournalText,
  entryVerseKey,
  exportVerseKeys,
  formatDate,
  groupTitle,
  toSections,
  TRANSLATION_CREDIT,
} from "./journalText";
import type { ExportInput } from "./journalText";

const day = (d: number, h = 9) => new Date(2026, 9, d, h, 30).getTime();

const entries: JournalEntry[] = [
  {
    body: "Ease is near.",
    context: { kind: "checkin", ref: "94:5" },
    createdAt: day(1),
    id: "a",
    prompt: "What stays with you from this verse?",
  },
  {
    body: "On the Throne verse.",
    context: { kind: "tadabbur", ref: "2:255" },
    createdAt: day(3),
    id: "b",
    prompt: "Reflect",
  },
  {
    body: "Free writing.",
    context: { kind: "free" },
    createdAt: day(4),
    id: "c",
    prompt: "",
  },
  {
    body: "From a session.",
    context: { kind: "session", ref: "s1" },
    createdAt: day(5),
    id: "d",
    prompt: "Session prompt",
  },
  {
    body: "Unknown verse text.",
    context: { kind: "checkin", ref: "94:6" },
    createdAt: day(5, 11),
    id: "e",
    prompt: "Again",
  },
];

const surahNames = new Map([
  [94, "Ash-Sharh"],
  [2, "Al-Baqarah"],
]);
const sessionTitles = new Map([["s1", "On patience"]]);
const verses = new Map([
  [
    "94:5",
    {
      arabic: "فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا",
      translation: "So with hardship comes ease.",
    },
  ],
  [
    "2:255",
    {
      arabic: "ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ",
      translation: "God — there is no god except He.",
    },
  ],
]);

function input(exportedAt: Date): ExportInput {
  const groups = groupEntries(entries);
  return {
    exportedAt,
    sections: toSections(
      groups,
      (g) => groupTitle(g, surahNames, sessionTitles),
      surahNames,
      verses
    ),
  };
}

describe("journalText", () => {
  it("titles groups like web", () => {
    const titles = groupEntries(entries).map((g) =>
      groupTitle(g, surahNames, sessionTitles)
    );
    expect(titles).toStrictEqual([
      "Ash-Sharh",
      "On patience",
      "Other reflections",
      "Al-Baqarah",
    ]);
    expect(
      groupTitle(
        { entries: [], key: "surah:7", latest: 0, surah: 7 },
        surahNames,
        sessionTitles
      )
    ).toBe("Surah 7");
  });

  it("finds verse refs only on check-in and tadabbur entries", () => {
    expect(entries.map(entryVerseKey)).toStrictEqual([
      "94:5",
      "2:255",
      null,
      null,
      "94:6",
    ]);
    expect(exportVerseKeys(entries)).toStrictEqual(["94:5", "2:255", "94:6"]);
  });

  it("builds the plain-text export", () => {
    const text = buildJournalText(input(new Date(2026, 9, 9)));
    const lines = text.split("\n");
    expect(lines[0]).toBe("MindfulVerse | Your reflections");
    expect(lines[1]).toMatch(/^5 reflections · .+ – .+$/u);
    expect(lines[2]).toMatch(/^Exported /u);
    expect(text).toContain(
      [
        formatDate(day(1)),
        "94:5",
        "فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا",
        "“So with hardship comes ease.”",
        "What stays with you from this verse?",
        "Ease is near.",
      ].join("\n")
    );
    // Under its own surah heading a verse label is the bare key; a verse with
    // no loaded text still gets its label.
    expect(text).toContain(
      [formatDate(day(5, 11)), "94:6", "Again", "Unknown verse text."].join(
        "\n"
      )
    );
    // An empty prompt is skipped.
    expect(text).toContain([formatDate(day(4)), "Free writing."].join("\n"));
    expect(text.endsWith(`\n\n${TRANSLATION_CREDIT}\n`)).toBeTruthy();
  });

  it("drops the exported line when it repeats the newest entry's day", () => {
    const text = buildJournalText(input(new Date(2026, 9, 5, 20)));
    expect(text).not.toContain("Exported");
  });

  it("matches web's formatter exactly", () => {
    for (const at of [new Date(2026, 9, 9), new Date(2026, 9, 5, 20)]) {
      const groups = groupEntries(entries);
      const title = (g: (typeof groups)[number]) =>
        groupTitle(g, surahNames, sessionTitles);
      const ours = buildJournalText({
        exportedAt: at,
        sections: toSections(groups, title, surahNames, verses),
      });
      const theirs = web.buildJournalText({
        exportedAt: at,
        sections: web.toSections(groups, title, surahNames, verses),
      });
      expect(ours).toBe(theirs);
    }
    expect(
      buildJournalText({ exportedAt: new Date(2026, 9, 9), sections: [] })
    ).toBe(
      web.buildJournalText({ exportedAt: new Date(2026, 9, 9), sections: [] })
    );
  });
});
