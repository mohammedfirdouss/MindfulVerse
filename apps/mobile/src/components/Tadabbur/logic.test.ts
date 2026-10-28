import { describe, expect, it } from "vitest";

import {
  ABOUT_COLLAPSED_PARAGRAPHS,
  aboutExcerpt,
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
  loadTadabburDrafts,
  parseTadabburDrafts,
  QUESTIONS,
  questionStepLabel,
  saveTadabburDraft,
  tadabburDraftKey,
} from "./logic";

describe(coveringFromIndex, () => {
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

describe(parseSurahParam, () => {
  it("accepts 1..114 only", () => {
    expect(parseSurahParam("1")).toBe(1);
    expect(parseSurahParam("114")).toBe(114);
    expect(parseSurahParam("0")).toBeNull();
    expect(parseSurahParam("115")).toBeNull();
    expect(parseSurahParam("x")).toBeNull();
    expect(parseSurahParam(undefined)).toBeNull();
  });
});

describe(resumeAyahFor, () => {
  it("offers a saved point inside the surah", () => {
    expect(resumeAyahFor({ ayah: 3 }, 7)).toBe(3);
    expect(resumeAyahFor({ ayah: 8 }, 7)).toBeNull();
    expect(resumeAyahFor({ ayah: 0 }, 7)).toBeNull();
    expect(resumeAyahFor(undefined, 7)).toBeNull();
  });
});

describe("reflection drafts", () => {
  it("hasText ignores whitespace", () => {
    expect(hasText(EMPTY_DRAFT)).toBeFalsy();
    expect(hasText({ action: "", lessons: "  ", stirs: "\n" })).toBeFalsy();
    expect(hasText({ action: "x", lessons: "", stirs: "" })).toBeTruthy();
    expect(hasText(undefined)).toBeFalsy();
  });

  it("composes web's journal entry shape", () => {
    expect(
      composeReflection("2:255", { action: "c", lessons: " a ", stirs: "" })
    ).toStrictEqual({
      body: "Lessons: a\n\nAction: c",
      context: { kind: "tadabbur", ref: "2:255" },
      prompt: "Tadabbur on 2:255",
    });
    expect(composeReflection("2:255", EMPTY_DRAFT)).toBeNull();
  });
});

describe("text helpers", () => {
  it("splits paragraphs", () => {
    expect(splitParagraphs(" a \n\n\n\nb\n\n")).toStrictEqual(["a", "b"]);
    expect(splitParagraphs(null)).toStrictEqual([]);
  });

  it("collapses the About text and spots subheadings", () => {
    const paras = Array.from({ length: 7 }, (_, i) => `Paragraph ${i}.`);
    const text = ["Its Virtues", ...paras].join("\n\n");
    const collapsed = infoBlocks(text, false);
    expect(collapsed.blocks).toHaveLength(ABOUT_COLLAPSED_PARAGRAPHS);
    expect(collapsed.blocks[0]).toStrictEqual({
      kind: "heading",
      text: "Its Virtues",
    });
    expect(collapsed.blocks[1].kind).toBe("paragraph");
    expect(collapsed.truncated).toBeTruthy();
    const expanded = infoBlocks(text, true);
    expect(expanded.blocks).toHaveLength(8);
    expect(expanded.truncated).toBeFalsy();
  });

  it("labels counts and the commentary toggle", () => {
    expect(verseCount(1)).toBe("1 verse");
    expect(verseCount(7)).toBe("7 verses");
    expect(commentaryToggleLabel(true, 3, 1)).toBe("Hide the commentary");
    expect(commentaryToggleLabel(false, 3, 3)).toBe("Read the commentary");
    expect(commentaryToggleLabel(false, 3, 1)).toBe(
      "Read the commentary (with verse 1)"
    );
  });
});

describe(aboutExcerpt, () => {
  const h = (text: string) => ({ kind: "heading" as const, text });
  const p = (text: string) => ({ kind: "paragraph" as const, text });

  it("shows the opening subheading and its paragraph", () => {
    expect(
      aboutExcerpt([h("Name"), p("Short."), h("Theme"), p("More.")])
    ).toStrictEqual({ clamp: false, count: 2, more: true });
  });

  it("keeps stacked subheadings with their paragraph", () => {
    expect(
      aboutExcerpt([h("Name"), h("Why the name?"), p("Because."), h("Theme")])
    ).toStrictEqual({ clamp: false, count: 3, more: true });
  });

  it("shows just the first paragraph when there is no subheading", () => {
    expect(aboutExcerpt([p("One."), p("Two.")])).toStrictEqual({
      clamp: false,
      count: 1,
      more: true,
    });
  });

  it("clamps a long opening paragraph and offers more", () => {
    expect(aboutExcerpt([h("Name"), p("x.".repeat(150))])).toStrictEqual({
      clamp: true,
      count: 2,
      more: true,
    });
  });

  it("offers nothing more when the whole text fits", () => {
    expect(aboutExcerpt([p("Only.")])).toStrictEqual({
      clamp: false,
      count: 1,
      more: false,
    });
    expect(aboutExcerpt([])).toStrictEqual({ clamp: false, count: 0, more: false });
  });
});

describe("tadabbur drafts", () => {
  function memStore() {
    const m = new Map<string, string>();
    return {
      getItem: (k: string) => m.get(k) ?? null,
      m,
      removeItem: (k: string) => void m.delete(k),
      setItem: (k: string, v: string) => void m.set(k, v),
    };
  }
  const d = { action: "call mum", lessons: "patience", stirs: "" };

  it("keys drafts per surah", () => {
    expect(tadabburDraftKey(1)).toBe("mindfulverse.tadabburDrafts.v1:1");
  });

  it("round-trips a verse's draft", () => {
    const s = memStore();
    saveTadabburDraft(1, "1:2", d, s);
    expect(loadTadabburDrafts(1, s)).toStrictEqual({ "1:2": d });
    expect(loadTadabburDrafts(2, s)).toStrictEqual({});
  });

  it("keeps other verses when one changes", () => {
    const s = memStore();
    saveTadabburDraft(1, "1:1", d, s);
    saveTadabburDraft(1, "1:2", { ...EMPTY_DRAFT, stirs: "mercy" }, s);
    expect(Object.keys(loadTadabburDrafts(1, s))).toStrictEqual(["1:1", "1:2"]);
  });

  it("clears an emptied draft, and the key when none remain", () => {
    const s = memStore();
    saveTadabburDraft(1, "1:1", d, s);
    saveTadabburDraft(1, "1:1", EMPTY_DRAFT, s);
    expect(s.m.has(tadabburDraftKey(1))).toBeFalsy();
  });

  it("ignores corrupt or malformed storage", () => {
    expect(parseTadabburDrafts("{nope")).toStrictEqual({});
    expect(parseTadabburDrafts("[1]")).toStrictEqual({});
    expect(parseTadabburDrafts(null)).toStrictEqual({});
    expect(
      parseTadabburDrafts(
        JSON.stringify({
          "1:1": { lessons: 3, stirs: "x" },
          "1:2": "s",
          "1:3": {},
        })
      )
    ).toStrictEqual({
      "1:1": { action: "", lessons: "", stirs: "x" },
    });
  });

  it("never throws when storage does", () => {
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
    expect(loadTadabburDrafts(1, null)).toStrictEqual({});
  });
});

describe(questionStepLabel, () => {
  it("names the step for screen readers", () => {
    expect(QUESTIONS).toHaveLength(3);
    expect(questionStepLabel(0)).toBe("Question 1 of 3");
    expect(questionStepLabel(2)).toBe("Question 3 of 3");
  });
});
