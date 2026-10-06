import { describe, expect, it } from "vitest";
import {
  ABOUT_COLLAPSED_PARAGRAPHS,
  EMPTY_DRAFT,
  commentaryToggleLabel,
  composeReflection,
  coveringFromIndex,
  deepLinkPhase,
  hasText,
  infoBlocks,
  parseSurahParam,
  resumeAyahFor,
  splitParagraphs,
  verseCount,
  verseShareText,
} from "./logic";

describe("coveringFromIndex", () => {
  const idx = [1, 4, 8];
  it("finds the entry at or before the ayah", () => {
    expect(coveringFromIndex(idx, 1)).toBe(1);
    expect(coveringFromIndex(idx, 3)).toBe(1);
    expect(coveringFromIndex(idx, 4)).toBe(4);
    expect(coveringFromIndex(idx, 200)).toBe(8);
  });
  it("is null before the first entry or with no index", () => {
    expect(coveringFromIndex([5], 2)).toBeNull();
    expect(coveringFromIndex([], 2)).toBeNull();
  });
});

describe("deepLinkPhase (?v=)", () => {
  it("maps a valid verse to its 0-based phase", () => {
    expect(deepLinkPhase("1", 7)).toBe(0);
    expect(deepLinkPhase("7", 7)).toBe(6);
    expect(deepLinkPhase(["3", "5"], 7)).toBe(2);
  });
  it("ignores absent, empty, out-of-range and non-integer values", () => {
    expect(deepLinkPhase(undefined, 7)).toBeNull();
    expect(deepLinkPhase("", 7)).toBeNull();
    expect(deepLinkPhase("0", 7)).toBeNull();
    expect(deepLinkPhase("8", 7)).toBeNull();
    expect(deepLinkPhase("2.5", 7)).toBeNull();
    expect(deepLinkPhase("abc", 7)).toBeNull();
    expect(deepLinkPhase("3", 0)).toBeNull();
  });
});

describe("parseSurahParam", () => {
  it("accepts 1..114 only", () => {
    expect(parseSurahParam("1")).toBe(1);
    expect(parseSurahParam("114")).toBe(114);
    expect(parseSurahParam("0")).toBeNull();
    expect(parseSurahParam("115")).toBeNull();
    expect(parseSurahParam("x")).toBeNull();
    expect(parseSurahParam(undefined)).toBeNull();
  });
});

describe("resumeAyahFor", () => {
  it("offers a saved point inside the surah", () => {
    expect(resumeAyahFor({ ayah: 3 }, 7)).toBe(3);
    expect(resumeAyahFor({ ayah: 8 }, 7)).toBeNull();
    expect(resumeAyahFor({ ayah: 0 }, 7)).toBeNull();
    expect(resumeAyahFor(undefined, 7)).toBeNull();
  });
});

describe("reflection drafts", () => {
  it("hasText ignores whitespace", () => {
    expect(hasText(EMPTY_DRAFT)).toBe(false);
    expect(hasText({ lessons: "  ", stirs: "\n", action: "" })).toBe(false);
    expect(hasText({ lessons: "", stirs: "", action: "x" })).toBe(true);
    expect(hasText(undefined)).toBe(false);
  });
  it("composes web's journal entry shape", () => {
    expect(composeReflection("2:255", { lessons: " a ", stirs: "", action: "c" })).toEqual({
      prompt: "Tadabbur on 2:255",
      body: "Lessons: a\n\nAction: c",
      context: { kind: "tadabbur", ref: "2:255" },
    });
    expect(composeReflection("2:255", EMPTY_DRAFT)).toBeNull();
  });
});

describe("text helpers", () => {
  it("splits paragraphs", () => {
    expect(splitParagraphs(" a \n\n\n\nb\n\n")).toEqual(["a", "b"]);
    expect(splitParagraphs(null)).toEqual([]);
  });
  it("collapses the About text and spots subheadings", () => {
    const paras = Array.from({ length: 7 }, (_, i) => `Paragraph ${i}.`);
    const text = ["Its Virtues", ...paras].join("\n\n");
    const collapsed = infoBlocks(text, false);
    expect(collapsed.blocks).toHaveLength(ABOUT_COLLAPSED_PARAGRAPHS);
    expect(collapsed.blocks[0]).toEqual({ kind: "heading", text: "Its Virtues" });
    expect(collapsed.blocks[1].kind).toBe("paragraph");
    expect(collapsed.truncated).toBe(true);
    const expanded = infoBlocks(text, true);
    expect(expanded.blocks).toHaveLength(8);
    expect(expanded.truncated).toBe(false);
  });
  it("labels counts and the commentary toggle", () => {
    expect(verseCount(1)).toBe("1 verse");
    expect(verseCount(7)).toBe("7 verses");
    expect(commentaryToggleLabel(true, 3, 1)).toBe("Hide the commentary");
    expect(commentaryToggleLabel(false, 3, 3)).toBe("Read the commentary");
    expect(commentaryToggleLabel(false, 3, 1)).toBe("Read the commentary (with verse 1)");
  });
  it("shares the same text as web", () => {
    expect(verseShareText({ arabic: "ع", translation: "T", surah: 1, ayah: 2 })).toBe(
      "ع\n\n“T”\n\n— Qur’an 1:2\n\nvia MindfulVerse",
    );
  });
});
