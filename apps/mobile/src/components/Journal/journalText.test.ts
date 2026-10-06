import { describe, expect, it } from "vitest";
import { groupEntries } from "@mindfulverse/core/journalGroups";
import type { JournalEntry } from "@mindfulverse/core/types";
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
  type ExportInput,
} from "./journalText";

const day = (d: number, h = 9) => new Date(2026, 9, d, h, 30).getTime();

const entries: JournalEntry[] = [
  {
    id: "a",
    createdAt: day(1),
    prompt: "What stays with you from this verse?",
    body: "Ease is near.",
    context: { kind: "checkin", ref: "94:5" },
  },
  {
    id: "b",
    createdAt: day(3),
    prompt: "Reflect",
    body: "On the Throne verse.",
    context: { kind: "tadabbur", ref: "2:255" },
  },
  { id: "c", createdAt: day(4), prompt: "", body: "Free writing.", context: { kind: "free" } },
  {
    id: "d",
    createdAt: day(5),
    prompt: "Session prompt",
    body: "From a session.",
    context: { kind: "session", ref: "s1" },
  },
  {
    id: "e",
    createdAt: day(5, 11),
    prompt: "Again",
    body: "Unknown verse text.",
    context: { kind: "checkin", ref: "94:6" },
  },
];

const surahNames = new Map([
  [94, "Ash-Sharh"],
  [2, "Al-Baqarah"],
]);
const sessionTitles = new Map([["s1", "On patience"]]);
const verses = new Map([
  ["94:5", { arabic: "فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا", translation: "So with hardship comes ease." }],
  ["2:255", { arabic: "ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ", translation: "God — there is no god except He." }],
]);

function input(exportedAt: Date): ExportInput {
  const groups = groupEntries(entries);
  return {
    sections: toSections(groups, (g) => groupTitle(g, surahNames, sessionTitles), surahNames, verses),
    exportedAt,
  };
}

describe("journalText", () => {
  it("titles groups like web", () => {
    const titles = groupEntries(entries).map((g) => groupTitle(g, surahNames, sessionTitles));
    expect(titles).toEqual(["Ash-Sharh", "On patience", "Other reflections", "Al-Baqarah"]);
    expect(groupTitle({ key: "surah:7", surah: 7, entries: [], latest: 0 }, surahNames, sessionTitles)).toBe(
      "Surah 7",
    );
  });

  it("finds verse refs only on check-in and tadabbur entries", () => {
    expect(entries.map(entryVerseKey)).toEqual(["94:5", "2:255", null, null, "94:6"]);
    expect(exportVerseKeys(entries)).toEqual(["94:5", "2:255", "94:6"]);
  });

  it("builds the plain-text export", () => {
    const text = buildJournalText(input(new Date(2026, 9, 9)));
    const lines = text.split("\n");
    expect(lines[0]).toBe("MindfulVerse — Your reflections");
    expect(lines[1]).toMatch(/^5 reflections · .+ – .+$/);
    expect(lines[2]).toMatch(/^Exported /);
    expect(text).toContain(
      [formatDate(day(1)), "94:5", "فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا", "“So with hardship comes ease.”", "What stays with you from this verse?", "Ease is near."].join("\n"),
    );
    // Under its own surah heading a verse label is the bare key; a verse with
    // no loaded text still gets its label.
    expect(text).toContain([formatDate(day(5, 11)), "94:6", "Again", "Unknown verse text."].join("\n"));
    // An empty prompt is skipped.
    expect(text).toContain([formatDate(day(4)), "Free writing."].join("\n"));
    expect(text.endsWith(`\n\n${TRANSLATION_CREDIT}\n`)).toBe(true);
  });

  it("drops the exported line when it repeats the newest entry's day", () => {
    const text = buildJournalText(input(new Date(2026, 9, 5, 20)));
    expect(text).not.toContain("Exported");
  });

  it("matches web's formatter exactly", () => {
    for (const at of [new Date(2026, 9, 9), new Date(2026, 9, 5, 20)]) {
      const groups = groupEntries(entries);
      const title = (g: (typeof groups)[number]) => groupTitle(g, surahNames, sessionTitles);
      const ours = buildJournalText({ sections: toSections(groups, title, surahNames, verses), exportedAt: at });
      const theirs = web.buildJournalText({
        sections: web.toSections(groups, title, surahNames, verses),
        exportedAt: at,
      });
      expect(ours).toBe(theirs);
    }
    expect(buildJournalText({ sections: [], exportedAt: new Date(2026, 9, 9) })).toBe(
      web.buildJournalText({ sections: [], exportedAt: new Date(2026, 9, 9) }),
    );
  });
});
