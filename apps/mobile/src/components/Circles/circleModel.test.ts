import { circleError } from "@mindfulverse/core/circles";
import type { Circle } from "@mindfulverse/core/circles";
import type { SurahMeta } from "@mindfulverse/core/types";
import { describe, expect, it, vi } from "vitest";

import {
  checkPortion,
  circleSummary,
  createdLine,
  filterSurahs,
  fittingVerse,
  INVITE_FULL_NOTE,
  inviteMessage,
  inviteUrl,
  joinedHeading,
  nextStep,
  passageOptionLabel,
  portionChoiceLabel,
  portionChoices,
  portionValue,
  PRIVACY_LINE,
  readTogetherLine,
  resolveCircleLink,
} from "./circleModel";
import type { LinkDeps } from "./circleModel";

const surahs = new Map<number, SurahMeta>([
  [1, { ayahCount: 7, name: "Al-Fatihah", number: 1 }],
  [18, { ayahCount: 110, name: "Al-Kahf", number: 18 }],
  [103, { ayahCount: 3, name: "Al-'Asr", number: 103 }],
]);

const circle: Circle = {
  code: "abc234",
  name: "Friday friends",
  surah: 18,
  updatedAt: 1,
  verse: 10,
  verseEnd: null,
};

const passages = [
  { from: 1, theme: "Praise", to: 8 },
  { from: 9, theme: "The cave", to: 26 },
  { from: 27, theme: "Two gardens", to: 27 },
];

function deps(over: Partial<LinkDeps> = {}): LinkDeps {
  return {
    fetch: vi.fn(async () => ({ ok: true as const, value: circle })),
    full: vi.fn(() => false),
    join: vi.fn(() => true),
    leave: vi.fn(),
    setSurah: vi.fn(),
    ...over,
  };
}

describe(inviteUrl, () => {
  it("points at the web circle path", () => {
    expect(inviteUrl("abc234")).toBe(
      "https://mindfulverse.vercel.app/circle/abc234"
    );
  });
});

describe(inviteMessage, () => {
  it("names the circle, surah and focus verse, link last", () => {
    expect(inviteMessage(circle, surahs)).toBe(
      "Read Al-Kahf, from verse 10, with “Friday friends” on MindfulVerse.\nhttps://mindfulverse.vercel.app/circle/abc234"
    );
  });

  it("leaves out the verse when there is none", () => {
    expect(inviteMessage({ ...circle, verse: null }, surahs)).toBe(
      "Read Al-Kahf with “Friday friends” on MindfulVerse.\nhttps://mindfulverse.vercel.app/circle/abc234"
    );
  });
});

describe(circleSummary, () => {
  it("shows the surah and portion", () => {
    expect(circleSummary(circle, surahs)).toBe("Al-Kahf · verse 10");
    expect(circleSummary({ ...circle, verse: 7, verseEnd: 12 }, surahs)).toBe(
      "Al-Kahf · verses 7 to 12"
    );
    expect(circleSummary({ surah: 94, verse: null }, surahs)).toBe("Surah 94");
  });
});

describe("range in the invite", () => {
  it("names the range", () => {
    expect(inviteMessage({ ...circle, verse: 7, verseEnd: 12 }, surahs)).toBe(
      "Read Al-Kahf, verses 7 to 12, with “Friday friends” on MindfulVerse.\nhttps://mindfulverse.vercel.app/circle/abc234"
    );
  });
});

describe("circle copy", () => {
  it("matches the web wording", () => {
    expect(createdLine("F")).toBe(
      "“F” is ready. Anyone with the link or the QR code can join."
    );
    expect(joinedHeading(1)).toBe("Your circle");
    expect(joinedHeading(2)).toBe("Your circles");
    expect(INVITE_FULL_NOTE).toBe(
      "You’re already in 3 circles. Leave one on the Circles page, then open this link again."
    );
  });
});

describe(portionValue, () => {
  it("round-trips a circle's portion", () => {
    expect(portionValue({ verse: null, verseEnd: null })).toBe("");
    expect(portionValue({ verse: 7, verseEnd: null })).toBe("7");
    expect(portionValue({ verse: 7, verseEnd: 7 })).toBe("7");
    expect(portionValue({ verse: 7, verseEnd: 12 })).toBe("7-12");
  });

  it("labels a passage", () => {
    expect(passageOptionLabel({ from: 7, theme: "The cave", to: 12 })).toBe(
      "Verses 7 to 12: The cave"
    );
    expect(passageOptionLabel({ from: 3, theme: "One", to: 3 })).toBe(
      "Verse 3: One"
    );
  });
});

describe(portionChoices, () => {
  it("offers the whole surah, then each passage", () => {
    expect(portionChoices(passages, "9-26")).toStrictEqual([
      { label: "The whole surah", value: "" },
      { label: "Verses 1 to 8: Praise", value: "1-8" },
      { label: "Verses 9 to 26: The cave", value: "9-26" },
      { label: "Verse 27: Two gardens", value: "27" },
    ]);
  });

  it("keeps a portion that isn't a passage as its own choice", () => {
    expect(portionChoices(passages, "10")[1]).toStrictEqual({
      label: "From verse 10",
      value: "10",
    });
    expect(portionChoices(passages, "3-5")[1]).toStrictEqual({
      label: "Verses 3 to 5",
      value: "3-5",
    });
    expect(portionChoiceLabel(passages, "")).toBe("The whole surah");
    expect(portionChoiceLabel(passages, "27")).toBe("Verse 27: Two gardens");
  });
});

describe(checkPortion, () => {
  it("reads the whole surah, a focus verse or a range", () => {
    expect(checkPortion(" ", 7)).toStrictEqual({
      ok: true,
      verse: null,
      verseEnd: null,
    });
    expect(checkPortion("7", 7)).toStrictEqual({
      ok: true,
      verse: 7,
      verseEnd: null,
    });
    expect(checkPortion("2-5", 7)).toStrictEqual({
      ok: true,
      verse: 2,
      verseEnd: 5,
    });
  });

  it("rejects a portion outside the surah", () => {
    for (const bad of ["0", "8", "1-8", "5-2", "2.5", "x"]) {
      expect(checkPortion(bad, 7)).toStrictEqual({
        message: "Choose this week’s verses again for this surah.",
        ok: false,
      });
    }
    expect(checkPortion("286", undefined).ok).toBeTruthy();
  });
});

describe(nextStep, () => {
  it("moves to the passage after this week's", () => {
    expect(
      nextStep(passages, { surah: 18, verse: 1, verseEnd: 8 })
    ).toStrictEqual({ atLast: false, next: passages[1] });
  });

  it("says so at the last passage, and offers nothing for the whole surah", () => {
    expect(
      nextStep(passages, { surah: 18, verse: 27, verseEnd: null })
    ).toStrictEqual({ atLast: true, next: null });
    expect(
      nextStep(passages, { surah: 18, verse: null, verseEnd: null })
    ).toStrictEqual({ atLast: false, next: null });
    expect(nextStep([], { surah: 18, verse: 5, verseEnd: null })).toStrictEqual(
      { atLast: false, next: null }
    );
  });
});

describe(readTogetherLine, () => {
  it("lists finished surahs, not the current one", () => {
    const history = [
      { endedAt: 2, startedAt: 1, surah: 1 },
      { endedAt: 4, startedAt: 3, surah: 18 },
      { endedAt: 6, startedAt: 5, surah: 103 },
      { endedAt: null, startedAt: 7, surah: 18 },
    ];
    expect(readTogetherLine(history, 18, surahs)).toBe(
      "Read together: Al-Fatihah, Al-'Asr"
    );
    expect(readTogetherLine(history.slice(1, 2), 18, surahs)).toBeNull();
    expect(readTogetherLine([], 18, surahs)).toBeNull();
  });
});

describe(fittingVerse, () => {
  it("drops a verse the surah doesn't have", () => {
    expect(fittingVerse(10, 3)).toBeNull();
    expect(fittingVerse(3, 3)).toBe(3);
    expect(fittingVerse(10, undefined)).toBe(10);
    expect(fittingVerse(null, 3)).toBeNull();
  });
});

describe(filterSurahs, () => {
  const list = [...surahs.values()];

  it("matches by name or exact number", () => {
    expect(filterSurahs(list, "kah").map((s) => s.number)).toStrictEqual([18]);
    expect(filterSurahs(list, "1").map((s) => s.number)).toStrictEqual([1]);
    expect(filterSurahs(list, " ")).toHaveLength(3);
  });
});

describe(resolveCircleLink, () => {
  it("joins a named circle and opens its focus verse", async () => {
    const d = deps();
    await expect(resolveCircleLink("abc234", d)).resolves.toStrictEqual({
      kind: "tadabbur",
      surah: 18,
      verse: 10,
    });
    expect(d.join).toHaveBeenCalledWith(circle);
    expect(d.leave).not.toHaveBeenCalled();
  });

  it("keeps old numeric links as surah links and leaves a named circle", async () => {
    const d = deps();
    await expect(resolveCircleLink("94", d)).resolves.toStrictEqual({
      kind: "tadabbur",
      surah: 94,
      verse: null,
    });
    expect(d.leave).toHaveBeenCalledOnce();
    expect(d.setSurah).toHaveBeenCalledWith(94);
    expect(d.fetch).not.toHaveBeenCalled();
  });

  it("goes home for a link that is neither", async () => {
    const d = deps();
    await expect(resolveCircleLink("nope!", d)).resolves.toStrictEqual({
      kind: "home",
    });
    await expect(resolveCircleLink("115", d)).resolves.toStrictEqual({
      kind: "home",
    });
  });

  it("doesn't join a fourth circle", async () => {
    const d = deps({ full: vi.fn(() => true) });
    await expect(resolveCircleLink("abc234", d)).resolves.toStrictEqual({
      kind: "full",
      message: INVITE_FULL_NOTE,
    });
    expect(d.full).toHaveBeenCalledWith("abc234");
    expect(d.join).not.toHaveBeenCalled();
  });

  it("reports a circle that can't be fetched", async () => {
    const d = deps({
      fetch: vi.fn(async () => ({
        error: circleError("not-found"),
        ok: false as const,
      })),
    });
    await expect(resolveCircleLink("abc234", d)).resolves.toStrictEqual({
      kind: "failed",
      message: "This circle isn't available any more.",
      retry: false,
    });
    expect(d.join).not.toHaveBeenCalled();
  });
});

describe("privacy copy", () => {
  it("keeps the agreed line", () => {
    expect(PRIVACY_LINE).toBe(
      "Your reflections stay private. Only the surah is shared."
    );
  });
});
