import { describe, expect, it } from "vitest";
import type { Ayah } from "@mindfulverse/core/types";
import { commentaryLabel, commentaryTitle, coveringFor, parseVerseParam, showsBasmalah, splitParagraphs } from "./commentary";

const a = (surah: number, ayah: number): Ayah => ({
  surah,
  ayah,
  verseKey: `${surah}:${ayah}`,
  arabic: "عربي",
  translation: "Text",
});

describe("commentary helpers (ported from web)", () => {
  const index = { "2": [1, 6, 8] };
  it("finds the passage entry covering a verse", () => {
    expect(coveringFor(index, a(2, 7))).toBe(6);
    expect(coveringFor(index, a(2, 8))).toBe(8);
    expect(coveringFor(index, a(3, 1))).toBeNull();
    expect(coveringFor(null, a(2, 1))).toBeNull();
  });
  it("labels and titles match web copy", () => {
    expect(commentaryLabel(null, a(2, 1))).toBe("Commentary isn’t available right now");
    expect(commentaryLabel(index, a(3, 1))).toBe("No commentary for this verse");
    expect(commentaryLabel(index, a(2, 6))).toBe("Read the commentary");
    expect(commentaryLabel(index, a(2, 7))).toBe("Read the commentary (with verse 6)");
    expect(commentaryTitle(a(2, 6), 6)).toBe("Ibn Kathir · 2:6");
    expect(commentaryTitle(a(2, 7), 6)).toBe("Ibn Kathir · on the passage from 2:6");
  });
  it("splits tafsir into paragraphs", () => {
    expect(splitParagraphs(" one \n\n\n\ntwo")).toEqual(["one", "two"]);
    expect(splitParagraphs(null)).toEqual([]);
  });
  it("basmalah opens every surah but 1 and 9", () => {
    expect([1, 2, 9, 114].map(showsBasmalah)).toEqual([false, true, false, true]);
  });
});

describe("parseVerseParam", () => {
  it("accepts a positive integer within the surah", () => {
    expect(parseVerseParam("255", 286)).toBe(255);
    expect(parseVerseParam(["7"])).toBe(7);
  });
  it("rejects missing, junk and out-of-range values", () => {
    expect(parseVerseParam(undefined)).toBeNull();
    expect(parseVerseParam("")).toBeNull();
    expect(parseVerseParam("abc")).toBeNull();
    expect(parseVerseParam("0")).toBeNull();
    expect(parseVerseParam("2.5")).toBeNull();
    expect(parseVerseParam("300", 286)).toBeNull();
  });
});
