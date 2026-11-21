import type { SurahMeta, TadabburSession } from "@mindfulverse/core/types";
import { describe, expect, it } from "vitest";

import {
  BEGIN_LINE,
  chooseLead,
  continueTitle,
  namedAction,
  namedEyebrow,
  namedLine,
  weekLine,
  yourCircleLink,
  starterLabel,
  surahName,
  themePicks,
  whereYouAre,
} from "./leadModel";

const session = (id: string): TadabburSession => ({
  id,
  intro: "",
  journalPrompt: "",
  steps: [],
  theme: id,
  title: `Title ${id}`,
});

const all = ["a", "b", "c", "d"].map(session);

describe(continueTitle, () => {
  it("uses the surah name when known", () => {
    expect(continueTitle(103, new Map([[103, "Al-'Asr"]]))).toBe(
      "Continue Al-'Asr"
    );
  });

  it("falls back to the number", () => {
    expect(continueTitle(94, new Map())).toBe("Continue Surah 94");
  });
});

describe(themePicks, () => {
  it("takes the first three in data order", () => {
    expect(themePicks(all, {})).toStrictEqual([
      { id: "a", title: "Title a" },
      { id: "b", title: "Title b" },
      { id: "c", title: "Title c" },
    ]);
  });

  it("moves finished sessions behind unfinished ones", () => {
    const picks = themePicks(all, {
      a: { completedAt: 1, step: 3 },
      b: { step: 1 },
    });
    expect(picks.map((p) => p.id)).toStrictEqual(["b", "c", "d"]);
  });

  it("still shows finished sessions when nothing else is left", () => {
    const picks = themePicks(all.slice(0, 2), {
      a: { completedAt: 1, step: 3 },
    });
    expect(picks.map((p) => p.id)).toStrictEqual(["b", "a"]);
  });

  it("returns nothing for no sessions", () => {
    expect(themePicks([], {})).toStrictEqual([]);
  });
});

describe(chooseLead, () => {
  const deeper = { ayah: 4, surah: 2 };

  it("continues a surah in progress before the circle's surah", () => {
    expect(chooseLead(deeper, 94)).toStrictEqual({
      ayah: 4,
      kind: "continue",
      surah: 2,
    });
  });

  it("suggests the circle's surah before the starters", () => {
    expect(chooseLead(null, 94)).toStrictEqual({ kind: "circle", surah: 94 });
  });

  const joined = {
    name: "Friday friends",
    surah: 18,
    verse: 7,
    verseEnd: 12,
  };

  it("continues a surah in progress before the joined circle", () => {
    expect(chooseLead(deeper, 94, joined).kind).toBe("continue");
  });

  it("suggests the joined circle before an old numeric circle surah", () => {
    expect(chooseLead(null, 94, joined)).toStrictEqual({
      kind: "named",
      name: "Friday friends",
      surah: 18,
      verse: 7,
      verseEnd: 12,
    });
  });

  it("falls back to the numeric circle surah without a joined circle", () => {
    expect(chooseLead(null, 94, null)).toStrictEqual({
      kind: "circle",
      surah: 94,
    });
  });

  it("ignores a circle value that isn't a surah number", () => {
    for (const bad of [0, 115, 2.5, "x", null, undefined]) {
      expect(chooseLead(null, bad)).toStrictEqual({
        kind: "starters",
        surahs: [1, 103, 93, 94],
      });
    }
  });
});

describe("named circle copy", () => {
  it("names the circle and its focus", () => {
    expect(namedEyebrow("Friday friends")).toBe("Friday friends is reading");
    expect(weekLine(10, null)).toBe("This week: verse 10");
    expect(weekLine(7, 12)).toBe("This week: verses 7 to 12");
  });

  it("goes to the focus verse when there is one", () => {
    expect(namedAction("Al-Kahf", 10)).toBe("Go to verse 10");
    expect(namedAction("Al-Kahf", null)).toBe("Begin Al-Kahf");
  });
});

describe(starterLabel, () => {
  const surahs = new Map<number, SurahMeta>([
    [103, { ayahCount: 3, name: "Al-'Asr", number: 103 }],
    [999, { ayahCount: 1, name: "One", number: 999 }],
  ]);

  it("shows only the name", () => {
    expect(starterLabel(103, surahs)).toBe("Al-'Asr");
    expect(starterLabel(999, surahs)).toBe("One");
  });

  it("falls back to the number before the list loads", () => {
    expect(starterLabel(94, new Map())).toBe("Surah 94");
    expect(surahName(94, new Map())).toBe("Surah 94");
  });
});

describe("begin copy", () => {
  it("keeps the agreed line", () => {
    expect(BEGIN_LINE).toContain("with Ibn Kathir");
  });
});

describe(whereYouAre, () => {
  it("places the verse in the surah", () => {
    expect(whereYouAre(4, { ayahCount: 8 })).toBe("Verse 4 of 8");
  });

  it("says so when every verse is pondered", () => {
    expect(whereYouAre(8, { ayahCount: 8 })).toBe(
      "You’ve pondered all 8 verses."
    );
    expect(whereYouAre(9, { ayahCount: 8 })).toBe(
      "You’ve pondered all 8 verses."
    );
  });

  it("still reads well before the surah list has loaded", () => {
    expect(whereYouAre(4, undefined)).toBe("You’ve pondered up to verse 4.");
  });
});

describe(namedLine, () => {
  it("shows this week's verses or the intro, never both", () => {
    expect(namedLine(10)).toBe("This week: verse 10");
    expect(namedLine(7, 12)).toBe("This week: verses 7 to 12");
    expect(namedLine(null)).toBe(BEGIN_LINE);
  });
});

describe(yourCircleLink, () => {
  it("counts the circles", () => {
    expect(yourCircleLink(1)).toBe("Your circle");
    expect(yourCircleLink(3)).toBe("Your circles");
  });
});
